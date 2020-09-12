/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const log = require('loglevel').getLogger('read-file');

const _ = require('lodash');
const chalk = require('chalk');
const YAML = require('js-yaml');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

function mergeConcepts(...concepts) {
  return _.assignWith({}, ...concepts, (objValue, srcValue, key) => {
    if (objValue && srcValue) {
      throw new Error(`duplicated concept ${key}`);
    }
  });
}

async function readConceptFile(rootPath, fileName) {
  if (Array.isArray(fileName)) {
    const concepts = await Promise.all(fileName.map((f) => readConceptFile(rootPath, f)));
    return mergeConcepts(...concepts);
  }
  if (path.extname(fileName) === '.yml') {
    const file = path.resolve(rootPath, fileName);
    const data = await readFile(file, 'utf8');
    const concepts = YAML.load(data);
    log.info(chalk`Reading Concepts: {cyan ${fileName}} (${Object.keys(concepts).length} items)`);
    return concepts;
  } else {
    return {};
  }
}

async function readConcepts(rootPath) {
  log.info(chalk`Reading: {bgCyan.black ${rootPath}}`);
  const files = await readdir(path.resolve(rootPath), 'utf8');
  const concepts = await readConceptFile(rootPath, files);
  log.info(chalk`Read: {bold ${Object.keys(concepts).length}} concepts`);
  return concepts;
}

module.exports = readConcepts;
