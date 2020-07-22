import socketio from 'socket.io';
import http from 'http';
import express from 'express';
import CSGOGSI, { CSGORaw } from 'csgogsi';
import { app as Application } from 'electron';
import path from 'path';
import fetch from 'node-fetch';
import * as I from './../types/interfaces';
import request from 'request';
import { getHUDData } from './../server/api/huds';
import { getMatches, updateMatch } from './api/match';
import fs from 'fs';
import portscanner from 'portscanner';
import { loadConfig } from './api/config';

const radar = require("./../boltobserv/index.js");
const mirv = require("./server").default;

class DevHUDListener {
    port: number;
    status: boolean;
    interval: any;
    callback: (status: boolean) => void;
    constructor(port: number) {
        this.port = port;
        this.status = false;
        this.callback = () => { }
        this.interval = -1;
    }
    onChange(callback: (status: boolean) => void) {
        this.callback = callback;
    }
    checkPort = () => {
        portscanner.checkPortStatus(this.port, '127.0.0.1', (err, status) => {
            status = status === 'open';
            if (status !== this.status) {
                this.callback(status);
            }
            this.status = status;
        });
        /**/
    }
    start() {
        if (this.interval !== -1) return;
        const id = setInterval(this.checkPort, 3000);
        this.interval = id;
    }
    stop() {
        clearInterval(this.interval);
    }

}

class HUDStateManager {
    data: Map<string, any>
    devHUD: I.HUD | null;
    constructor() {
        this.data = new Map();
        this.devHUD = null;
    }
    async save(hud: string, data: object) {
        const hudPath = path.join(Application.getPath('home'), 'HUDs', hud);
        if(!fs.existsSync(hudPath)) return;
        fs.writeFileSync(path.join(hudPath, "config.hm"), JSON.stringify(data));
    }
    set(hud: string, section: string, data) {
        const form = this.get(hud);
        const newForm = { ...form, [section]: data };
        this.save(hud, newForm);
        this.data.set(hud, newForm);
    }
    get(hud: string, force = false) {
        const hudData = this.data.get(hud);
        const hudPath = path.join(Application.getPath('home'), 'HUDs', hud);
        const hudConfig = path.join(hudPath, "config.hm");

        if(hudData || !force || !fs.existsSync(hudPath) || !fs.existsSync(hudConfig)) return hudData;
        const rawData = fs.readFileSync(hudConfig, "utf8");
        try {
            const data = JSON.parse(rawData);
            return this.data.set(hud, data).get(hud);
        } catch {
            return undefined;
        }
    }
}

class SocketManager {
    io: SocketIO.Server | null;
    constructor(io?: SocketIO.Server) {
        this.io = io || null;
    }
    set(io: SocketIO.Server) {
        this.io = io;
    }
}

interface RuntimeConfig {
    last: CSGORaw | null,
    devSocket: socketio.Socket | null,
    currentHUD: string | null,
};

export const Sockets = new SocketManager();

export const HUDState = new HUDStateManager();

export const GSI = new CSGOGSI();

export default function (server: http.Server, app: express.Router) {
    async function getJSONArray<T>(url: string) {
        return new Promise<T[]>((resolve, rej) => {
            request.get(url, (err, res) => {
                try {
                    if (err) {
                        resolve(undefined);
                        return;
                    }
                    const panel: T[] = JSON.parse(res.body);
                    if (!panel) return resolve(undefined);
                    if (!Array.isArray(panel)) return resolve(undefined);
                    resolve(panel);
                } catch {
                    resolve(undefined);
                }
            });
        })
    };

    const runtimeConfig: RuntimeConfig = {
        last: null,
        devSocket: null,
        currentHUD: null
    }

    const io = socketio(server);

    Sockets.set(io);

    const portListener = new DevHUDListener(3500);

    portListener.onChange(status => {
        if (!status) {
            HUDState.devHUD = null;
            return io.emit('reloadHUDs');
        }
        if (HUDState.devHUD) return;
        request.get('http://localhost:3500/hud.json', async (err, res) => {
            if (err) return io.emit('reloadHUDs', false);
            try {
                const hud: I.HUD = JSON.parse(res.body);
                if (!hud) return;
                if (!hud || !hud.version || !hud.author) return;
                hud.keybinds = await getJSONArray('http://localhost:3500/keybinds.json');
                hud.panel = await getJSONArray('http://localhost:3500/panel.json');
                hud.isDev = true;
                hud.dir = (Math.random() * 1000 + 1).toString(36).replace(/[^a-z]+/g, '').substr(0, 15);
                const cfg = await loadConfig();
                hud.url = `http://localhost:3500/?port=${cfg.port}`;
                HUDState.devHUD = hud;
                if (runtimeConfig.devSocket) {
                    io.to(hud.dir).emit('hud_config', HUDState.get(hud.dir));
                }
                io.emit('reloadHUDs');
            } catch {
                io.emit('reloadHUDs');
            }
        });
    });

    portListener.start();

    const customRadarCSS: express.RequestHandler = async (req, res) => {
        const sendDefault = () => res.sendFile(path.join(__dirname, "../boltobserv", "css", `custom.css`));
        if (!req.query.hud || typeof req.query.hud !== "string") {
            return sendDefault();
        }
        const hud = await getHUDData(req.query.hud);

        if (!hud?.boltobserv?.css) return sendDefault();

        const dir = path.join(Application.getPath('home'), 'HUDs', req.query.hud);
        return res.sendFile(path.join(dir, "radar.css"));
    }

    app.get('/boltobserv/css/custom.css', customRadarCSS);

    app.get('/huds/:hud/custom.css', (req, res, next) =>{
        req.query.hud = req.params.hud;
        return customRadarCSS(req,res, next);
    })

    app.get('/boltobserv/maps/:mapName/meta.json5', async (req, res) => {
        const sendDefault = () => res.sendFile(path.join(__dirname, "../boltobserv", "maps", req.params.mapName, "meta.json5"));

        if (!req.params.mapName) {
            return res.sendStatus(404);
        }
        if (req.query.dev === "true") {
            try {
                const result = await fetch(`http://localhost:3500/maps/${req.params.mapName}/meta.json5`, {});
                return res.send(await result.text());
            } catch {
                return sendDefault();
            }
        }
        if (!req.query.hud || typeof req.query.hud !== "string") return sendDefault();

        const hud = await getHUDData(req.query.hud);
        if (!hud?.boltobserv?.maps) return sendDefault();

        const dir = path.join(Application.getPath('home'), 'HUDs', req.query.hud);
        const pathFile = path.join(dir, "maps", req.params.mapName, "meta.json5");
        if (!fs.existsSync(pathFile)) return sendDefault();
        return res.sendFile(pathFile);

    });

    app.get('/boltobserv/maps/:mapName/radar.png', async (req, res) => {
        const sendDefault = () => res.sendFile(path.join(__dirname, "../boltobserv", "maps", req.params.mapName, "radar.png"));

        if (!req.params.mapName) {
            return res.sendStatus(404);
        }
        if (!req.query.hud || typeof req.query.hud !== "string") return sendDefault();

        const hud = await getHUDData(req.query.hud);
        if (!hud?.boltobserv?.maps) return sendDefault();

        const dir = path.join(Application.getPath('home'), 'HUDs', req.query.hud);
        const pathFile = path.join(dir, "maps", req.params.mapName, "radar.png");
        if (!fs.existsSync(pathFile)) return sendDefault();
        return res.sendFile(pathFile);

    });

    radar.startRadar(app, io);

    app.post('/', (req, res) => {
        runtimeConfig.last = req.body;
        io.emit('update', req.body);
        GSI.digest(req.body);
        radar.digestRadar(req.body);
        res.sendStatus(200);
    });

    io.on('connection', socket => {
        socket.on('started', () => {
            if (runtimeConfig.last) {
                socket.emit("update", runtimeConfig.last);
            }
        })
        socket.emit('readyToRegister');
        socket.on('register', (name: string, isDev: boolean) => {
            if (!isDev) {
                socket.join(name);
                io.to(name).emit('hud_config', HUDState.get(name, true));
                return;
            }
            runtimeConfig.devSocket = socket;
            if (HUDState.devHUD) {
                socket.join(HUDState.devHUD.dir);
                io.to(HUDState.devHUD.dir).emit('hud_config', HUDState.get(HUDState.devHUD.dir));
            }

        });
        socket.on('hud_config', (data: { hud: string, section: string, config: any }) => {
            HUDState.set(data.hud, data.section, data.config);
            io.to(data.hud).emit('hud_config', HUDState.get(data.hud))
        });
        socket.on('hud_action', (data: { hud: string, action: any }) => {
            io.to(data.hud).emit(`hud_action`, data.action);
        })
        socket.on('get_config', (hud: string) => {
            socket.emit("hud_config", HUDState.get(hud, true));
        });

        socket.on("set_active_hlae", (hudUrl: string | null) => {
            if(runtimeConfig.currentHUD === hudUrl){
                runtimeConfig.currentHUD = null;
            } else {
                runtimeConfig.currentHUD = hudUrl;
            }
            io.emit('active_hlae', runtimeConfig.currentHUD);
        });

        socket.on("get_active_hlae", () => {
            io.emit('active_hlae', runtimeConfig.currentHUD);
        });
    });

    mirv(data => {
        io.emit("update_mirv", data);
    });

    GSI.on("roundEnd", async score => {
        if(score.loser && score.loser.logo){
            delete score.loser.logo;
        }
        if(score.winner && score.winner.logo){
            delete score.winner.logo;
        }
        const matches = await getMatches();
        const match = matches.filter(match => match.current)[0];
        if (!match) return;
        const { vetos } = match;
        const mapName = score.map.name.substring(score.map.name.lastIndexOf('/') + 1);
        vetos.map(veto => {
            if (veto.mapName !== mapName || !score.map.team_ct.id || !score.map.team_t.id || veto.mapEnd) {
                return veto;
            }
            if (!veto.score) {
                veto.score = {};
            }
            veto.score[score.map.team_ct.id] = score.map.team_ct.score;
            veto.score[score.map.team_t.id] = score.map.team_t.score;
            if (veto.reverseSide) {
                veto.score[score.map.team_t.id] = score.map.team_ct.score;
                veto.score[score.map.team_ct.id] = score.map.team_t.score;
            }
            return veto;
        });
        match.vetos = vetos;
        await updateMatch(matches);

        io.emit('match', true);

    });


    GSI.on("matchEnd", async score => {
        const matches = await getMatches();
        const match = matches.filter(match => match.current)[0];
        const mapName = score.map.name.substring(score.map.name.lastIndexOf('/') + 1);
        if (match) {
            const { vetos } = match;
            const isReversed = vetos.filter(veto => veto.mapName === mapName && veto.reverseSide)[0];
            vetos.map(veto => {
                if (veto.mapName !== mapName || !score.map.team_ct.id || !score.map.team_t.id) {
                    return veto;
                }
                veto.winner = score.map.team_ct.score > score.map.team_t.score ? score.map.team_ct.id : score.map.team_t.id;
                if (isReversed) {
                    veto.winner = score.map.team_ct.score > score.map.team_t.score ? score.map.team_t.id : score.map.team_ct.id;
                }
                if(veto.score && veto.score[veto.winner]){
                    veto.score[veto.winner]++;
                }
                veto.mapEnd = true;
                return veto;
            });
            if (match.left.id === score.winner.id) {
                if (isReversed) {
                    match.right.wins++;
                } else {
                    match.left.wins++;
                }
            } else if (match.right.id === score.winner.id) {
                if (isReversed) {
                    match.left.wins++;
                } else {
                    match.right.wins++;
                }
            }
            match.vetos = vetos;
            await updateMatch(matches);
            io.emit('match', true);
        }
    });

    return io;
}