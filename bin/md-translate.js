#!/usr/bin/env node

const { run } = require('../index');

process.on('unhandledRejection', (err) => {
  throw err;
});

run(require('minimist')(process.argv.slice(2)));
