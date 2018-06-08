/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const YAML = require('js-yaml');

const mergeConcepts = require('./merge-concepts');
const extractConcepts = require('./extract-concepts');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

async function readConceptFile(rootPath, fileName) {
  if (Array.isArray(fileName)) {
    const concepts = await Promise.all(fileName.map(f => readConceptFile(rootPath, f)));
    return mergeConcepts(concepts);
  }
  if (path.extname(fileName) === '.yml') {
    const file = path.resolve(rootPath, fileName);
    const data = await readFile(file, 'utf8');
    const concepts = YAML.load(data);
    console.log(chalk`Reading Concepts: {cyan ${fileName}} (${Object.keys(concepts).length} items)`);
    return concepts;
  } else {
    return {};
  }
}

async function readConcepts(rootPath) {
  console.log(chalk`Reading: {bgCyan.black ${rootPath}}`);
  const files = await readdir(path.resolve(rootPath), 'utf8');
  const concepts = extractConcepts(await readConceptFile(rootPath, files));
  console.log(chalk`Extracted {bold ${Object.keys(concepts).length}} Concepts`);
  return concepts;
}

module.exports = readConcepts;
