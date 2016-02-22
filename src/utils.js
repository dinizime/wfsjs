var tv4 = require('tv4');

//GeoJSON validation
var bboxSchema = require('../resources/jsonSchema/geoJsonLd/bbox.json');

var point = require('../resources/jsonSchema/geoJsonLd/point.json');
var multipoint = require('../resources/jsonSchema/geoJsonLd/multipoint.json');
var linestring = require('../resources/jsonSchema/geoJsonLd/linestring.json');
var multilinestring = require('../resources/jsonSchema/geoJsonLd/multilinestring.json');
var polygon = require('../resources/jsonSchema/geoJsonLd/polygon.json');
var multipolygon = require('../resources/jsonSchema/geoJsonLd/multipolygon.json');
var geometrycollection = require('../resources/jsonSchema/geoJsonLd/geometrycollection.json');

var geomSchema = require('../resources/jsonSchema/geoJsonLd/geometry.json');
var geojsonSchema = require('../resources/jsonSchema/geoJsonLd/geojsonLd.json');

tv4.addSchema('http://json-schema.org/geojsonld/bbox.json#', bboxSchema);

tv4.addSchema('http://json-schema.org/geojsonld/geometry/point.json#', point);
tv4.addSchema('http://json-schema.org/geojsonld/geometry/multipoint.json#', multipoint);
tv4.addSchema('http://json-schema.org/geojsonld/geometry/linestring.json#', linestring);
tv4.addSchema('http://json-schema.org/geojsonld/geometry/multilinestring.json#', multilinestring);
tv4.addSchema('http://json-schema.org/geojsonld/geometry/polygon.json#', polygon);
tv4.addSchema('http://json-schema.org/geojsonld/geometry/multipolygon.json#', multipolygon);
tv4.addSchema('http://json-schema.org/geojsonld/geometry/geometrycollection.json#', geometrycollection);

tv4.addSchema('http://json-schema.org/geojsonld/geometry.json#', geomSchema);
tv4.addSchema('http://json-schema.org/geojsonld/geojsonld.json#', geojsonSchema);

//format uri  
var validUrl = require('valid-url');
tv4.addFormat('uri', function (data, schema) {

  if (typeof data == 'string') {
    //modified to accept query strings
    var val = data.split('?');

    if (validUrl.isUri(val[0])) {
      //No errors
      return null;
    }
  }
  // return error message
  return 'value must be a URI';
});

module.exports.tv4 = tv4;