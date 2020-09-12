/*
 * Copyright (c) 2018 CaptoMD
 */

const pMap = require('p-map');
const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('extract-translations');

const { getRows } = require('../speadsheet/spreadsheet');

function path(lang, context, code) {
  switch (context) {
    case 'application':
      return [lang, code];
    default:
      return [lang, context, code];
  }
}

module.exports = async function extractTranslations(sheets, languages) {
  async function extractSheetTranslations(sheet) {
    const translations = {};
    const rows = await getRows(sheet);
    log.info(chalk`Extracting Translations for {bold.cyan ${sheet.title}} ({bold ${rows.length}} items)`);
    const context = sheet.title.toLowerCase();
    for (const row of rows) {
      for (const lang of languages) {
        _.set(translations, path(lang, context, row.code), row[lang]);
      }
    }
    return translations;
  }

  const translations = await pMap(Object.values(sheets), extractSheetTranslations);
  return _.merge(...translations);
};
