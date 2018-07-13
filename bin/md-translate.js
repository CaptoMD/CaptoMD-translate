#!/usr/bin/env node

const { runTranslations } = require('../index');

runTranslations(require('minimist')(process.argv.slice(2)));
