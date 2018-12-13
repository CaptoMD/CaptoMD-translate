/*
 * Copyright (c) 2018 CaptoMD
 */

const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('extract-translations');

const { getRows } = require('../speadsheet/spreadsheet');

module.exports = async function extractTranslations(document, languages) {
  const sheets = _(document.worksheets)
    .reject(({ title }) => ['Concepts', 'Concepts-Values'].includes(title))
    .sortBy('title')
    .values();

  const translations = {};
  for (const sheet of sheets) {
    const rows = await getRows(sheet);
    log.info(chalk`Extracting Translations for {bold.cyan ${sheet.title}} ({bold ${rows.length}} items)`);
    for (const row of rows) {
      for (const lang of languages) {
        switch (sheet.title) {
          case 'Application':
            _.set(translations, [lang, row.code], row[lang]);
            break;
          default:
            _.set(translations, [lang, sheet.title.toLowerCase(), row.code], row[lang]);
        }
      }
    }
  }

  return translations;
};
