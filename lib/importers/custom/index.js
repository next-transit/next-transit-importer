var fs = require('fs'),
    csv = require('csv'),
    promise = require('promise'),
    date_utils = require('date-utils'),
    timer = require('../../timer'),
    custom_importers = require('../../custom'),
    transforms = require('../../transforms'),
    models,
    options;

const stringify = require('csv-stringify');
const transform = require('stream-transform');

function write_data(import_type, data, write_path, columns, custom_timer) {
  return new promise(function(resolve, reject) {
    var write_stream = fs.createWriteStream(write_path, { flags:'w' }),
      customTransformer = transforms.get_transform(import_type, options.agency.slug),
      dateStr = new Date().toFormat('YYYY-MM-DD HH24:MI:SS');

    const transformer = transform((record, callback) => {
      record.created_at = record.updated_at = dateStr;
      record.agency_id = options.agency.id;
      customTransformer(record);
      callback(null, record);
    });
    const columnsMap = columns.reduce((map, c) => ({ ...map, [c]: c }), {});

    const stringifier = stringify({
      columns: columnsMap,
      delimiter: '\t',
      eof: false
    });

    transformer.on('readable', function(){
      while(data = transformer.read()){
        stringifier.write(data);
      }
    });

    stringifier.on('readable', function(){
      while(data = stringifier.read()){
        write_stream.write(data);
      }
      write_stream.close();
    });
    // csv()
    //   .from(data)
    //   .to(write_stream, { delimiter:'\t', columns:columns })
    //   .transform(function(record, idx) {
    //     record.created_at = record.updated_at = date_str;
    //     record.agency_id = options.agency.id;
    //     transform(record);
    //     return record;
    //   })
    //   .on('end', function() {
    //     write_stream.end();
    //   })
    //   .on('error', reject);

    write_stream.on('finish', function() {
      custom_timer.interval('Time spent writing to database', true);
      resolve();
    });

    data.forEach(datum => transformer.write(datum));
  });
}

function import_custom(title, process, file_name, columns, total_timer) {
  return new promise(function(resolve, reject) {
    var custom_timer = timer('\n' + title, true),
      write_path = options.stage_path + '/' + file_name + '.txt',
      extended_columns = (columns || []).concat(['created_at', 'updated_at', 'agency_id']);

    process(file_name, extended_columns, write_path, custom_timer, total_timer).then(resolve, reject);
  });
}

/* SHAPES */
function import_route_shapes(file_name, columns, write_path, custom_timer) {
  return new promise(function(resolve, reject) {
    custom_importers.shapes.generate_route_shapes(models, options.agency.id, options.verbose).then(function(new_shapes) {
      custom_timer.interval('Time spent reading shapes from trips', true).start();
      write_data(file_name, new_shapes, write_path, columns, custom_timer).then(function() {
        models.simplified_shapes.delete_import(options.agency.id, write_path, columns).error(reject).commit(resolve);
      }, reject);
    }, reject);
  });
}

/* DIRECTIONS */
function import_route_directions(file_name, columns, write_path, custom_timer) {
  return new promise(function(resolve, reject) {
    custom_importers.directions.generate_directions(models, options.agency.id, options.verbose).then(function(new_directions) {
      custom_timer.interval('Time spent reading source file', true).start();
      write_data(file_name, new_directions, write_path, columns, custom_timer).then(function() {
        models.directions.delete_import(options.agency.id, write_path, columns).error(reject).commit(resolve);
      }, reject);
    }, reject);
  });
}

/* STOPS */ 
function import_simplified_stops(file_name, columns, write_path, custom_timer) {
  return new promise(function(resolve, reject) {
    custom_importers.stops.generate_stops(models, options.agency.id).then(function(new_simplified_stops) {
      custom_timer.interval('Time spent reading source file', true).start();
      write_data(file_name, new_simplified_stops, write_path, columns, custom_timer).then(function() {
        models.simplified_stops.delete_import(options.agency.id, write_path, columns).error(reject).commit(resolve);
      }, reject);
    }, reject);
  });
}

/* TRIP VARIANTS */ 
function import_trip_variants(file_name, columns, write_path, custom_timer) {
  return new promise(function(resolve, reject) {
    custom_importers.trip_variants.generate_variants(models, options.agency.id).then(function(new_trip_variants) {
      custom_timer.interval('Time spent reading source file', true).start();
      write_data(file_name, new_trip_variants, write_path, columns, custom_timer).then(function() {
        models.trip_variants.delete_import(options.agency.id, write_path, columns).error(reject).commit(resolve);
      }, reject);
    }, reject);
  });
}

function generate_stats(file_name, columns, write_path, custom_timer, total_timer) {
  return new promise(function(resolve, reject) {
    var model_names = ['shapes', 'stops', 'routes', 'directions', 'simplified_stops', 'trips', 'trip_variants', 'stop_times', 'simplified_shapes'],
        promises = [],
        get_model_count = function get_model_count(model_name) {
          return new promise(function(resolve, reject) {
            models[model_name].select(options.agency.id)
              .error(reject)
              .count(function(count) {
                if(count) {
                  resolve({ model_name:model_name, count:count });
                } else {
                  resolve({ model_name:model_name, count:0 });
                }
              });
          });
        };

    model_names.forEach(function(model_name) {
      promises.push(get_model_count(model_name));
    });

    promise.all(promises).then(function(model_counts) {
      var stats_data = {
        agency_id: options.agency.id,
        created_at: new Date().toFormat('YYYY-MM-DD HH24:MI:SS'), 
        process_seconds: Math.round(total_timer.get_seconds())
      };

      model_counts.forEach(function(model_count) {
        stats_data[model_count.model_name + '_count'] = model_count.count;
      });

      models.stats.insert(stats_data).error(reject).commit(resolve);
    }, reject);
  });
}

function custom_importer() {
  return {
    import_route_shapes: function(file_name, columns) {
      return import_custom('Generating Route Shapes', import_route_shapes, file_name, columns);
    },
    import_route_directions: function(file_name, columns) {
      return import_custom('Generating Route Directions', import_route_directions, file_name, columns);
    },
    import_simplified_stops: function(file_name, columns) {
      return import_custom('Generating Simplified Stops', import_simplified_stops, file_name, columns);
    },
    import_trip_variants: function(file_name, columns) {
      return import_custom('Generating Trip Variants', import_trip_variants, file_name, columns);
    },
    generate_stats: function(file_name, columns, total_timer) {
      return import_custom('Generating Import Stats', generate_stats, file_name, columns, total_timer);
    }
  };
}

module.exports = function(mdels, opts) {
  models = mdels;
  options = opts;
  return custom_importer();
};
