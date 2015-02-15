var fs = require('fs');
    columns = require('../../config/columns.json'),
    config = {},
    local = {};

if(fs.existsSync(__dirname + '/../../config/local.json')) {
  local = require('../../config/local.json');
}

config.columns = columns;
config.verbose = process.env.VERBOSE || local.verbose;
config.database_url = process.env.DATABASE_URL || local.database_url;

module.exports = config;
