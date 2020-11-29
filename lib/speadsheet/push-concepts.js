/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('push-concept');

const { getRows } = require('./spreadsheet');

function getConceptSheet({ type }) {
  switch (type.toLowerCase()) {
    case 'value':
    case 'value-set':
    case 'measure-unit':
      return 'Concepts-Values';
    default:
      return 'Concepts';
  }
}

async function updateConcepts(rows, concepts) {
  const updatedConcepts = [];

  for (const row of rows) {
    const conceptId = row.concept;
    const saveRow = util.promisify(row.save);

    const concept = concepts[conceptId];
    if (concept && concept.label && !row['label']) {
      const { label } = concept;
      if (_.isString(label)) {
        if (['none', 'implicit', 'placeholder'].includes(label.toLowerCase())) {
          row['label'] = 'None';
          updatedConcepts.push(conceptId);
          await saveRow();
        } else if (label.toLowerCase() === 'required') {
          row['label'] = 'Required';
          updatedConcepts.push(conceptId);
          await saveRow();
        } else {
          log.debug(`*** CONCEPT: ${conceptId}: label ${label}`);
        }
      } else {
        log.debug(`*** CONCEPT: ${conceptId}: label::::`, label);
      }
    }
  }
  if (updatedConcepts.length > 0) {
    console.log(chalk`Updated {cyan.bold ${updatedConcepts.length}} Label`);
  }
  return updatedConcepts;
}

module.exports = async function pushConcepts(concepts, conceptsSheet, conceptValuesSheet, dryRun = false) {
  const [conceptRows, valueRows] = await Promise.all([
    getRows(conceptsSheet, { offset: 3 }),
    getRows(conceptValuesSheet, { offset: 3 }),
  ]);

  const conceptsIds = Object.keys(concepts);
  const conceptRowsId = _(conceptRows).map('concept').reject(_.isNil).value();
  const valueRowsId = _(valueRows).map('concept').reject(_.isNil).value();

  const duplicateConcepts = _(conceptRowsId)
    .groupBy()
    .pickBy((x) => x.length > 1)
    .keys()
    .value();
  const duplicateValues = _(valueRowsId)
    .groupBy()
    .pickBy((x) => x.length > 1)
    .keys()
    .value();
  const intersection = _.intersection(conceptRowsId, valueRowsId);

  duplicateConcepts.forEach((c) => log.info(chalk`Concept {red ${c}} is more then once is {bold Concepts}`));
  duplicateValues.forEach((c) => log.info(chalk`Concept {red ${c}} is in more then once in {bold Concepts-Values}`));
  intersection.forEach((c) => log.info(chalk`Concept {red ${c}} is in {bold Concepts} and {bold Concepts-Values}`));

  //await updateConcepts(conceptRows, concepts);

  const sheets = { ['Concepts']: conceptsSheet, ['Concepts-Values']: conceptValuesSheet };
  const missingConcepts = _.difference(conceptsIds, conceptRowsId, valueRowsId);
  for (const id of missingConcepts) {
    const concept = concepts[id];
    const sheetName = getConceptSheet(concept);

    if (!dryRun) {
      log.info(chalk`Adding Concept: {green ${id}} to {green ${sheetName}}`);
      //const addRow = util.promisify(sheets[sheetName].addRow);
      await sheets[sheetName].addRow({ concept: id });
    } else {
      log.info(chalk`{yellow dry-run:} Adding Concept: {green ${id}} to {green ${sheetName}}`);
    }
  }

  return missingConcepts;
};
