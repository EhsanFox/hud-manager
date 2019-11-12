"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var express_1 = __importDefault(require("express"));
var sockets_1 = __importDefault(require("./sockets"));
var http_1 = __importDefault(require("http"));
var cors_1 = __importDefault(require("cors"));
var api_1 = __importDefault(require("./api"));
var path_1 = __importDefault(require("path"));
var config_1 = require("./api/config");
function init(port) {
    return __awaiter(this, void 0, void 0, function () {
        var config, app, server, io;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, config_1.loadConfig()];
                case 1:
                    config = _a.sent();
                    app = express_1["default"]();
                    server = http_1["default"].createServer(app);
                    app.use(express_1["default"].urlencoded({ extended: true }));
                    //app.use(express.json({limit:'10Mb'}));
                    app.use(express_1["default"].raw({ limit: '10Mb', type: 'application/json' }));
                    app.use(function (req, res, next) {
                        try {
                            if (req.body) {
                                var text = req.body.toString().replace(/"(player|owner)":([ ]*)([0-9]+)/gm, '"$1": "$3"').replace(/(player|owner):([ ]*)([0-9]+)/gm, '"$1": "$3"');
                                req.body = JSON.parse(text);
                            }
                            next();
                        }
                        catch (e) {
                            next();
                        }
                    });
                    app.use(cors_1["default"]({ origin: "*", credentials: true }));
                    io = sockets_1["default"](server, app);
                    api_1["default"](app, io);
                    app.use('/', express_1["default"].static(path_1["default"].join(__dirname, '../build')));
                    app.get('*', function (_req, res) {
                        res.sendFile(path_1["default"].join(__dirname, '../build/index.html'));
                    });
                    return [2 /*return*/, server.listen(config.port || 1337)];
            }
        });
    });
}
exports["default"] = init;