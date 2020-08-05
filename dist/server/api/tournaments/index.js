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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var Formats = __importStar(require("./formats"));
var M = __importStar(require("./../match"));
var v4_1 = __importDefault(require("uuid/v4"));
var database_1 = __importDefault(require("./../../../init/database"));
var tournaments = database_1["default"].tournaments;
exports.getTournaments = function () { return new Promise(function (res, rej) {
    tournaments.find({}, function (err, docs) {
        if (err)
            return res([]);
        return res(docs);
    });
}); };
exports.createTournament = function (type, teams) {
    var tournament = {
        _id: '',
        name: '',
        logo: '',
        matchups: [],
        autoCreate: true
    };
    switch (type) {
        case "se":
            tournament.matchups = Formats.createSEBracket(teams);
            break;
        default:
            break;
    }
    return tournament;
};
exports.addTournament = function (tournament) { return new Promise(function (res, rej) {
    tournaments.insert(tournament, function (err, newTournament) {
        if (err)
            return res(null);
        return newTournament;
    });
}); };
exports.getTournament = function (tournamentId) { return new Promise(function (res, rej) {
    tournaments.findOne({ _id: tournamentId }, function (err, tournament) {
        if (err || !tournament)
            return res(null);
        return res(tournament);
    });
}); };
exports.bindMatch = function (matchId, matchupId, tournamentId) { return new Promise(function (res, rej) { return __awaiter(void 0, void 0, void 0, function () {
    var tournament, matchup;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, exports.getTournament(tournamentId)];
            case 1:
                tournament = _a.sent();
                if (!tournament)
                    return [2 /*return*/, res(null)];
                matchup = tournament.matchups.find(function (matchup) { return matchup._id === matchupId; });
                if (!matchup)
                    return [2 /*return*/, res(null)];
                matchup.matchId = matchId;
                return [4 /*yield*/, exports.updateTournament(tournament)];
            case 2: return [2 /*return*/, _a.sent()];
        }
    });
}); }); };
exports.updateTournament = function (tournament) { return new Promise(function (res, rej) {
    tournaments.update({ _id: tournament._id }, tournament, {}, function (err, up) {
        if (err)
            return res(null);
        return res(tournament);
    });
}); };
exports.createNextMatch = function (matchId) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (res, rej) {
                var maxWins = function (type) {
                    switch (type) {
                        case "bo1":
                            return 1;
                        case "bo3":
                            return 2;
                        case "bo5":
                            return 3;
                        default:
                            return 2;
                    }
                };
                tournaments.findOne({ $where: function () { return !!this.matchups.find(function (matchup) { return matchup.matchId === matchId; }); } }, function (err, tournament) { return __awaiter(void 0, void 0, void 0, function () {
                    var matchup, nextMatchup, match, winsRequired, winnerId, newMatch, i, resp, nextMatch;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (err || !tournament)
                                    return [2 /*return*/, res(null)];
                                matchup = tournament.matchups.find(function (matchup) { return matchup.matchId === matchId; });
                                if (!matchup || !matchup.winner_to)
                                    return [2 /*return*/, res(null)];
                                nextMatchup = tournament.matchups.find(function (next) { return next._id === matchup.winner_to; });
                                if (!nextMatchup)
                                    return [2 /*return*/, res(null)];
                                return [4 /*yield*/, M.getMatchById(matchId)];
                            case 1:
                                match = _a.sent();
                                if (!match)
                                    return [2 /*return*/, res(null)];
                                winsRequired = maxWins(match.matchType);
                                if (match.left.wins !== winsRequired && match.right.wins !== winsRequired)
                                    return [2 /*return*/, res(null)];
                                winnerId = match.left.wins > match.right.wins ? match.left.id : match.right.id;
                                if (!!nextMatchup.matchId) return [3 /*break*/, 4];
                                newMatch = {
                                    id: v4_1["default"](),
                                    current: false,
                                    left: { id: winnerId, wins: 0 },
                                    right: { id: null, wins: 0 },
                                    matchType: 'bo1',
                                    vetos: []
                                };
                                for (i = 0; i < 7; i++) {
                                    newMatch.vetos.push({ teamId: '', mapName: '', side: 'NO', type: 'pick', mapEnd: false, reverseSide: false });
                                }
                                return [4 /*yield*/, M.addMatch(newMatch)];
                            case 2:
                                resp = _a.sent();
                                if (!resp)
                                    return [2 /*return*/, res(null)];
                                nextMatchup.matchId = newMatch.id;
                                return [4 /*yield*/, exports.updateTournament(tournament)];
                            case 3:
                                _a.sent();
                                _a.label = 4;
                            case 4: return [4 /*yield*/, M.getMatchById(nextMatchup.matchId)];
                            case 5:
                                nextMatch = _a.sent();
                                if (!nextMatch)
                                    return [2 /*return*/, res(null)];
                                if (nextMatch.left.id === winnerId || nextMatch.right.id === winnerId)
                                    return [2 /*return*/, res(nextMatch)];
                                if (!nextMatch.left.id) {
                                    nextMatch.left.id = winnerId;
                                }
                                else if (!nextMatch.right.id) {
                                    nextMatch.right.id = winnerId;
                                }
                                else {
                                    return [2 /*return*/, res(null)];
                                }
                                return [4 /*yield*/, M.updateMatch(nextMatch)];
                            case 6:
                                _a.sent();
                                return [2 /*return*/, res(nextMatch)];
                        }
                    });
                }); });
            })];
    });
}); };
exports.deleteTournament = function (tournamentId) { return new Promise(function (res, rej) {
    tournaments.remove({ _id: tournamentId }, function (err, n) {
        if (!err)
            return res(null);
        return res(true);
    });
}); };
