/*
 * Copyright (c) 2018 CaptoMD
 */

const _ = require('lodash');
const chalk = require('chalk');

const { getRows } = require('../speadsheet/spreadsheet');

const LANG = ['fr', 'en'];

function translationValues(row, lang, concepts) {
  const fullName = row[`fullname-${lang}`];
  const longLabel = row[`long-label-${lang}`];
  const shortLabel = row[`short-label-${lang}`];
  const abbreviation = row[`abbreviation-${lang}`];

  if (!(fullName || longLabel || shortLabel || abbreviation)) {
    if (row.target) {
      console.info(
        chalk`Translation (${lang}) {green ${row.concept}} is using target translations {green ${row.target}}`
      );

      return {
        'full-name': fullName || `@:concept.${row.target}.full-name`,
        'long-label': longLabel || `@:concept.${row.target}.long-label`,
        'short-label': shortLabel || `@:concept.${row.target}.short-label`,
        abbreviation: abbreviation || `@:concept.${row.target}.abbreviation`
      };
    }

    const labelType = concepts[row.concept] && concepts[row.concept].label;
    if (labelType === 'implicit' || labelType === 'none') {
      console.debug(chalk`Translation (${lang}) {yellow ${row.concept}} does not require translations (${labelType})`);
      const conceptId = _.startCase(row.concept);
      return {
        'full-name': conceptId,
        'long-label': conceptId,
        'short-label': conceptId,
        abbreviation: conceptId
      };
    }

    console.warn(chalk`Translation (${lang}) {red ${row.concept}} has no translations`);
    return {};
  }

  const defaultName = `[${row.concept}]`;
  return {
    'full-name': fullName || longLabel || shortLabel || defaultName,
    'long-label': longLabel || shortLabel || fullName || defaultName,
    'short-label': shortLabel || abbreviation || longLabel || fullName || defaultName,
    abbreviation: abbreviation || shortLabel || longLabel || fullName || defaultName
  };
}

function conceptTranslationValues(row, lang, concepts, type) {
  const translations = translationValues(row, lang, concepts);

  function rowValue(label, ...fallback) {
    if (!label) {
      return undefined;
    }
    const value = row[`${label}-${lang}`];
    if (value) {
      return value;
    }
    if (row.target) {
      return `@:concept.${row.target}.${label}`;
    }
    return rowValue(...fallback);
  }

  if (!['value', 'block', 'column', 'root', 'aggregate'].includes(type)) {
    translations.placeholder = rowValue('placeholder', 'long-label', 'short-label');
  }
  if (['event', 'boolean'].includes(type)) {
    translations['value-true'] = rowValue('value-true') || '@:boolean.true';
    translations['value-false'] = rowValue('value-false') || '@:boolean.false';
  }

  return translations;
}

module.exports = async function extractTranslations(concepts, document, branchName) {
  const sheets = _.sortBy(document.worksheets, 'title');

  const translations = {};
  for (const sheet of sheets) {
    const offset = ['Concepts', 'Concepts-Values'].includes(sheet.title) ? 3 : 0;
    const rows = await getRows(sheet, { offset });

    rows.forEach(row => {
      LANG.forEach(lang => {
        switch (sheet.title) {
          case 'Concepts':
          case 'Concepts-Values':
            {
              const type = row[branchName];
              if (!type) {
                console.warn(chalk`Translation: {yellow ${row.concept}} is not present in catalog (row has no type)`);
              }
              const conceptTranslations = conceptTranslationValues(row, lang, concepts, type.toLowerCase());
              _.set(translations, [lang, 'concept', row.concept], conceptTranslations);
            }
            break;
          case 'Application':
            _.set(translations, [lang, row.code], row[lang]);
            break;
          default:
            _.set(translations, [lang, sheet.title.toLowerCase(), row.code], row[lang]);
        }
      });
    });
  }

  return translations;
};
