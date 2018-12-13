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

  const missingConcepts = _.difference(conceptsIds, conceptRowsId, valueRowsId);
  for (const id of missingConcepts) {
    const concept = concepts[id];
    const sheetName = getConceptSheet(concept);

    log.info(chalk`Adding Concept: {green ${id}} to {green ${sheetName}} `);
    const addRow = util.promisify(sheets[sheetName].addRow);
    await addRow({ concept: id, [branchName]: type });
  }

  return missingConcepts;
};
