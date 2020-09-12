#!/usr/bin/env node

const { runTranslations } = require('../index');

process.on('unhandledRejection', (err) => {
  throw err;
});

runTranslations(require('minimist')(process.argv.slice(2)));
