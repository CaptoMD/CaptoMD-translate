/*
 * Copyright (c) 2018 CaptoMD
 */

const _ = require('lodash');

function checkForDuplicatedConcepts([head, ...rest]) {
  if (!rest.length) {
    return;
  }
  _.forOwn(head, (value, key) => {
    _.forEach(rest, collection => {
      if (_.has(collection, key)) {
        console.error(`${chalk.bgRed('Error')}: ${chalk.red(key)} is duplicated`);
      }
    });
  });
  checkForDuplicatedConcepts(rest);
}

module.exports = function mergeConcepts(...conceptSets) {
  const concepts = _.flatten(conceptSets);
  checkForDuplicatedConcepts(concepts);
  return Object.assign({}, ...concepts);
};
