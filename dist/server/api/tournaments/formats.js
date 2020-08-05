"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var v4_1 = __importDefault(require("uuid/v4"));
var createMatchup = function () { return ({
    _id: v4_1["default"](),
    winner_to: null,
    loser_to: null,
    label: '',
    matchId: null,
    parents: []
}); };
exports.createSEBracket = function (teams) {
    if (!Number.isInteger(Math.log2(teams)))
        return [];
    var amountOfMatches = teams - 1;
    var phases = Math.log2(teams);
    var matchups = [];
    for (var i = 0; i < phases; i++) {
        var matchesInPhase = Math.pow(2, i);
        for (var j = 0; j < matchesInPhase; j++) {
            var match = createMatchup();
            var index = matchups.length;
            if (i === 0) {
                matchups.push(match);
                continue;
            }
            var parentIndex = Math.floor((index - 1) / 2);
            match.winner_to = matchups[parentIndex]._id;
            matchups.push(match);
        }
    }
    return matchups;
};
