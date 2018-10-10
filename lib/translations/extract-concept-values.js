/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');

const { getRows } = require('../speadsheet/spreadsheet');
const LANG = ['fr', 'en'];

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

function extractConceptI18n(row, concept) {
  const i18n = {};
  LANG.forEach(lang => {
    const name = row[`name-${lang}`] || concept;
    const label = row[`label-${lang}`] || name;
    const abbreviation = row[`abbreviation-${lang}`] || label;

    _.set(i18n, ['full-name', lang], name);
    _.set(i18n, ['short-label', lang], label);
    _.set(i18n, ['long-label', lang], label);
    _.set(i18n, ['abbreviation', lang], abbreviation);
  });
  return i18n;
}

async function extractRowValues(valueSetName, row) {
  if (!/^([A-Z0-9]\w*-)*[A-Z0-9]\w*$/.test(row.code)) {
    const { code: invalidConceptCode } = row;
    const fixedCode = fixRowCode(valueSetName, invalidConceptCode);
    row.code = fixedCode;

    console.info(
      chalk`changed {bold.red ${invalidConceptCode}} to {bold.red ${fixedCode}} for sheet {cyan ${valueSetName}}`
    );
    const saveRow = util.promisify(row.save);
    await saveRow();
  }
  const concept = `${valueSetName}-${row.code}`;
  return { [concept]: { i18n: extractConceptI18n(row, concept), type: 'value', parent: valueSetName } };
}

module.exports = async function extractConceptValues(concepts, document) {
  const sheets = _(document.worksheets)
    .filter(({ title }) => !_.startsWith(title, 'X-'))
    .sortBy('title')
    .value();

  const values = {};
  for (const sheet of sheets) {
    const valueSetName = sheet.title;
    const rows = await getRows(sheet, { offset: 0 });

    for (const row of rows) {
      try {
        Object.assign(values, await extractRowValues(valueSetName, row));
      } catch (e) {
        console.error(e.message);
      }
    }
  }

  return values;
};
