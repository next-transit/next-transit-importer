var csv = require('csv'),
    promise = require('promise'),
    transforms = require('../../transforms'),
    batch_size = 100000;

function import_path(importer, agency_slug, type, read_path, write_stream, model, columns) {
  return new promise(function(resolve, reject) {
    var transform = transforms.get_transform(type, agency_slug),
        date_str = new Date().toFormat('YYYY-MM-DD HH24:MI:SS');

    csv()
      .from(read_path, { columns:true, trim:true, rowDelimiter:'\n' })
      .to(write_stream, { delimiter:'\t', columns:columns })
      .transform(function(record, idx) {
        if(idx && (idx % batch_size === 0)) {
          console.log('Processed ' + idx + ' so far ...');
        }
        record.created_at = record.updated_at = date_str;
        record.agency_id = importer.options.agency.id;
        transform(record);
        return record;
      })
      .on('end', function() {
        resolve();
      })
      .on('error', function(err) {
        reject('Error reading source file', err);
      });
  });
}

module.exports = import_path;
