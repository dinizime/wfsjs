var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var cors = require('cors');

var geojsonParser = bodyParser.json({ type: 'application/*+json', limit: '50mb' });
var wfsOperations = require('../src/WFSOperations');
var utils = require('../src/utils');
var settings = require('../config.json');


var tv4 = utils.tv4;

var availableLayers = [];
var layerSchema = {};
for (var key in settings.layers) {
	availableLayers.push(key);
	var schema = require(settings.layers[key].schemaLocation);
	tv4.addSchema(settings.layers[key].schemaName, schema);
	layerSchema[key] = schema;
}

//opens JSON-LD values
var fs = require("fs");
require.extensions[".jsonld"] = function (m) {
 m.exports = JSON.parse(fs.readFileSync(m.filename, 'utf8'));
};

//CORS middleware
router.use(cors({
  exposedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Link, Location"
}));
// router.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });



//Middleware for verifying available layers
var layersVerify = function (req, res, next) {
	if (availableLayers.indexOf(req.params.layer) != -1) {
		next();
	} else {
		res.status(404).end();
	}
};

//Middleware for content type
var contentVerify = function (req, res, next) {
	console.log(req.get('Content-Type'));
	console.log(settings.layers[req.params.layer].contentType);
	
	if (req.get('Content-Type') === settings.layers[req.params.layer].contentType) {
		next();
	} else {
		res.status(415).send('Unsupported Media Type');
	}
};

//Middleware for schema validation
var contentValidation = function (req, res, next) {
	var schemaVal = tv4.validateResult(req.body, layerSchema[req.params.layer]);
	console.log(JSON.stringify(schemaVal));
	if (schemaVal.valid) {
		next();
	} else {
		res.status(422).send('Unprocessable Entity');
	}
};

//Middleware for content negotiation
var contentNegotiation = function (req, res, next) {
	var formats = settings.layers[req.params.layer].formats;
	//formats is an array of strings with the contents it accepts
	if (req.accepts(formats)) {
		next();
	} else {
		// respond with 406 - Not Acceptable
		res.status(406).send('Not Acceptable');
	}
};

//Middleware for setting Context and JSON-Schema headers
var describeHeaders = function (req, res, next) {
	var schema = settings.baseURL + "schema/"+ req.params.layer;
	var context = settings.baseURL + "context/"+ req.params.layer;
	var metadata = settings.baseURL + "capabilities/"+ req.params.layer;
	res.links({
		"http://www.w3.org/ns/json-ld#context": context,
		"http://json-schema.org/json-schema": schema,
		"http://www.opengis.net/rest-ows/resourceMetadata": metadata
	});
	next();
};

//Middleware for Capabilities header
var capabilitiesHeader = function (req, res, next) {
	var capabilities = settings.baseURL + "capabilities/";
	res.links({
		"http://www.w3.org/ns/hydra/core#apiDocumentation": capabilities
	});
	next();
};

router.get('/wfs', capabilitiesHeader, function (req, res, next) {
  res.send('WFS');
});

//GetFeature and GetPropertyValue
router.get('/wfs/:layer', layersVerify, contentNegotiation, describeHeaders, function (req, res, next) {
	//Content negotiation
	res.format({
		'text/html': function () {
			//set render to true
			wfsOperations.getOutput(req, res, req.params.layer, true);
		},
		'application/ext.geo+json': function () {
			//set render to false
			wfsOperations.getOutput(req, res, req.params.layer, false);
		},
		'default': function () {
			// respond with 406 - Not Acceptable
			res.status(406).send('Not Acceptable');
		}
	});
});

//GetCapabilities
router.get('/capabilities', capabilitiesHeader, function (req, res, next) {
	res.header("Content-Type", "application/ld+json");
	res.send(require(settings.capabilities));
});

//Describe Feature Type (layer metadata)
router.get('/capabilities/:layer', layersVerify, function (req, res, next) {
	res.header("Content-Type", "application/ld+json");
	var metadata = require(settings.capabilities);
	var layerMetadata;
	metadata.supportedClass.forEach(function(item){
		if(item["ows:name"] === req.params.layer){
			layerMetadata = item;
		}
	});
	res.send(layerMetadata);
});

//Describe Feature Type (context)
router.get('/context/:layer', layersVerify, function (req, res, next) {
	//serve
	res.header("Content-Type", "application/ld+json");
	res.send(require(settings.layers[req.params.layer].context));
});

//Describe Feature Type (schema)
router.get('/schema/:layer', layersVerify, function (req, res, next) {

	res.header("Content-Type", "application/schema+json");
	res.send(require(settings.layers[req.params.layer].schemaLocation));
});


//getFeatureById and GetPropertyValue 
router.get('/wfs/:layer/:id', layersVerify, contentNegotiation, describeHeaders, function (req, res, next) {
	//Content negotiation
	res.format({
		'text/html': function () {
			//set render to true
			wfsOperations.getOutputById(res, req.params.layer, req.params.id, true);
		},
		'application/ext.geo+json': function () {
			//set render to false
			wfsOperations.getOutputById(res, req.params.layer, req.params.id, false);
		},
		'default': function () {
			// respond with 406 - Not Acceptable
			res.status(406).send('Not Acceptable');
		}
	});
});

//Simple insert
router.post('/wfs/:layer', layersVerify, geojsonParser, contentVerify, contentValidation, function (req, res, next) {
	wfsOperations.insertData(req.body, res, req.params.layer);
});

//Simple delete
router.delete('/wfs/:layer/:id', layersVerify, function (req, res, next) {
	wfsOperations.deleteData(res, req.params.id, req.params.layer);
});

//Simple update
router.put('/wfs/:layer/:id', layersVerify, geojsonParser, contentVerify, contentValidation, function (req, res, next) {
	wfsOperations.updateData(res, req.params.id, req.body, req.params.layer);
});

module.exports = router;
