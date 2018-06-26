/*
 * Copyright (c) 2016 CaptoMD
 */

const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');

const { getRows } = require('../speadsheet/spreadsheet');
const LANG = ['fr', 'en'];

async function fixRowCode(valueSetName, row) {
  const { code } = row;
  const saveRow = util.promisify(row.save);
  if (/^(\w+-)*\w+$/.test(code)) {
    const fixedCode = _.split(code, '-')
      .map(_.upperFirst)
      .join('-');
    console.info(chalk`changed {bold.red ${code}} to {bold.red ${fixedCode}} for sheet {cyan ${valueSetName}}`);
    row.code = fixedCode;
    await saveRow();
  } else if (/^(\w+\s+)*\w+$/.test(code)) {
    const fixedCode = _.split(code, /\s+/)
      .map(_.upperFirst)
      .join('-');
    console.info(chalk`changed {bold.red ${code}} to {bold.red ${fixedCode}} for sheet {cyan ${valueSetName}}`);
    row.code = fixedCode;
    await saveRow();
  } else {
    throw new Error(chalk`Invalid concept code {bold.red ${code}} for sheet {red ${valueSetName}}`);
  }
}

async function extractRowValues(valueSetName, row) {
  if (!/^([A-Z0-9]\w*-)*[A-Z0-9]\w*$/.test(row.code)) {
    await fixRowCode(valueSetName, row);
  }
  const { code } = row;
  const concept = `${valueSetName}-${code}`;
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
  return { [concept]: { i18n, type: 'value', parent: valueSetName } };
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
