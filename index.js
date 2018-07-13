/*
 * Copyright (c) 2016 CaptoMD
 */

const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');

const readConcepts = require('./lib/source/read-concepts');
const readRequests = require('./lib/source/read-requests');
const processConcept = require('./lib/concept/process-concepts');
const { openSpreadsheet } = require('./lib/speadsheet/spreadsheet');
const pushConcepts = require('./lib/speadsheet/push-concepts');
const extractTranslations = require('./lib/translations/extract-translations');
const extractConceptValues = require('./lib/translations/extract-concept-values');
const writeTranslations = require('./lib/translations/write-translations');
const writeValues = require('./lib/translations/write-values');

async function extractConcepts(conceptsRootPath, { verbose = true }) {
  const conceptData = await readConcepts(conceptsRootPath, { verbose });

  const concepts = _.transform(conceptData, (result, c, id) => {
    const extractedConcepts = processConcept(c, id, conceptData, { verbose });
    _.assignWith(result, extractedConcepts, (objValue, srcValue, key) => {
      if (objValue && srcValue) {
        throw new Error(`duplicated concept ${key}`);
      }
    });
  });
  if (verbose) {
    console.log(chalk`Extracted: {bold ${Object.keys(concepts).length}} concepts`);
  }
  return concepts;
}

async function runTranslations({
  translations: translationSpreadsheetId,
  values: valueSpreadsheetId,
  concepts: conceptsRootPath,
  target: targetPath,
  verbose
}) {
  if (!translationSpreadsheetId) {
    const concepts = await extractConcepts(conceptsRootPath, { verbose });
    if (verbose) {
      console.dir(concepts);
    }
    return concepts;
  } else {
    const cred = require(path.resolve('./.spreadsheet-creds.json'));

    const [concepts, translationDocument, valueDocument] = await Promise.all([
      extractConcepts(conceptsRootPath, { verbose }),
      openSpreadsheet(translationSpreadsheetId, cred, { verbose }),
      openSpreadsheet(valueSpreadsheetId, cred, { verbose })
    ]);

    const updatedConcepts = await pushConcepts(concepts, translationDocument);

    if (updatedConcepts.length > 0) {
      console.warn(chalk`{yellow Updated spreadsheet. Review changes}`);
    }

    const [translations, values] = await Promise.all([
      extractTranslations(concepts, translationDocument),
      extractConceptValues(concepts, valueDocument)
    ]);

    const valueRootPath = path.resolve(conceptsRootPath, 'values');
    await Promise.all([writeTranslations(targetPath, translations), writeValues(valueRootPath, values)]);
  }
}

module.exports = { runTranslations, extractConcepts, readConcepts, readRequests };
