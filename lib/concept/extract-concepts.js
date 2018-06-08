/*
 * Copyright (c) 2018 CaptoMD
 */

const chalk = require('chalk');
const _ = require('lodash');

const mergeConcepts = require('./merge-concepts');

function extractInlineConcepts(concept, id) {
  function extract(value) {
    if (_.isArray(value)) {
      const inlineConcepts = _.map(value, extract);
      return Object.assign({}, ...inlineConcepts);
    }
    if (_.isObject(value)) {
      const inlineConcepts = _.map(value, (v, key) => {
        console.log(chalk`Inline:  {green ${id}} -> {green ${key}} (${v.type})`);
        return extractInlineConcepts(v, key);
      });
      return Object.assign({}, value, ...inlineConcepts);
    }
    return undefined;
  }

  const { values, concepts, data, components } = concept;
  return Object.assign({}, extract(values), extract(concepts), extract(data), extract(components));
}

module.exports = function extractConcepts(concepts) {
  const conceptIds = Object.keys(concepts);
  const complexConceptIds = _.filter(conceptIds, id => _.includes(conceptIds, _.get(concepts, [id, 'type'])));

  const complexConceptChildren = _.map(complexConceptIds, rootId => {
    const { type: targetType, types = {} } = concepts[rootId];
    return _.reduce(
      concepts,
      (results, concept, id) => {
        function addMissingChild(childId) {
          if (concepts[childId]) {
            console.log(chalk`Aliases:   {yellow ${id}} -> {yellow ${childId}} (${concept.type}) already exists`);
          } else {
            console.log(chalk`Aliases:   {blue ${id}} -> {blue ${childId}} (${concept.type})`);
            _.set(results, childId, { type: concept.type, original: id });
          }
        }

        if (targetType === id) {
          console.log(chalk`Aliases: {magenta ${id}} -> {magenta ${rootId}} (${concept.type})`);
          _.set(concepts, rootId, { type: concept.type, original: id });
        } else if (types[id]) {
          addMissingChild(types[id]);
        } else if (id.startsWith(targetType)) {
          addMissingChild(id.replace(targetType, rootId));
        }
        return results;
      },
      {}
    );
  });

  const inlineValues = _.reduce(
    concepts,
    (results, concept, id) => Object.assign(results, extractInlineConcepts(concept, id)),
    {}
  );
  return mergeConcepts(concepts, inlineValues, ...complexConceptChildren);
};
