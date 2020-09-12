/*
 * Copyright (c) 2018 CaptoMD
 */

const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');
const log = require('loglevel');

const readConcepts = require('./lib/source/read-concepts');
const readRequests = require('./lib/source/read-requests');
const processConcepts = require('./lib/concept/process-concepts');
const { openSpreadsheet } = require('./lib/speadsheet/spreadsheet');
const pushConcepts = require('./lib/speadsheet/push-concepts');
const extractTranslations = require('./lib/extract/extract-translations');
const extractConceptValues = require('./lib/extract/extract-concept-values');
const extractConceptLabels = require('./lib/extract/extract-concept-labels');
const writeTranslations = require('./lib/source/write-translations');
const writeValues = require('./lib/source/write-values');
const writeConfig = require('./lib/source/write-config');

const LANG = ['fr', 'en'];

function getLevel(verbose) {
  return verbose ? log.levels.INFO : log.levels.WARN;
}

function defaultCredentials() {
  return require(path.resolve('./.spreadsheet-creds.json'));
}

async function open(spreadsheetId, credentials = defaultCredentials()) {
  return openSpreadsheet(spreadsheetId, credentials);
}

async function extractConcepts(conceptsRootPath, { verbose = true }) {
  log.getLogger('process-concepts').setLevel(getLevel(verbose));
  const conceptData = await readConcepts(conceptsRootPath, { verbose });
  const concepts = processConcepts(conceptData);
  if (verbose) {
    console.log(chalk`Extracted: {bold ${Object.keys(concepts).length}} concepts`);
  }
  return concepts;
}

async function processTranslationSpreadsheet(translationSpreadsheetId, concepts, targetPath, dryRun) {
  const doc = await open(translationSpreadsheetId);
  const { Concepts: conceptsSheet, ['Concepts-Values']: conceptValuesSheet, ...otherSheets } = doc.sheetsByTitle;
  await pushConcepts(concepts, conceptsSheet, conceptValuesSheet, dryRun);
  const translations = await extractTranslations(otherSheets, LANG);
  const conceptLabels = await extractConceptLabels(conceptsSheet, conceptValuesSheet, concepts, LANG);
  LANG.forEach((lang) => {
    _.set(translations, [lang, 'concept'], conceptLabels[lang]);
  });
  await writeTranslations(targetPath, translations);
  await writeConfig(targetPath, conceptLabels.config);
}

async function processValueSpreadsheet(valueSpreadsheetId, concepts, targetPath, verbose) {
  const doc = await open(valueSpreadsheetId);
  const conceptsValues = await extractConceptValues(doc, concepts, LANG, verbose);
  await writeValues(targetPath, conceptsValues);
}

async function runTranslations({
  translations: translationSpreadsheetId,
  values: valueSpreadsheetId,
  concepts: conceptsRootPath,
  target: targetPath,
  verbose = true,
  dryRun,
}) {
  log.setLevel(getLevel(verbose));
  log.getLogger('read-file').setLevel(getLevel(verbose));
  log.getLogger('write-file').setLevel(getLevel(verbose));
  log.getLogger('spreadsheet').setLevel(getLevel(verbose));
  log.getLogger('push-concept').setLevel(getLevel(verbose));
  log.getLogger('extract-values').setLevel(getLevel(verbose));
  log.getLogger('extract-translations').setLevel(getLevel(verbose));

  const concepts = await extractConcepts(conceptsRootPath, { verbose });

  if (translationSpreadsheetId) {
    await processTranslationSpreadsheet(translationSpreadsheetId, concepts, targetPath, dryRun);
  } else if (valueSpreadsheetId) {
    await processValueSpreadsheet(valueSpreadsheetId, concepts, path.resolve(conceptsRootPath, 'values'), verbose);
  } else {
    _.map(concepts, (value, id) => {
      console.log(id, value);
    });
  }
}

module.exports = { runTranslations, extractConcepts, readConcepts, readRequests };
