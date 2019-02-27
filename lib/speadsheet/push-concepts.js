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

module.exports = async function pushConcepts(concepts, document) {
  const sheets = {
    Concepts: document.findWorkSheet('Concepts'),
    'Concepts-Values': document.findWorkSheet('Concepts-Values')
  };
  const [conceptRows, valueRows] = await Promise.all([
    getRows(sheets['Concepts'], { offset: 4 }),
    getRows(sheets['Concepts-Values'], { offset: 4 })
  ]);

  const conceptsIds = Object.keys(concepts);
  const conceptRowsId = _.map(conceptRows, 'concept');
  const valueRowsId = _.map(valueRows, 'concept');

  const duplicateConcepts = _(conceptRowsId)
    .groupBy()
    .pickBy(x => x.length > 1)
    .keys()
    .value();
  const duplicateValues = _(valueRowsId)
    .groupBy()
    .pickBy(x => x.length > 1)
    .keys()
    .value();
  const intersection = _.intersection(conceptRowsId, valueRowsId);

  duplicateConcepts.forEach(c => log.info(chalk`Concept {red ${c}} is more then once is {bold Concepts}`));
  duplicateValues.forEach(c => log.info(chalk`Concept {red ${c}} is in more then once in {bold Concepts-Values}`));
  intersection.forEach(c => log.info(chalk`Concept {red ${c}} is in {bold Concepts} and {bold Concepts-Values}`));

  //await updateConcepts(conceptRows, concepts);

  const missingConcepts = _.difference(conceptsIds, conceptRowsId, valueRowsId);
  for (const id of missingConcepts) {
    const concept = concepts[id];
    const sheetName = getConceptSheet(concept);

    log.info(chalk`Adding Concept: {green ${id}} to {green ${sheetName}} `);
    const addRow = util.promisify(sheets[sheetName].addRow);
    await addRow({ concept: id });
  }

  return missingConcepts;
};
