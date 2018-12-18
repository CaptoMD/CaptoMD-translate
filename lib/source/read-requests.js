/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const log = require('loglevel').getLogger('read-file');

const chalk = require('chalk');
const YAML = require('js-yaml');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);

async function readRequestFile(rootPath, fileName) {
  if (Array.isArray(fileName)) {
    const requests = await Promise.all(fileName.map(f => readRequestFile(rootPath, f)));
    return Object.assign({}, ...requests);
  }
  if (path.extname(fileName) === '.yml') {
    const file = path.resolve(rootPath, fileName);
    const fileContent = await readFile(file, 'utf8');
    const data = YAML.load(fileContent);
    log.info(chalk`Reading Request: {cyan ${fileName}}`);
    if (!data.concept) {
      throw new Error(`could not find concept for ${fileName}`);
    }
    return { [data.concept]: data };
  } else {
    return {};
  }
}

async function readRequests(rootPath) {
  log.info(chalk`Reading: {bgCyan.black ${rootPath}}`);
  const files = await readdir(path.resolve(rootPath), 'utf8');
  const requests = await readRequestFile(rootPath, files);
  log.info(chalk`Extracted {bold ${Object.keys(requests).length}} Requests`);
  return requests;
}

module.exports = readRequests;
