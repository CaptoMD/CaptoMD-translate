/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('extract-values');

const { getRows } = require('../speadsheet/spreadsheet');

function fixRowCode(valueSetName, code) {
  if (/^(\w+-)*\w+$/.test(code)) {
    return _.split(code, '-')
      .map(_.upperFirst)
      .join('-');
  }
  if (/^(\w+\s+)*\w+$/.test(code)) {
    return _.split(code, /\s+/)
      .map(_.upperFirst)
      .join('-');
  }
  throw new Error(chalk`Invalid concept code {bold.red ${code}} for sheet {red ${valueSetName}}`);
}

function extractConceptI18n(row, concept, languages) {
  const i18n = {};
  for (const lang of languages) {
    const name = row[`name-${lang}`] || concept;
    const label = row[`label-${lang}`] || name;
    const abbreviation = row[`abbreviation-${lang}`] || label;

    _.set(i18n, ['full-name', lang], name);
    _.set(i18n, ['short-label', lang], label);
    _.set(i18n, ['long-label', lang], label);
    _.set(i18n, ['abbreviation', lang], abbreviation);
  }
  return i18n;
}

async function extractRowValues(valueSetName, row, languages) {
  if (!/^([A-Z0-9]\w*-)*[A-Z0-9]\w*$/.test(row.code)) {
    const { code: invalidConceptCode } = row;
    const fixedCode = fixRowCode(valueSetName, invalidConceptCode);
    row.code = fixedCode;

    log.warn(
      chalk`Changed {bold.red ${invalidConceptCode}} to {bold.red ${fixedCode}} for sheet {cyan ${valueSetName}}`
    );
    const saveRow = util.promisify(row.save);
    await saveRow();
  }
  const conceptId = `${valueSetName}-${row.code}`;
  return { [conceptId]: { i18n: extractConceptI18n(row, conceptId, languages), type: 'value', parent: valueSetName } };
}

module.exports = async function extractConceptValues(document, concepts, languages) {
  const sheets = _(document.worksheets)
    .sortBy('title')
    .value();

  const values = {};
  for (const sheet of sheets) {
    const valueSetName = sheet.title;
    if (!concepts[valueSetName]) {
      log.info(chalk`Concept {yellow.bold ${valueSetName}} is not present is current catalog: not extracting values`);
      continue;
    }

    const rows = await getRows(sheet, { offset: 0 });
    log.info(chalk`Extracting Value Concepts for {bold.cyan ${valueSetName}} ({bold ${rows.length}} values)`);
    for (const row of rows) {
      Object.assign(values, await extractRowValues(valueSetName, row, languages));
    }
  }

  return values;
};
