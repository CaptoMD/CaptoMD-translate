/*
 * Copyright (c) 2018 CaptoMD
 */

const log = require('loglevel').getLogger('spreadsheet');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const chalk = require('chalk');

async function openSpreadsheet(spreadsheetId, credentials) {
  const doc = new GoogleSpreadsheet(spreadsheetId);
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();
  log.info(chalk`Open Google Spreadsheet: {bgBlue.bold.black ${doc.title}}`);
  return doc;
}

async function getRows(sheet, options) {
  const rows = await sheet.getRows(options);
  log.debug(chalk`Open Google Spreadsheet: {bgBlue.black ${sheet.title}} (contains {green ${rows.length}} rows)`);
  return rows;
}

module.exports = { openSpreadsheet, getRows };
