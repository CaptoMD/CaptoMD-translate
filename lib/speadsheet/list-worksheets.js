/*
 * Copyright (c) 2018 CaptoMD
 */

const { openSpreadsheet, getRows } = require('./spreadsheet');

module.exports = async function listWorkSheet(spreadsheetId, credentials) {
  const document = await openSpreadsheet(spreadsheetId, credentials);
  await Promise.all(document.worksheets.map(sheet => getRows(sheet)));
};
