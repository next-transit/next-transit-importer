var fs = require('fs'),
    promise = require('promise'),
    trim = require('trim'),
    extend = require('extend'),
    timer = require('../../timer'),
    sequential = require('../../sequential'),
    parse_csv = require('./parse_csv');

function copy_to_database(importer, options) {
  return new promise(function(resolve, reject) {
    options = extend({ write_path:'', model:null, columns:[] }, options);

    var import_fn = options.truncate ? 'delete_import' : 'import',
        importParams = options.truncate 
          ? [importer.options.agency.id, options.write_path, options.columns] 
          : [options.write_path, options.columns];

    options.model[import_fn].apply(options.model, importParams)
      .error(reject)
      .commit(resolve);
  });
}

function add_path_sequence(importer, first, path, agency_slug, file_name, write_path, model, columns) {
  return function(next, error) {
    var flags = first ? 'w' : 'a',
        read_path = path + file_name + '.txt',
        write_stream = fs.createWriteStream(write_path, { flags:flags });

    if(!first) {
      write_stream.write('\n');
    }

    parse_csv(importer, agency_slug, file_name, read_path, write_stream, model, columns).then(function() {
      write_stream.end();
    }, error);

    write_stream.on('finish', next);
  };
}

function Importer(opts) {
  var self = this;
  
  self.options = opts,
  self.paths = (self.options.agency.import_paths || '/').split(',').map(function(str) { return trim(str) + '/'; });

  return self;
}

Importer.prototype.import_type = function(options) {
  var self = this;

  return new promise(function(resolve, reject) {
    import_options = extend({
      agency_slug: '',
      title: '',
      file_name: '',
      columns: '',
      model: null,
      truncate: true
    }, options);

    var total_timer = timer('\nImporting ' + import_options.title, true),
        read_timer = timer(),
        write_timer = timer(),
        extended_columns = import_options.columns.concat(['created_at', 'updated_at', 'agency_id']);

    total_timer.start();

    var sequencer = sequential(),
        read_path = '',
        write_path = self.options.gtfs_path + '/stage/' + import_options.file_name + '.txt',
        first = true;

    read_timer.start();

    // Handles cases when data is split across multiple files (e.g. Rail vs Bus)
    self.paths.forEach(function(path) {
      path = self.options.gtfs_path + trim(path);
      sequencer.add(add_path_sequence(self, first, path, import_options.agency_slug, import_options.file_name, write_path, import_options.model, extended_columns));
      first = false;
    });

    sequencer.then(function() {
      read_timer.stop();

      write_timer.start('Writing bulk file to database ...');
      copy_to_database(self, { write_path:write_path, model:import_options.model, columns:extended_columns, truncate:import_options.truncate }).then(function() {
        read_timer.total('Time spent reading source files');
        write_timer.interval('Time spent writing to database', true);
        total_timer.interval(import_options.title + ' Import Complete! Total time', true, true, '-');
        resolve();
      }, function(err) {
        reject(['Error copying data to database', err]);
      });
    });
  });
};

module.exports = function(options) {
  return new Importer(options);
};
