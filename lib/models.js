module.exports = function(config) {
  if(!config) {
    config = require('./util/config');
  }

  return require('next-transit-data')(config.database_url);
};
