/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const chalk = require('chalk');
const YAML = require('js-yaml');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

async function readConceptFile(rootPath, fileName, { verbose = true } = {}) {
  if (Array.isArray(fileName)) {
    const concepts = await Promise.all(fileName.map(f => readConceptFile(rootPath, f, { verbose })));
    return _.assignWith({}, ...concepts, (objValue, srcValue, key) => {
      if (objValue && srcValue) {
        throw new Error(`duplicated concept ${key}`);
      }
    });
  }
  if (path.extname(fileName) === '.yml') {
    const file = path.resolve(rootPath, fileName);
    const data = await readFile(file, 'utf8');
    const concepts = YAML.load(data);
    if (verbose) {
      console.log(chalk`Reading Concepts: {cyan ${fileName}} (${Object.keys(concepts).length} items)`);
    }
    return concepts;
  } else {
    return {};
  }
}

async function readConcepts(rootPath, { verbose = true } = {}) {
  if (verbose) {
    console.log(chalk`Reading: {bgCyan.black ${rootPath}}`);
  }
  const files = await readdir(path.resolve(rootPath), 'utf8');
  const concepts = await readConceptFile(rootPath, files, { verbose });
  if (verbose) {
    console.log(chalk`Read: {bold ${Object.keys(concepts).length}} concepts`);
  }
  return concepts;
}

module.exports = readConcepts;
