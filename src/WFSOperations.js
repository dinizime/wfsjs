/*
	WFS operations
*/
//allows serving files with extension jsonld
var fs = require("fs");
require.extensions[".jsonld"] = function (m) {
 m.exports = JSON.parse(fs.readFileSync(m.filename, 'utf8'));
};

var settings = require('../config.json');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var resultSchema = new Schema({ any: Schema.Types.Mixed });
var model = {};
var context = {};
//connects to local mongodb
var db = mongoose.createConnection(settings.localMongo, function(error){
	if(error){
		console.log(error);
	}
});
//define the collections
for(var key in settings.layers){
	var layer = settings.layers[key];
	var layerModel = db.model(key, resultSchema);
	model[key] = layerModel;
	context[key] = require(layer.context);
}

//connect to external Mongodb
// for(var key in settings.layers){
// 	var layer = settings.layers[key];
// 	var db = mongoose.createConnection(layer.user+':'+layer.password+layer.db, function(error){
// 		if(error){
// 			console.log(error);
// 		}
// 	});
// 	var layerModel = db.model('Result', resultSchema);
// 	model[key] = layerModel;
// 	context[key] = require(layer.context);
// }

//GetFeature and GetPropertyValue
function getOutput(req,res,layerID,render){
	
	//req.query.srsname
	//FIXME SRSNAME

	//this variable is used for querying mongoDB
	var aggregate = [];
	//just to be able to run aggregate in case of no query parameters
	aggregate.push({$match : {}});

	//bbox = x1,y1,x2,y2 (bottom left, upper right)
	//coordinates are float
	if(req.query.bbox !== undefined){
		var bbox = req.query.bbox.split(',').map(function(item){
			return parseFloat(item);
		});
		aggregate.push({$match : {geometry : {$geoWithin : { $geometry : { type: 'Polygon', 
			coordinates: [ [ [ bbox[0] , bbox[1] ] , [ bbox[2] , bbox[1] ],  [ bbox[2] , bbox[3] ], 
			[ bbox[0] , bbox[3] ], [ bbox[0] , bbox[1] ] ] ] }}}}});
	}

	//Attributes=att1,att2,att3
	if(req.query.attributes !== undefined){
		// cannot remove @type, type, id and geometry
		var projection = {"@type": 1, type: 1, "@id": 1, geometry: 1};
		var att = req.query.attributes.split(',');
		att.forEach( function(val){
			projection['properties.'+val] = 1;	
		});
	 	aggregate.push({ $project: projection });
	}

	//positive integer
	if(req.query.startindex !== undefined){
		aggregate.push({ $skip: parseInt(req.query.startindex) });
	}

	// sortby = att1,-att2,-att3
	// can only sort by properties inside the properties field
	if(req.query.sortby !== undefined){
		var sort = {};
		var atts = req.query.sortby.split(',');
		atts.forEach( function(val){
			if(val.charAt(0) === '-') {
				sort['properties.'+val.slice( 1 )] = -1;
			} else { 
				sort['properties.'+val] = 1;	
			}
		});
		aggregate.push({ $sort: sort });
	}	

	//positive integer
	if(req.query.count !== undefined){
		aggregate.push({ $limit: parseInt(req.query.count) });
	}

	model[layerID].aggregate(aggregate,function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result.length === 0){
				//Did not find any entry
				//returns empty feature collection
				return res.json({"type":"FeatureCollection", features: []});
			} else {
				//Found result
				if(render){
					//render map
					res.render('map', {results:JSON.stringify(result)});
				} else {
					result = result.map(function(item){
						delete item._id;
						delete item.__v;
						return item;			
					});
					//create feature collection
					return res.json({"@context": context[layerID], "type":"FeatureCollection", features: result});
				}
			}
		}
	});
}

//getFeatureById and GetPropertyValue 
function getOutputById(res,layerID, featureID, render){
	//FIXME SRS
	
	var query = model[layerID].findOne({'id': featureID});
	query.select('-_id -__v');
	
	query.exec(function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		} else {
			//results
			if(result === null){
				//Did not find any entry
				res.status(404).end();
			} else {
				if(render){
					//render map
					res.render('map', {results:JSON.stringify(result)});
				} else {
					//make sure context is the first property
					var resultContext = {"@context": context[layerID]};
					for (var key in result.toObject()) {
						resultContext[key] = result.toObject()[key];
					}
					return res.json(resultContext);
				}
			}
		}
	});	
}

function insertData(results, res, layerID){
	//convert feature collection into array
	delete results["@context"];
	
	var resultsArray;
	if("features" in results){
		resultsArray = results.features;
	} else {
		resultsArray = [results];
	}

	model[layerID].collection.insert(resultsArray, function(err, docs) {
		if (err) {
			console.log('error');
			return res.status(500).end();
		} else {
			return res.status(201).end();
		}
	});	
}

function deleteData(res,featureID, layerID){
	
	model[layerID].findOneAndRemove({'id': featureID}, function(err,result){
		//error
		if (err){
			console.log(err);
			return res.status(500).end();
		}
		if(result === null){
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result		
			return res.status(204).end();
		}
	});
}

function updateData(res,featureID, values, layerID){
	
	model[layerID].findOneAndRemove({ 'id': featureID }, function (err, doc) {
		//error
		if (err) {
			console.log(err);
			return res.status(500).end();
		}
		if (doc === null) {
			//Did not find any entry
			res.status(404).end();
		} else {
			//Found result		
			//Create new object
			var original = doc.toObject();
			// Delete the _id property, otherwise Mongo will return a "Mod on _id not allowed" error
			delete original._id;
			
			//prepare object
			Object.keys(values.properties).forEach(function(key){
				original.properties[key] = values.properties[key];
			});
			original.geometry = values.geometry;
			
			//Insert new object
			model[layerID].collection.insert([original], function(err, docs) {
				if (err) {
					console.log('error');
					return res.status(500).end();
				} else {
					return res.status(200).end();
				}
			});				
		}
	});	

}

module.exports.getOutput = getOutput;
module.exports.getOutputById = getOutputById;
module.exports.insertData = insertData;
module.exports.deleteData = deleteData;
module.exports.updateData = updateData;