module.exports = function(config) {
  if(!config) {
    config = require('./util/config');
  }

  return require('next-transit-models')(config.database_url);
};
