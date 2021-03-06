var promise = require('promise'),
    models;

function merge_arrays(arrays) {
  var merged = [];
  arrays.forEach(function(array) {
    merged = merged.concat(array);
  });
  return merged;
}

function stop_results_to_simplified_stops(agency_id, route_id, direction_id, stop_results) {
  var stops = [];
  stop_results.forEach(function(stop) {
    if(stop.stop_name) {
      stops.push({
        agency_id: agency_id,
        route_id: route_id,
        direction_id: direction_id,
        stop_id: stop.stop_id,
        stop_sequence: stop.stop_sequence,
        stop_name: stop.stop_name,
        stop_lat: stop.stop_lat,
        stop_lon: stop.stop_lon
      });
    }
  });
  return stops;
}

function get_stops_for_direction(agency_id, route_id, direction_id) {
  return new promise(function(resolve, reject) {
    models.trips.get_longest_trip(agency_id, route_id, direction_id).then(function(longest_trip) {
      if(longest_trip) {
        models.stop_times.select('s.*, st.stop_sequence')
          .join('stops s ON st.stop_id = s.stop_id')
          .where('s.agency_id = ?', agency_id)
          .where('st.trip_id = ?', longest_trip.trip_id)
          .orders('st.stop_sequence')
          .all(function(stop_results) {
            resolve(stop_results_to_simplified_stops(agency_id, route_id, direction_id, stop_results));
          }, reject);
      } else {
        resolve([]);
      }
    }, reject);
  });
}

function get_stops_for_route(agency_id, route) {
  return new promise(function(resolve, reject) {
    var promises = [];
    [0, 1].forEach(function(direction_id) {
      promises.push(get_stops_for_direction(agency_id, route.route_id, direction_id));
    });
    promise.all(promises).then(function(direction_stops) {
      // Merge down directions to single array for route
      var merged = merge_arrays(direction_stops);
      resolve(merged);
    }, reject);
  });
}

function generate_stops(_models, agency_id) {
  models = _models;
  return new promise(function(resolve, reject) {
    models.routes.select(agency_id)
      .orders('r.route_id')
      .error(reject)
      .all(function(routes) {
        var promises = [];
        // Get the simplified stops for each route
        routes.forEach(function(route) {
          promises.push(get_stops_for_route(agency_id, route));
        });
        promise.all(promises).then(function(route_stops) {
          // Merge down routes to single array of all stops
          var merged = merge_arrays(route_stops);
          resolve(merged);
        }, reject);
      });
  });
};

module.exports = exports = {
  generate_stops: generate_stops
};
