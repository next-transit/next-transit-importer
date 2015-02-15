var config = require('./lib/util/config'),
    runner = require('./lib'),
    options = {
      agency: null,
      type: 'all',
      verbose: !!config.verbose,
      gtfs_base_path: __dirname + '/data/gtfs/'
    };

process.argv.forEach(function(arg) {
  var parts = arg.split(':');
  if(parts[0] === 'agency') {
    options.agency = parts[1];
  } else if(parts[0] === 'type') {
    options.type = parts[1] || 'all';
  } else if(parts[0] === '-v') {
    options.verbose = true;
  }
});

if(!options.agency) {
  console.error('No Agency argument provided.');
  process.exit(1);
  return;
}

if(options.verbose) {
  config.verbose = options.verbose;
}

runner.start(config, options).then(function() {
  console.log('+++++++++DONE!!!!!!!!');
  process.exit(0);
}, function(msg, err) {
  if(typeof msg === 'object') {
    err = msg;
    msg = 'An error occurred';
  }
  if(msg) {
    console.error(msg, err || '');
  }
  process.exit(1);
});

