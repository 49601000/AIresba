"use strict";

var AIRESBA_DB = Object.freeze({
  spreadsheetId: "1K2eeYit2VC8dsKNJsgvgGNao3Z4vt2mt-rTRduY2Jjc",
  sheetName: "退場理由台帳",
  timeZone: "Asia/Tokyo",
  maxRows: 5000
});

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("AIレスバ演出エンジン v1.5")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

function include_(name) {
  if (["Style", "Client"].indexOf(name) < 0) throw new Error("Unknown HTML fragment");
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function getUnusedCandidates() {
  var sheet = getLedgerSheet_();
  var count = candidateRowCount_(sheet);
  if (!count) return [];
  var rows = sheet.getRange(2, 1, count, 5).getValues();
  var seen = Object.create(null);
  return rows.reduce(function (items, row) {
    var id = String(row[0] == null ? "" : row[0]).trim();
    if (!id) return items;
    if (seen[id]) throw new Error("台帳に同じIDが複数あります: " + id);
    seen[id] = true;
    var status = String(row[3] == null ? "" : row[3]).trim().toUpperCase();
    if (status === "UNUSED") {
      items.push({
        id: id,
        title: String(row[1] == null ? "" : row[1]).trim(),
        dialogue: String(row[2] == null ? "" : row[2]).trim()
      });
    }
    return items;
  }, []);
}

function markCandidateUsed(id) {
  var normalizedId = normalizeCandidateId_(id);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getLedgerSheet_();
    var count = candidateRowCount_(sheet);
    if (!count) return { updated: false, reason: "NOT_FOUND", id: normalizedId };
    var rows = sheet.getRange(2, 1, count, 5).getValues();
    var matches = [];
    rows.forEach(function (row, index) {
      if (String(row[0] == null ? "" : row[0]).trim() === normalizedId) {
        matches.push({ row: index + 2, values: row });
      }
    });
    if (!matches.length) return { updated: false, reason: "NOT_FOUND", id: normalizedId };
    if (matches.length > 1) return { updated: false, reason: "DUPLICATE_ID", id: normalizedId };
    var match = matches[0];
    var status = String(match.values[3] == null ? "" : match.values[3]).trim().toUpperCase();
    if (status === "USED") return { updated: false, reason: "ALREADY_USED", id: normalizedId };
    if (status !== "UNUSED") return { updated: false, reason: "INVALID_STATUS", id: normalizedId, status: status };
    sheet.getRange(match.row, 4, 1, 2).setValues([["USED", new Date()]]);
    SpreadsheetApp.flush();
    return { updated: true, reason: "UPDATED", id: normalizedId };
  } finally {
    lock.releaseLock();
  }
}

function getLedgerSheet_() {
  var sheet = SpreadsheetApp.openById(AIRESBA_DB.spreadsheetId).getSheetByName(AIRESBA_DB.sheetName);
  if (!sheet) throw new Error("退場理由台帳シートが見つかりません。");
  if (sheet.getLastColumn() < 5) throw new Error("退場理由台帳の列数が不足しています。");
  return sheet;
}

function candidateRowCount_(sheet) {
  var count = Math.max(0, sheet.getLastRow() - 1);
  if (count > AIRESBA_DB.maxRows) throw new Error("台帳件数が安全上限を超えています。");
  return count;
}

function normalizeCandidateId_(id) {
  var normalized = String(id == null ? "" : id).trim();
  if (!/^ce_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error("ce_付きUUID v4のIDを指定してください。");
  }
  return normalized;
}
