"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDoseDetailed = renderDoseDetailed;
exports.renderDoseMini = renderDoseMini;
exports.renderDrugInfoMini = renderDrugInfoMini;
exports.renderDrugInfoDetailed = renderDrugInfoDetailed;
function calculateExactDose(doseRange, weightKg) {
    var match = doseRange.match(/([\d.]+)\s*–\s*([\d.]+)/);
    if (!match) {
        // Try single value match if range not found
        var single = doseRange.match(/([\d.]+)/);
        if (!single)
            return null;
        var val = parseFloat(single[1]) * weightKg;
        return "".concat(val.toFixed(0), " mg");
    }
    var min = parseFloat(match[1]) * weightKg;
    var max = parseFloat(match[2]) * weightKg;
    return "".concat(min.toFixed(0), "\u2013").concat(max.toFixed(0), " mg");
}
function renderDoseDetailed(cards, weightKg) {
    return cards.map(function (card) {
        var doseLine = "";
        if (card.population === "pediatric" && card.doseRangeMgPerKg) {
            doseLine = "Dose: ".concat(card.doseRangeMgPerKg, " ").concat(card.doseBasis === "per_dose" ? "per dose" : "per day");
            if (weightKg) {
                var exact = calculateExactDose(card.doseRangeMgPerKg, weightKg);
                if (exact) {
                    doseLine += "\n\u2696\uFE0F Weight-based (".concat(weightKg, " kg): ").concat(exact);
                }
            }
        }
        else if (card.fixedDose) {
            doseLine = "Dose: ".concat(card.fixedDose);
        }
        return "\n\uD83D\uDC8A ".concat(card.drug, "\n").concat(card.indication ? "(".concat(card.indication, ")") : "", "\n").concat(doseLine, "\nFrequency: ").concat(card.frequency, "\n").concat(card.maxDose ? "Max: ".concat(card.maxDose) : "", "\n").concat(card.duration ? "Duration: ".concat(card.duration) : "", "\n").concat(card.renalAdjustment ? "\uD83D\uDD04 Renal: ".concat(card.renalAdjustment) : "", "\n").concat(card.hepaticAdjustment ? "\uD83D\uDD04 Hepatic: ".concat(card.hepaticAdjustment) : "", "\n").concat(card.notes ? "\u26A0\uFE0F Note: ".concat(card.notes) : "", "\n        ").trim();
    }).join('\n\n');
}
function renderDoseMini(cards, weightKg) {
    return cards.map(function (card) {
        var doseShort = "";
        if (card.population === "pediatric" && card.doseRangeMgPerKg) {
            doseShort = "".concat(card.doseRangeMgPerKg, "/").concat(card.doseBasis === "per_dose" ? "dose" : "day");
            if (weightKg) {
                var exact = calculateExactDose(card.doseRangeMgPerKg, weightKg);
                if (exact) {
                    doseShort += " (".concat(exact, ")");
                }
            }
        }
        else if (card.fixedDose) {
            doseShort = card.fixedDose;
        }
        return "\uD83D\uDC8A ".concat(card.drug, " \u2192 ").concat(doseShort, " ").concat(card.frequency, " ").concat(card.duration ? "\u00D7 ".concat(card.duration) : "");
    }).join('\n');
}
/**
 * Render Full Drug Info (Mini Mode)
 */
function renderDrugInfoMini(info, weightKg) {
    var dosingText = renderDoseMini(info.dosing, weightKg);
    return "\n\uD83D\uDC8A INDICATION:\n".concat(info.indications.map(function (i) { return "\u2022 ".concat(i); }).join('\n'), "\n\n\uD83D\uDC89 DOSE:\n").concat(dosingText, "\n\n\u26A0\uFE0F MONITOR/CONTRAINDICATIONS:\n").concat(info.contraindications.map(function (c) { return "\u2022 ".concat(c); }).join('\n'), "\n").concat(info.monitoring ? info.monitoring.map(function (m) { return "\u2022 ".concat(m); }).join('\n') : '', "\n    ").trim();
}
/**
 * Render Full Drug Info (Detailed Mode)
 */
function renderDrugInfoDetailed(info, weightKg) {
    var dosingText = renderDoseDetailed(info.dosing, weightKg);
    return "\n\uD83D\uDC8A MECHANISM OF ACTION:\n".concat(info.mechanismOfAction || 'Not specified', "\n\n\uD83D\uDCCB INDICATIONS:\n").concat(info.indications.map(function (i) { return "\u2022 ".concat(i); }).join('\n'), "\n\n\uD83D\uDC89 DOSING & ADMINISTRATION:\n").concat(dosingText, "\n\n\uD83D\uDEAB CONTRAINDICATIONS & PRECAUTIONS:\n").concat(info.contraindications.map(function (c) { return "\u2022 ".concat(c); }).join('\n'), "\n\n\u26A0\uFE0F ADVERSE EFFECTS:\n").concat(info.adverseEffects ? info.adverseEffects.map(function (e) { return "\u2022 ".concat(e); }).join('\n') : 'Not specified', "\n    ").trim();
}
