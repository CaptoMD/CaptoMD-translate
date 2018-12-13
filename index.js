/*
 * Copyright (c) 2018 CaptoMD
 */

const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');
const branch = require('git-branch');
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

async function extractConcepts(conceptsRootPath, { verbose = true }) {
  log.getLogger('process-concepts').setLevel(getLevel(verbose));
  const conceptData = await readConcepts(conceptsRootPath, { verbose });
  const concepts = processConcepts(conceptData);
  if (verbose) {
    console.log(chalk`Extracted: {bold ${Object.keys(concepts).length}} concepts`);
  }
  return concepts;
}

async function extractAllTranslations(translationDocument, concepts, languages = LANG) {
  const translations = await extractTranslations(translationDocument, languages);
  const conceptLabels = await extractConceptLabels(translationDocument, concepts, languages);
  LANG.forEach(lang => {
    _.set(translations, [lang, 'concept'], conceptLabels[lang]);
  });
  return { translations, config: conceptLabels.config };
}

async function runTranslations({
  translations: translationSpreadsheetId,
  values: valueSpreadsheetId,
  concepts: conceptsRootPath,
  target: targetPath,
  verbose = true,
  dryRun
}) {
  log.setLevel(getLevel(verbose));
  log.getLogger('read-file').setLevel(getLevel(verbose));
  log.getLogger('write-file').setLevel(getLevel(verbose));
  log.getLogger('spreadsheet').setLevel(getLevel(verbose));
  log.getLogger('push-concept').setLevel(getLevel(verbose));
  log.getLogger('extract-values').setLevel(getLevel(verbose));
  log.getLogger('extract-translations').setLevel(getLevel(verbose));
  if (!translationSpreadsheetId) {
    const concepts = await extractConcepts(conceptsRootPath, { verbose });
    if (verbose) {
      console.dir(concepts);
    }
    return concepts;
  } else {
    const cred = require(path.resolve('./.spreadsheet-creds.json'));

    const [concepts, translationDocument, valueDocument, branchName] = await Promise.all([
      extractConcepts(conceptsRootPath, { verbose }),
      openSpreadsheet(translationSpreadsheetId, cred),
      openSpreadsheet(valueSpreadsheetId, cred),
      branch('.')
    ]);

    if (!dryRun) {
      log.info(chalk`Updating Spreadsheets for branch {cyan.bold ${branchName}}`);
      await pushConcepts(concepts, translationDocument);
    } else {
      log.info(chalk`{yellow dry-run:} Spreadsheets are not updated`);
    }

    const [{ translations, config }, values] = await Promise.all([
      extractAllTranslations(translationDocument, concepts, LANG),
      extractConceptValues(valueDocument, concepts, LANG)
    ]);

    const valueRootPath = path.resolve(conceptsRootPath, 'values');
    await Promise.all([
      writeTranslations(targetPath, translations),
      writeValues(valueRootPath, values),
      writeConfig(targetPath, config)
    ]);
  }
}

module.exports = { runTranslations, extractConcepts, readConcepts, readRequests };
