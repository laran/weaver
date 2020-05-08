const path = require("path");
const Server = require('../lib/core/server');
const root = path.resolve(__dirname, '..');

const port = process.env.WEAVER_SERVER_PORT||3333;

new Server(root, port).serve();