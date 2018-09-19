/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');

const _ = require('lodash');
const chalk = require('chalk');
const branch = require('git-branch');

const { getRows } = require('./spreadsheet');

function conceptTarget({ path, original, 'value-set': valueSet }) {
  if (original) {
    return original;
  }
  if (valueSet) {
    return valueSet;
  }
  if (path) {
    return _.isArray(path) ? _.last(path) : path;
  }
  return '';
}

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

async function updateSheet(rows, concepts, sheetName, branchName) {
  console.log(chalk`Updating concepts of Sheet {cyan ${sheetName}} (containing ${rows.length} rows)`);

  const updatedConcepts = [];
  let conceptNotInCatalog = 0;
  let updatedRows = 0;

  for (const row of rows) {
    const conceptId = row.concept;
    const saveRow = util.promisify(row.save);

    const conceptData = concepts[conceptId];
    if (!conceptData) {
      if (row[branchName]) {
        updatedConcepts.push(conceptId);
        conceptNotInCatalog += 1;
        row[branchName] = null;
        row.target = null;
        await saveRow();
      }
    } else {
      const type = conceptData.type.toLowerCase();
      const target = conceptTarget(conceptData);
      if (row[branchName] !== type || row.target !== target) {
        updatedConcepts.push(conceptId);
        updatedRows += 1;
        row[branchName] = type;
        row.target = target;
        await saveRow();
      }
    }
  }
  console.log(chalk`Updated {cyan ${conceptNotInCatalog + updatedRows}} rows in {cyan ${sheetName}}`);
  return updatedConcepts;
}

module.exports = async function pushConcepts(concepts, document) {
  const [conceptRows, valueRows, branchName] = await Promise.all([
    getRows(document.findWorkSheet('Concepts'), { offset: 3 }),
    getRows(document.findWorkSheet('Concepts-Values'), { offset: 3 }),
    branch('.')
  ]);

  console.log(chalk`Updating concepts for branch {cyan ${branchName}}`);

  const conceptsIds = Object.keys(concepts);
  const conceptRowsId = _.map(conceptRows, 'concept');
  const valueRowsId = _.map(valueRows, 'concept');
  const intersection = _.intersection(conceptRowsId, valueRowsId);
  intersection.forEach(concept => console.error(chalk`Concept: {red ${concept}} is in more then one sheet`));

  const updatedConcepts = await updateSheet(conceptRows, concepts, 'Concepts', branchName);
  const updatedValues = await updateSheet(valueRows, concepts, 'Concepts-Values', branchName);

  const missingConcepts = _.difference(conceptsIds, conceptRowsId, valueRowsId);
  for (const id of missingConcepts) {
    const concept = concepts[id];
    const type = concept.type.toLowerCase();
    const target = conceptTarget(concept);
    const sheetName = getConceptSheet(concept);

    const info = `type: ${type}` + (target ? `, target: ${target}` : '');
    console.info(chalk`Adding Concept: {green ${id}} (${info}) to {green ${sheetName}} `);
    const addRow = util.promisify(document.findWorkSheet(sheetName).addRow);
    await addRow({ concept: id, [branchName]: type, target });
  }

  return [...updatedConcepts, ...updatedValues, ...missingConcepts];
};
