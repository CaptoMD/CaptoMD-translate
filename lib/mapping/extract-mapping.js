/*
 * Copyright (c) 2018 CaptoMD
 */

const pMap = require('p-map');
const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('extract-mapping');

const { getRows } = require('../speadsheet/spreadsheet');

const CODE_COLUMN = 'Code Mnémo Examen';

module.exports = async function extractMapping(sheets) {
  const { CaptoMD: controlSheet, ...otherSheets } = sheets;
  const concepts = _.reduce(
    await getRows(controlSheet),
    (acc, row) => ({ ...acc, [row['Concept']]: !row['isNew'] }),
    {}
  );
  log.info(chalk`Extracting mapping for {bold.cyan ${JSON.stringify(concepts)}}`);
  return extractMappingWithValidation(otherSheets, concepts);
};

async function extractMappingWithValidation(sheets, concepts) {
  async function extractMapping(sheet) {
    if (sheet.hidden) {
      return {};
    }
    const rows = await getRows(sheet);
    const mappings = _.reduce(
      rows,
      (mapping, row) => {
        if (!row.CaptoMD) {
          return mapping;
        }
        if (concepts[row.CaptoMD] === undefined) {
          log.warn(
            chalk`${sheet.title} - ${row.rowNumber} - Invalid concept {bold.red ${row.CaptoMD}} [${row['Desc Examen']}]`
          );
          return mapping;
        }
        if (!concepts[row.CaptoMD]) {
          return mapping;
        }
        return { ...mapping, [row[CODE_COLUMN]]: row.CaptoMD };
      },
      {}
    );
    log.info(chalk`Extracted ${_.size(mappings)} mappings from {bold.cyan ${sheet.title}} (${rows.length} rows)`);
    return mappings;
  }

  const translations = await pMap(Object.values(sheets), extractMapping);
  return _.merge(...translations);
}
