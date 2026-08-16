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

/** Find the tab that actually holds the catalog, whichever one is active. */
function catalogSheet_() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var head = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0]
      .map(function (h) { return String(h).trim(); });
    if (head.indexOf('id') !== -1 && head.indexOf('photos') !== -1) return sheets[i];
  }
  throw new Error('No tab has both an "id" and a "photos" column');
}

function syncFolders() {
  var sheet = catalogSheet_();
  Logger.log('using tab: ' + sheet.getName());

  var manifest = JSON.parse(UrlFetchApp.fetch(
    MANIFEST_URL + '?cb=' + Date.now(), { muteHttpExceptions: true }).getContentText());
  var folderCount = Object.keys(manifest).length;
  Logger.log('manifest folders: ' + folderCount);
  if (!folderCount) throw new Error('images.json came back empty — aborting');

  var values = sheet.getDataRange().getValues();
  var header = values[0].map(function (h) { return String(h).trim(); });
  var col = {};
  header.forEach(function (h, i) { col[h] = i; });

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
    var row = [];
    for (var i = 0; i < header.length; i++) row.push('');   // no .fill(), keeps legacy runtimes happy
    row[col.id] = folder;
    row[col.photos] = manifest[folder].join(',');
    if (col.status !== undefined) row[col.status] = 'available';
    sheet.appendRow(row);
    added++;
  });

  var msg = added + ' new item(s), ' + topped + ' row(s) got new photos'
    + ' — tab "' + sheet.getName() + '", now ' + sheet.getLastRow() + ' rows';
  Logger.log(msg);
  if (added) {
    Logger.log('NOTE: new rows are appended at the bottom with a blank buyer/status '
      + 'filter value — clear any active filter if you cannot see them.');
  }
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Venta sync'); } catch (e) {}
}
