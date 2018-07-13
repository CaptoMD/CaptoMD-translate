/*
 * Copyright (c) 2018 CaptoMD
 */

const chalk = require('chalk');
const _ = require('lodash');

const PROPERTIES_WITH_CHILD_CONCEPTS = ['values', 'concepts', 'data', 'enable-data', 'components'];

function resolveInlineConcept(value, parent, conceptRegistry, { verbose = true }) {
  if (_.isArray(value)) {
    const inlineConcepts = _.map(value, v => resolveInlineConcept(v, parent, conceptRegistry, { verbose }));
    return Object.assign({}, ...inlineConcepts);
  }
  if (_.isObject(value)) {
    const inlineConcepts = _.map(value, (v, key) => {
      if (verbose) {
        console.log(chalk`Inline:  {green ${parent}} -> {green ${key}} {gray (${v.type})}`);
      }
      return processConcept(v, key, conceptRegistry, { verbose });
    });
    return Object.assign({}, ...inlineConcepts);
  }
  return undefined;
}

function convertToReference(value) {
  if (_.isArray(value)) {
    return _.map(value, convertToReference);
  }
  if (_.isObject(value)) {
    return _.first(_.map(value, (v, key) => key));
  }
  return value;
}

function aliasInfo(id, value, targetType, message, level = 0) {
  const space = _.repeat(' ', level * 2);
  console.log(chalk`Aliases:${space} {yellow ${id}} -> {yellow ${value}} {gray (${targetType})} ${message}`);
}

function aliasPropInfo(id, prop, value, message, level = 0) {
  const space = _.repeat(' ', (level - 1) * 2);
  console.log(chalk`Aliases:${space} {magenta ${id}}.{magenta.italic ${prop}} -> {magenta ${value}} ${message}`);
}

function processComplexTypeConcept(conceptDefinition, id, conceptRegistry, { verbose = true }) {
  const targetType = conceptDefinition.type;
  const specifiedChildrenTarget = conceptDefinition.types || {};

  function cloneEnableCondition(enableCondition, parent, level) {
    return _.cloneDeepWith(enableCondition, value => {
      const conditionTarget =
        _.isString(value) &&
        (specifiedChildrenTarget[value] || (value.startsWith(targetType) && value.replace(targetType, id)));
      if (conditionTarget) {
        if (verbose) {
          aliasPropInfo(parent, `enable-condition.${value}`, conditionTarget, 'fixed condition names', level);
        }
        return conditionTarget;
      }
    });
  }

  function cloneTargetConcept(target, parent, level = 1) {
    return _.cloneDeepWith(target, (value, key) => {
      switch (true) {
        case _.isString(value) && _.has(specifiedChildrenTarget, value): {
          const childConceptName = specifiedChildrenTarget[value];
          const childConceptDefinition = conceptRegistry[childConceptName];
          if (!childConceptDefinition) {
            throw new Error(`Missing concept definition: ${value}`);
          }
          if (verbose) {
            aliasInfo(childConceptName, value, childConceptDefinition.type, 'specified type', level);
          }
          return specifiedChildrenTarget[value];
        }
        case key === 'value-set':
          if (verbose) {
            aliasPropInfo(parent, 'value-set', value, 'use original value-set', level);
          }
          return value;
        case key === 'enable-condition':
          if (verbose) {
            aliasPropInfo(parent, 'enable-condition', '...', 'fixed condition names', level);
          }
          return cloneEnableCondition(value, parent, level);
        case _.isString(value) && value.startsWith(targetType): {
          const childConceptName = value.replace(targetType, id);
          const childConceptDefinition = conceptRegistry[value];
          if (!childConceptDefinition) {
            throw new Error(`Missing concept definition: ${value}`);
          }
          if (verbose) {
            aliasInfo(childConceptName, value, childConceptDefinition.type, 'type alias', level);
          }
          const childConcept = cloneTargetConcept(childConceptDefinition, childConceptName, level + 1);
          childConcept.original = value;
          return { [childConceptName]: childConcept };
        }
        case _.isObject(value): {
          const keys = Object.keys(value);
          if (keys.length === 1) {
            const [objectUniqueKey] = keys;
            if (objectUniqueKey.startsWith(targetType)) {
              const childConceptName = objectUniqueKey.replace(targetType, id);
              const childConceptDefinition = value[objectUniqueKey];
              if (verbose) {
                aliasInfo(childConceptName, objectUniqueKey, childConceptDefinition.type, 'type alias (inline)', level);
              }
              const childConcept = cloneTargetConcept(childConceptDefinition, childConceptName, level + 1);
              childConcept.original = objectUniqueKey;
              return { [childConceptName]: childConcept };
            }
          }
        }
        // default:
        //   console.dir(key ? { [key]: value } : value);
      }
    });
  }

  const rootTargetDefinition = conceptRegistry[targetType];
  if (verbose) {
    aliasInfo(id, targetType, rootTargetDefinition.type, 'type alias');
  }
  const concept = cloneTargetConcept(rootTargetDefinition);
  concept.original = targetType;

  return processConcept(concept, id, conceptRegistry, { verbose });
}

function processConcept(conceptDefinition, id, conceptRegistry, { verbose = true } = {}) {
  const { type } = conceptDefinition;
  if (!type) {
    throw new Error(`Missing type info for ${id}`);
  }
  if (_.has(conceptRegistry, type)) {
    return processComplexTypeConcept(conceptDefinition, id, conceptRegistry, { verbose });
  }

  const childrenConcepts = PROPERTIES_WITH_CHILD_CONCEPTS.map(_.propertyOf(conceptDefinition));
  const inlineConcepts = resolveInlineConcept(childrenConcepts, id, conceptRegistry, { verbose });

  const concept = _.cloneDeepWith(conceptDefinition, (value, key) => {
    if (PROPERTIES_WITH_CHILD_CONCEPTS.includes(key)) {
      return convertToReference(value);
    }
  });

  return Object.assign({ [id]: concept }, inlineConcepts);
}

module.exports = processConcept;
