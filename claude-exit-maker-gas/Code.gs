"use strict";

var CLAUDE_EXIT_DB = Object.freeze({
  spreadsheetId: "1K2eeYit2VC8dsKNJsgvgGNao3Z4vt2mt-rTRduY2Jjc",
  sheetName: "退場理由台帳",
  timeZone: "Asia/Tokyo",
  maxRows: 5000
});

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Claudeくん退場理由メーカー")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}

function include_(name) {
  if (["Style", "Client"].indexOf(name) < 0) throw new Error("Unknown HTML fragment");
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function getDatabaseStats() {
  var records = readCandidateRecords_();
  return records.reduce(function (stats, record) {
    stats.total += 1;
    if (record.status === "UNUSED") stats.unused += 1;
    else if (record.status === "USED") stats.used += 1;
    else if (record.status === "REJECTED") stats.rejected += 1;
    else stats.unknown += 1;
    return stats;
  }, { total: 0, unused: 0, used: 0, rejected: 0, unknown: 0 });
}

function getUnusedCandidates() {
  return readCandidateRecords_().filter(function (record) {
    return record.status === "UNUSED";
  });
}

function findCandidateById(id) {
  var normalizedId = normalizeCandidateId_(id);
  var matches = readCandidateRecords_().filter(function (record) {
    return record.id === normalizedId;
  });
  if (matches.length > 1) throw new Error("台帳に同じIDが複数あります。更新せず台帳を確認してください。");
  return matches.length ? matches[0] : null;
}

function getAllCandidatesForBackup() {
  return {
    schema_version: 1,
    type: "claude_exit_ideas",
    exported_at: Utilities.formatDate(new Date(), CLAUDE_EXIT_DB.timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    items: readCandidateRecords_().map(function (record) {
      return { id: record.id, title: record.title, dialogue: record.dialogue, status: record.status };
    })
  };
}

function rejectCandidates(ids) {
  var requestedIds = Array.isArray(ids) ? ids : [];
  var results = [];
  var normalizedIds = [];
  var requested = Object.create(null);

  requestedIds.forEach(function (id) {
    var normalized;
    try {
      normalized = normalizeCandidateId_(id);
    } catch (error) {
      results.push({ id: String(id == null ? "" : id), updated: false, reason: "INVALID_ID" });
      return;
    }
    var key = normalized.toLowerCase();
    if (requested[key]) {
      results.push({ id: normalized, updated: false, reason: "DUPLICATE_REQUEST_ID" });
      return;
    }
    requested[key] = true;
    normalizedIds.push(normalized);
  });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getLedgerSheet_();
    var count = candidateRowCount_(sheet);
    var rows = count ? sheet.getRange(2, 1, count, 5).getValues() : [];
    normalizedIds.forEach(function (id) {
      var matches = [];
      rows.forEach(function (row, index) {
        if (String(row[0] == null ? "" : row[0]).trim() === id) matches.push({ row: index + 2, values: row });
      });
      if (!matches.length) {
        results.push({ id: id, updated: false, reason: "NOT_FOUND" });
        return;
      }
      if (matches.length > 1) {
        results.push({ id: id, updated: false, reason: "DUPLICATE_ID" });
        return;
      }
      var currentStatus = String(matches[0].values[3] == null ? "" : matches[0].values[3]).trim().toUpperCase();
      if (currentStatus !== "UNUSED") {
        results.push({ id: id, updated: false, reason: currentStatus === "USED" ? "ALREADY_USED" : currentStatus === "REJECTED" ? "ALREADY_REJECTED" : "INVALID_STATUS" });
        return;
      }
      sheet.getRange(matches[0].row, 4).setValue("REJECTED");
      results.push({ id: id, updated: true, reason: "UPDATED" });
    });
    if (results.some(function (result) { return result.updated; })) SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  return {
    updatedCount: results.filter(function (result) { return result.updated; }).length,
    failedCount: results.filter(function (result) { return !result.updated; }).length,
    results: results
  };
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
      if (String(row[0] == null ? "" : row[0]).trim() === normalizedId) matches.push({ row: index + 2, values: row });
    });
    if (!matches.length) return { updated: false, reason: "NOT_FOUND", id: normalizedId };
    if (matches.length > 1) return { updated: false, reason: "DUPLICATE_ID", id: normalizedId };
    var match = matches[0];
    var currentStatus = String(match.values[3] == null ? "" : match.values[3]).trim().toUpperCase();
    if (currentStatus === "USED") {
      return { updated: false, reason: "ALREADY_USED", id: normalizedId, usedAt: formatLedgerDate_(match.values[4]) };
    }
    if (currentStatus !== "UNUSED") {
      return { updated: false, reason: "INVALID_STATUS", id: normalizedId, status: currentStatus };
    }
    var now = new Date();
    sheet.getRange(match.row, 4, 1, 2).setValues([["USED", now]]);
    SpreadsheetApp.flush();
    return { updated: true, reason: "UPDATED", id: normalizedId, usedAt: formatLedgerDate_(now) };
  } finally {
    lock.releaseLock();
  }
}

function readCandidateRecords_() {
  var sheet = getLedgerSheet_();
  var count = candidateRowCount_(sheet);
  if (!count) return [];
  var values = sheet.getRange(2, 1, count, 5).getValues();
  var seen = Object.create(null);
  return values.reduce(function (records, row, index) {
    var id = String(row[0] == null ? "" : row[0]).trim();
    if (!id) return records;
    if (seen[id]) throw new Error("台帳に同じIDが複数あります: " + id);
    seen[id] = true;
    records.push({
      id: id,
      title: String(row[1] == null ? "" : row[1]).trim(),
      dialogue: String(row[2] == null ? "" : row[2]).trim(),
      status: String(row[3] == null ? "" : row[3]).trim().toUpperCase(),
      usedAt: formatLedgerDate_(row[4]),
      row: index + 2
    });
    return records;
  }, []);
}

function getLedgerSheet_() {
  var spreadsheet = SpreadsheetApp.openById(CLAUDE_EXIT_DB.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(CLAUDE_EXIT_DB.sheetName);
  if (!sheet) throw new Error("退場理由台帳シートが見つかりません。");
  if (sheet.getLastColumn() < 5) throw new Error("退場理由台帳の列数が不足しています。");
  return sheet;
}

function candidateRowCount_(sheet) {
  var count = Math.max(0, sheet.getLastRow() - 1);
  if (count > CLAUDE_EXIT_DB.maxRows) throw new Error("台帳件数が安全上限を超えています。");
  return count;
}

function normalizeCandidateId_(id) {
  var normalized = String(id == null ? "" : id).trim();
  if (!/^ce_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error("ce_付きUUID v4のIDを指定してください。");
  }
  return normalized;
}

function formatLedgerDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CLAUDE_EXIT_DB.timeZone, "yyyy-MM-dd HH:mm:ss");
  }
  return String(value);
}
