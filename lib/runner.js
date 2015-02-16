var promise = require('promise'),
    models = require('../lib/models')(),
    sequential = require('./sequential')(),
    timer = require('./timer'),
    importers = require('./importers');

function import_agency(config, options, agency) {
  return new promise(function(resolve, reject) {
    var gtfs_path = options.gtfs_base_path + agency.slug,
        stage_path = gtfs_path + '/stage',
        importer_options = { agency:agency, verbose:options.verbose, gtfs_path:gtfs_path, stage_path:stage_path },
        gtfs_importer = importers.gtfs(importer_options),
        custom_importer = importers.custom(importer_options),
        total_timer = timer();

    function add_type(import_type, file_name, custom_type, model_name, no_truncate) {
      return function(next, error) {
        if(options.type === 'all' || options.type === file_name) {
          if(custom_type) {
            // custom_importer[custom_type](file_name, config.columns[file_name], total_timer).then(next, error);
          } else {
            gtfs_importer.import_type({
              agency_slug: agency.slug,
              title: import_type,
              file_name: file_name,
              columns: config.columns[file_name],
              model: models[model_name || file_name],
              truncate: !no_truncate
            }).then(next, error);
          }
        } else {
          next();
        }
      };
    }

    sequential
      .add(add_type('Calendar', 'calendar', null, 'calendar_dates'))
      .add(add_type('Calendar Exceptions', 'calendar_dates', null, null, true))
      .add(add_type('Shapes', 'shapes'))
      .add(add_type('Stops', 'stops'))
      .add(add_type('Trips', 'trips'))
      .add(add_type('Stop Times', 'stop_times'))
      .add(add_type('Routes', 'routes'))
      .add(add_type('Route Shapes', 'simplified_shapes', 'import_route_shapes'))
      .add(add_type('Simplified Stops', 'simplified_stops', 'import_simplified_stops'))
      .add(add_type('Route Directions', 'directions', 'import_route_extras'))
      .add(add_type('Trip Variants', 'trip_variants', 'import_trip_variants'))
      .add(add_type('Stats', 'stats', 'generate_stats'))
      .then(function() {
        total_timer.interval('\nImport complete! Total time:', true, true, '!');
        resolve();
      }, function(err) {
        reject(err);
      });
  });
}

function run(config, options) {
  return new promise(function(resolve, reject) {
    models.agencies.select().where('slug = ?', [options.agency]).first(function(agency) {
      if(agency) {
        import_agency(config, options, agency).then(resolve, reject);
      } else {
        reject('Agency was not found.');
      }
    }); 
  });
}

module.exports = {
  start: run
};
