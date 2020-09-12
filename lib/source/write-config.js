/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const YAML = require('js-yaml');
const log = require('loglevel').getLogger('write-file');

const writeFile = util.promisify(fs.writeFile);
const target = 'concepts-config.yml';

module.exports = async function writeConfig(targetPath, values) {
  const resolvedPath = path.resolve(targetPath, target);
  log.info(chalk`Updating {cyan ${resolvedPath}}`);
  await writeFile(resolvedPath, YAML.safeDump(values), 'utf8');
};
