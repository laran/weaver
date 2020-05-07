const path = require("path");
const Server = require('../lib/core/server');
const root = path.resolve(__dirname, '..');

new Server(root, 3333).serve();