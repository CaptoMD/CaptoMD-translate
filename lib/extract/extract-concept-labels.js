/*
 * Copyright (c) 2018 CaptoMD
 */

const _ = require('lodash');
const chalk = require('chalk');
const log = require('loglevel').getLogger('extract-translations');

const { getRows } = require('../speadsheet/spreadsheet');

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

function rowTranslations(row, languages, ...labelNames) {
  const concept = row.concept;
  const translations = Object.defineProperty({}, 'concept', { value: concept, enumerable: false });

  function get(labelName, lang) {
    _.get(translations, [labelName, lang]);
  }

  for (const labelName of labelNames) {
    for (const lang of languages) {
      const value = row[`${labelName}-${lang}`];
      if (value) {
        _.set(translations, [labelName, lang], value);
      }
    }
    const { false: defined, true: notDefined } = _.groupBy(languages, lang =>
      _.isEmpty(_.get(translations, [labelName, lang]))
    );
    if (defined && notDefined) {
      log.info(
        chalk`Concept {red ${concept}} is missing {bold ${labelName}} for the following languages: {red ${notDefined}}`
      );
    }
    _.set(translations, [labelName, 'isDefined'], !notDefined);
  }
  return Object.assign(translations);
}

function conceptFallBack({ path, original, 'value-set': valueSet }) {
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

const FULL_NAME = 'full-name';
const LONG_LABEL = 'long-label';
const SHORT_LABEL = 'short-label';
const ABBREVIATION = 'abbreviation';
const VALUE_TRUE = 'value-true';
const VALUE_FALSE = 'value-false';

function processRow(row, concept, languages) {
  const translations = {};

  const conceptId = row.concept;
  const labels = rowTranslations(row, languages, FULL_NAME, LONG_LABEL, SHORT_LABEL, ABBREVIATION);
  const hasLabels = _.some(labels, label => label.isDefined);
  const hasAbbreviation = labels.abbreviation.isDefined;
  const hasFullName = labels[FULL_NAME].isDefined;

  const fallBack = conceptFallBack(concept);
  const isNone = row.label == 'None';

  const config = { hasLabels, hasAbbreviation, hasFullName };
  if (fallBack) {
    config.defaults = fallBack;
  }
  if (row.label) {
    config.specifiedLabel = row.label;
  }

  if (!hasLabels) {
    if (isNone) {
      log.info(chalk`Concept {yellow ${conceptId}} {gray (${concept.type})} has no labels but is marked {bold NONE}`);
    } else if (fallBack) {
      log.info(
        chalk`Concept {yellow ${conceptId}} {gray (${
          concept.type
        })} has no labels will use labels of {cyan ${fallBack}}`
      );
    } else {
      log.info(chalk`Concept {red ${conceptId}} {gray (${concept.type})} has no labels`);
    }
  }

  const defaultName = isNone ? '' : `[*${_.toUpper(conceptId)}*]`;

  function originalRef(labelName) {
    return fallBack && `@:concept.${fallBack}.${labelName}`;
  }

  function setLabel(lang, labelName, value) {
    const label = value || defaultName;
    if (label) {
      _.set(translations, [lang, conceptId, labelName], label);
    }
  }

  for (const lang of languages) {
    const fullName = labels[FULL_NAME][lang];
    const longLabel = labels[LONG_LABEL][lang] || labels[SHORT_LABEL][lang];
    const shortLabel = labels[SHORT_LABEL][lang] || labels[ABBREVIATION][lang] || labels[LONG_LABEL][lang];

    setLabel(lang, FULL_NAME, fullName || originalRef(FULL_NAME));
    setLabel(lang, LONG_LABEL, longLabel || originalRef(LONG_LABEL) || fullName);
    setLabel(lang, SHORT_LABEL, shortLabel || originalRef(SHORT_LABEL) || fullName);

    const abbreviation = labels[ABBREVIATION][lang] || originalRef(ABBREVIATION);
    if (abbreviation) {
      setLabel(lang, ABBREVIATION, abbreviation);
    }
  }

  if (['event', 'boolean'].includes(concept.type.toLowerCase())) {
    const booleanLabels = rowTranslations(row, languages, VALUE_TRUE, VALUE_FALSE);
    config.hasTrueLabel = booleanLabels[VALUE_TRUE].isDefined;
    config.hasFalseLabel = booleanLabels[VALUE_FALSE].isDefined;

    for (const lang of languages) {
      setLabel(lang, VALUE_TRUE, booleanLabels[VALUE_TRUE][lang]);
      setLabel(lang, VALUE_FALSE, booleanLabels[VALUE_FALSE][lang]);
    }
  }

  return { translations, config };
}

async function processWorksheet(sheet, concepts, languages) {
  const rows = await getRows(sheet, { offset: 4 });

  log.info(chalk`Extracting Labels for {bold.cyan ${sheet.title}} ({bold ${rows.length}} items)`);
  const translations = {};
  const config = {};
  for (const row of rows) {
    const concept = concepts[row.concept];
    if (!concept) {
      log.info(chalk`Concept {yellow ${row.concept}} is not present is current catalog: not extracting labels`);
      continue;
    }
    const { translations: conceptTranslations, config: conceptConfig } = processRow(row, concept, languages);
    _.merge(translations, conceptTranslations);
    Object.assign(config, { [row.concept]: conceptConfig });
  }

  return { translations, config };
}

module.exports = async function extractConceptLabels(document, concepts, languages) {
  const { translations: conceptsTranslations, config: conceptsConfig } = await processWorksheet(
    document.findWorkSheet('Concepts'),
    concepts,
    languages
  );
  const { translations: valuesTranslations, config: valuesConfig } = await processWorksheet(
    document.findWorkSheet('Concepts-Values'),
    concepts,
    languages
  );
  return _.merge({ config: Object.assign(conceptsConfig, valuesConfig) }, conceptsTranslations, valuesTranslations);
};
