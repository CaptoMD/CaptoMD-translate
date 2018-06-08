/*
 * Copyright (c) 2018 CaptoMD
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const _ = require('lodash');

const writeFile = util.promisify(fs.writeFile);

module.exports = async function writeTranslation(targetPath, translations) {
  await Promise.all(
    _.map(translations, async (value, lang) => {
      console.log(chalk`Updating {green ${targetPath}/${lang}.json}`);
      await writeFile(`${path.resolve(targetPath)}/${lang}.json`, JSON.stringify(value), 'utf8');
    })
  );
};
