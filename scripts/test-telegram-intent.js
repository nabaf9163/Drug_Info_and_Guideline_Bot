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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var llm_service_1 = require("../src/services/llm.service");
var llm_service_2 = require("../src/services/llm.service");
function testIntent() {
    return __awaiter(this, void 0, void 0, function () {
        var queries, _i, queries_1, q, intent, response, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('--- TESTING INTENT CLASSIFICATION ---');
                    queries = [
                        "Metronidazole",
                        "Azithromycin",
                        "Amoxicillin dose for child",
                        "Interaction between warfarin and aspirin"
                    ];
                    _i = 0, queries_1 = queries;
                    _a.label = 1;
                case 1:
                    if (!(_i < queries_1.length)) return [3 /*break*/, 8];
                    q = queries_1[_i];
                    console.log("\nQuery: \"".concat(q, "\""));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, (0, llm_service_1.classifyIntent)(q)];
                case 3:
                    intent = _a.sent();
                    console.log("Classified as: [".concat(intent, "]"));
                    if (!(intent === 'DRUG_INFO')) return [3 /*break*/, 5];
                    console.log('Generate Response Test (DRUG_INFO)...');
                    return [4 /*yield*/, (0, llm_service_2.generateResponse)({
                            sessionId: 'test-session',
                            userCountry: 'Ghana',
                            userMode: 'DETAILED',
                            intent: 'DRUG_INFO',
                            userMessage: q,
                            extractedEntities: {},
                            conversationHistory: []
                        })];
                case 4:
                    response = _a.sent();
                    console.log('Response Start:', response.text.substring(0, 100));
                    console.log('Is JSON?', response.text.trim().startsWith('{') || response.text.trim().startsWith('['));
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    e_1 = _a.sent();
                    console.error('Error:', e_1);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 1];
                case 8: return [2 /*return*/];
            }
        });
    });
}
testIntent();
