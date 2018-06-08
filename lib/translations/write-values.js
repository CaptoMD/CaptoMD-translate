/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const chalk = require('chalk');
const YAML = require('js-yaml');

const writeFile = util.promisify(fs.writeFile);
const target = 'concepts-values.yml';

module.exports = async function writeValues(targetPath, values) {
  console.log(chalk`Updating {green ${targetPath}/${target}}`);
  await writeFile(`${targetPath}/${target}`, YAML.safeDump(values), 'utf8');
};
