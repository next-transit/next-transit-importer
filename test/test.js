var assert = require('assert'),
    models = require('../lib/models')();

describe('next-transit-importer', function() {
  describe('connection', function() {
    it('should connect to database', function(done) {
      models.agencies.select(function(results) {
        assert.equal(results.length, 2);
        done();
      });
    });
  });
});
