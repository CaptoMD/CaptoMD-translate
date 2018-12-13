/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const log = require('loglevel').getLogger('spreadsheet');

const GoogleSpreadsheet = require('google-spreadsheet');
const chalk = require('chalk');

async function openSpreadsheet(spreadsheetId, credentials) {
  const doc = new GoogleSpreadsheet(spreadsheetId);
  const useServiceAccountAuth = util.promisify(doc.useServiceAccountAuth);
  const getInfo = util.promisify(doc.getInfo);

  await useServiceAccountAuth(credentials);
  const info = await getInfo();

  const { title, author } = info;
  log.info(chalk`Open Google Spreadsheet: {bgBlue.bold.black ${title}} {blue (${author.email})}`);

  info.findWorkSheet = function findWorkSheet(sheetName) {
    const sheet = this.worksheets.find(sheet => sheet.title === sheetName);
    if (!sheet) {
      throw new Error(`Could not find workSheet ${sheetName}`);
    }
    return sheet;
  };

  return info;
}

async function getRows(sheet, options = { offset: 0 }) {
  const getRows = util.promisify(sheet.getRows);
  const rows = await getRows(options);
  log.debug(chalk`Open Google Spreadsheet: {bgBlue.black ${sheet.title}} (contains {green ${rows.length}} rows)`);
  return rows;
}

module.exports = { openSpreadsheet, getRows };
