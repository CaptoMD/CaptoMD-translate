/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');
const log = require('loglevel').getLogger('write-file');

const writeFile = util.promisify(fs.writeFile);

module.exports = function writeTranslation(targetPath, translations) {
  return Promise.all(
    _.map(translations, (value, lang) => {
      const resolvedPath = path.resolve(targetPath, `${lang}.json`);
      log.info(chalk`Updating {cyan ${resolvedPath}}`);
      return writeFile(resolvedPath, JSON.stringify(value), 'utf8');
    })
  );
};
