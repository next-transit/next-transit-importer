const fs = require('fs');
const parse = require('csv-parse');
const stringify = require('csv-stringify');
const transform = require('stream-transform');

const transforms = require('../../transforms');

const import_path = (importer, agencySlug, type, readPath, writeStream, model, columns) => {
  return new promise((resolve, reject) => {
    const customTransformer = transforms.get_transform(type, agencySlug);
    const dateStr = new Date().toFormat('YYYY-MM-DD HH24:MI:SS');

    const parser = parse({ columns:true, record_delimiter:'\n', trim:true });

    const transformer = transform((record, callback) => {
      record.created_at = record.updated_at = dateStr;
      record.agency_id = importer.options.agency.id;
      customTransformer(record);
      callback(null, record);
    });
    const columnsMap = columns.reduce((map, c) => ({ ...map, [c]: c }), {});

    const stringifier = stringify({
      columns: columnsMap,
      delimiter: '\t',
      eof: false
    });

    stringifier.on('finish', resolve);

    rs = fs
      .createReadStream(readPath)
      .pipe(parser)
      .pipe(transformer)
      .pipe(stringifier)
      .pipe(writeStream);
  });
};



var parser = require('csv-parse'),
    promise = require('promise'),
    // transforms = require('../../transforms'),
    batch_size = 100000;

function import_path_old(importer, agency_slug, type, read_path, write_stream, model, columns) {
  return new promise(function(resolve, reject) {
    var transform = transforms.get_transform(type, agency_slug),
        date_str = new Date().toFormat('YYYY-MM-DD HH24:MI:SS');

        console.log('csv')
    parser()
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
      .on('readable', () => {
        // if(idx && (idx % batch_size === 0)) {
        //   console.log('Processed ' + idx + ' so far ...');
        // }

      })
      .on('end', function() {
        console.log('end csv')
        resolve();
      })
      .on('error', function(err) {
        console.log('error csv')
        reject('Error reading source file', err);
      });
  });
}

module.exports = import_path;
