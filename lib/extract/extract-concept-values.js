/*
 * Copyright (c) 2018 CaptoMD
 */

const pMap = require('p-map');
const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('extract-values');

const { getRows } = require('../speadsheet/spreadsheet');

function fixRowCode(valueSetName, code) {
  if (/^(\w+-)*\w+$/.test(code)) {
    return _.split(_.trim(code), '-').map(_.upperFirst).join('-');
  }
  if (/^(\w+\s+)*\w+$/.test(code)) {
    return _.split(_.trim(code), /\s+/).map(_.upperFirst).join('-');
  }
  throw new Error(chalk`Invalid concept code {bold.red ${code}} for sheet {red ${valueSetName}}`);
}

function reportUsage(row, languages) {
  const isDefined = (type) => (lang) => {
    const value = row[`${type}-${lang}`];
    return value && _.trim(value) !== '';
  };

  const hasAllName = _.every(languages, isDefined('name'));
  const hasAllLabel = _.every(languages, isDefined('label'));
  const hasSomeLabel = _.some(languages, isDefined('label'));
  const hasAllAbbreviation = _.every(languages, isDefined('abbreviation'));
  const hasSomeAbbreviation = _.some(languages, isDefined('abbreviation'));
  const name = hasAllName ? '' : chalk`{red.bold name} `;
  const label = hasAllLabel ? chalk`{grey label} ` : hasSomeLabel ? chalk`{red label} ` : '';
  const abbr = hasAllAbbreviation ? chalk`{grey abbreviation} ` : hasSomeAbbreviation ? chalk`{red abbreviation}` : '';
  return `${name}${label}${abbr}`;
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
  if (_.isEmpty(_.trim(row.code))) {
    log.warn(chalk`  {red ${valueSetName}} row {bold.red ${row.rowNumber}} is missing code`);
    return {};
  }
  if (!/^([A-Z0-9]\w*-)*[A-Z0-9]\w*$/.test(row.code)) {
    const { code: invalidConceptCode } = row;
    const fixedCode = fixRowCode(valueSetName, invalidConceptCode);
    row.code = fixedCode;

    log.warn(
      chalk`  {red ${valueSetName}} row {bold.red ${row.rowNumber}} changing {bold.red ${invalidConceptCode}} to {bold.red ${fixedCode}}`
    );
    await row.save();
  }
  const conceptId = `${valueSetName}-${row.code}`;
  return { [conceptId]: { i18n: extractConceptI18n(row, conceptId, languages), type: 'value', parent: valueSetName } };
}

module.exports = async function extractConceptValues(document, concepts, languages, verbose = true) {
  const sheets = _.sortBy(Object.values(document.sheetsById), 'title');

  async function sheetValues(sheet) {
    const values = {};
    const valueSetName = sheet.title;
    if (!concepts[valueSetName]) {
      log.info(chalk`Concept {red.bold ${valueSetName}} is not present is current catalog: not extracting values`);
      return;
    }

    const rows = await getRows(sheet, { offset: 0 });
    log.info(chalk`Extracting Value Concepts for {bold.blue ${valueSetName}} ({bold ${rows.length}} values)`);
    for (const row of rows) {
      const value = await extractRowValues(valueSetName, row, languages);
      Object.assign(values, value);
      if (verbose) {
        _.map(value, (value, id) => {
          console.log(chalk`{green ${id}} ${reportUsage(row, languages)}`);
        });
      }
    }
    return values;
  }

  const values = await pMap(sheets, sheetValues);
  return Object.assign({}, ...values);
};
