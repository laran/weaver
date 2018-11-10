const path = require("path");
const Weaver = require('../lib/core/weaver');

new Weaver(path.resolve(__dirname, '..')).weave();