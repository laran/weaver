const path = require("path");
const Server = require('../lib/core/server');

new Server(path.resolve(__dirname, '..'), 3333).serve();