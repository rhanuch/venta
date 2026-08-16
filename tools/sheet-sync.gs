/**
 * Pulls photo folders from the published site into this Sheet.
 *
 * A folder under docs/images that no row references becomes a new row, with
 * `id` and `photos` filled in. New photos added to an existing item's folder
 * are appended to that row's `photos`, keeping whatever order is already there
 * so a chosen cover shot stays first.
 *
 * Install: Extensions -> Apps Script, paste this, Save. Run `syncFolders` once
 * and approve the permission prompt. Then Triggers -> Add trigger ->
 * syncFolders -> Time-driven -> every 15 minutes. A "Venta" menu also appears
 * in the Sheet for running it on demand.
 */
var MANIFEST_URL = 'https://rhanuch.github.io/venta/images.json';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Venta')
    .addItem('Sync photo folders', 'syncFolders')
    .addToUi();
}

function syncFolders() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var manifest = JSON.parse(UrlFetchApp.fetch(MANIFEST_URL).getContentText());

  var values = sheet.getDataRange().getValues();
  var header = values[0].map(function (h) { return String(h).trim(); });
  var col = {};
  header.forEach(function (h, i) { col[h] = i; });
  if (col.id === undefined || col.photos === undefined) {
    throw new Error('Sheet needs "id" and "photos" columns');
  }

  var ids = {}, claimed = {};
  for (var r = 1; r < values.length; r++) {
    var id = String(values[r][col.id]).trim();
    if (!id) continue;
    ids[id] = r;
    String(values[r][col.photos]).split(',').forEach(function (p) {
      p = p.trim(); if (p) claimed[p] = true;
    });
  }

  var added = 0, topped = 0;

  // top up existing rows with any new photos in their folder
  Object.keys(ids).forEach(function (id) {
    var files = manifest[id];
    if (!files) return;
    var row = ids[id];
    var listed = String(values[row][col.photos]).split(',')
      .map(function (p) { return p.trim(); }).filter(String);
    var fresh = files.filter(function (f) { return listed.indexOf(f) === -1; });
    if (!fresh.length) return;
    sheet.getRange(row + 1, col.photos + 1).setValue(listed.concat(fresh).join(','));
    topped++;
  });

  // a folder nothing points at becomes a new row
  Object.keys(manifest).sort().forEach(function (folder) {
    if (ids[folder]) return;
    var isClaimed = manifest[folder].some(function (f) { return claimed[f]; });
    if (isClaimed) return;               // e.g. plantas/ is shared by 7 rows
    var row = new Array(header.length).fill('');
    row[col.id] = folder;
    row[col.photos] = manifest[folder].join(',');
    if (col.status !== undefined) row[col.status] = 'available';
    sheet.appendRow(row);
    added++;
  });

  var msg = added + ' new item(s), ' + topped + ' row(s) got new photos';
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Venta sync'); } catch (e) {}
}
