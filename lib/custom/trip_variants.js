var promise = require('promise'),
    variant_names = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
    route_variant_lookup = {},
    trip_variant_lookup = {},
    models;

function get_variant_name(trip, stop_info) {
  return new promise(function(resolve, reject) {
    var direction_key = [trip.route_id, trip.direction_id].join('-'),
        trip_key = [trip.route_id, trip.direction_id, stop_info.min_sequence, stop_info.max_sequence].join('-'),
        index = 0,
        variant_name;

    if(!(trip_key in trip_variant_lookup)) {
      if(direction_key in route_variant_lookup) {
        trip_variant_lookup[trip_key] = route_variant_lookup[direction_key];
        route_variant_lookup[direction_key]++;
      } else {
        route_variant_lookup[direction_key] = 1;
        trip_variant_lookup[trip_key] = 0;
      }
      variant_name = variant_names[trip_variant_lookup[trip_key]] || '?';
    }

    resolve(variant_name);
  });
}

function get_stop_count(agency_id, trip) {
  return new promise(function(resolve, reject) {
    models.simplified_stops
      .select('count(*) as stop_count')
      .where('agency_id = ?', agency_id)
      .where('route_id = ?', trip.route_id)
      .where('direction_id = ?', trip.direction_id)
      .error(reject)
      .first(function(result) {
        resolve(parseInt(result.stop_count, 0) || 0);
      });
  });
}

function get_trip_variant(agency_id, trip) {
  return new promise(function(resolve, reject) {
    models.stop_times
      .select('MIN(stop_sequence) as min_sequence, MAX(stop_sequence) as max_sequence')
      .where('agency_id = ?', agency_id)
      .where('trip_id = ?', trip.trip_id)
      .group_by('trip_id')
      .error(reject)
      .first(function(stop_info) {
        if(stop_info) {
          get_variant_name(trip, stop_info).then(function (variant_name) {
            if(variant_name) {
              get_stop_count(agency_id, trip).then(function(stop_count) {
                var variant = {
                  route_id: trip.route_id,
                  direction_id: trip.direction_id,
                  trip_headsign: trip.trip_headsign,
                  variant_name: variant_name,
                  stop_count: stop_count,
                  first_stop_sequence: stop_info.min_sequence,
                  last_stop_sequence: stop_info.max_sequence
                };
                resolve(variant);
              }, reject);
            } else {
              resolve(null);
            }
          }, reject);
        } else {
          resolve(null);
        }
      });
  });
}

function generate_variants(_models, agency_id) {
  models = _models;
  return new promise(function(resolve, reject) {
    variant_count_lookup = {};
    models.trips.select(agency_id).all(function(results) {
      var promises = [];
      results.forEach(function(trip) {
        promises.push(get_trip_variant(agency_id, trip));
      });
      promise.all(promises).then(function(variants) {
        variants = variants.filter(function(variant) { return !!variant; });
        resolve(variants);
      }, function(err) {
        console.log('failed for some reason', err);
        reject(err);
      });
    }, reject);
  });
};

module.exports = exports = {
  generate_variants: generate_variants
};
