#!/usr/bin/env node

const loadTranslations = require('../index');

loadTranslations(require('minimist')(process.argv.slice(2)));
