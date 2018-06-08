/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');

const GoogleSpreadsheet = require('google-spreadsheet');
const chalk = require('chalk');

async function openSpreadsheet(spreadsheetId, credentials) {
  const doc = new GoogleSpreadsheet(spreadsheetId);
  const useServiceAccountAuth = util.promisify(doc.useServiceAccountAuth);
  const getInfo = util.promisify(doc.getInfo);

  await useServiceAccountAuth(credentials);
  const info = await getInfo();

  const { title, author } = info;
  console.log(chalk`Load Document: {bgBlue.bold.black ${title}} {blue (${author.email})}`);

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
  console.log(chalk`Load Sheet: {bgGreen.black ${sheet.title}} (contains {green ${rows.length}} rows)`);
  return rows;
}

module.exports = { openSpreadsheet, getRows };
