/*
 * Copyright (c) 2016 CaptoMD
 */

const path = require('path');
const chalk = require('chalk');

const readConcepts = require('./lib/concept/read-concepts');
const { openSpreadsheet } = require('./lib/speadsheet/spreadsheet');
const pushConcepts = require('./lib/speadsheet/push-concepts');
const extractTranslations = require('./lib/translations/extract-translations');
const extractConceptValues = require('./lib/translations/extract-concept-values');
const writeTranslations = require('./lib/translations/write-translations');
const writeValues = require('./lib/translations/write-values');

module.exports = async function loadTranslations({
  translations: translationSpreadsheetId,
  values: valueSpreadsheetId,
  concepts: conceptsRootPath,
  target: targetPath
}) {
  const cred = require(path.resolve('./.spreadsheet-creds.json'));

  const [concepts, translationDocument, valueDocument] = await Promise.all([
    readConcepts(conceptsRootPath),
    openSpreadsheet(translationSpreadsheetId, cred),
    openSpreadsheet(valueSpreadsheetId, cred)
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
};
