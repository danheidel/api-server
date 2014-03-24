var express = require('express');
var mongoose = require('mongoose');

var app = express();
var port = process.argv[2];

//a port to listen on must be provided
if(typeof port === 'undefined'){
	console.error('no port defined!');
	process.exit();
}	

//init database access
var starCon = mongoose.createConnection('mongodb://localhost/stars');
var subbableCon = mongoose.createConnection('mongodb://localhost/subbable');

var scrapeSchema = new mongoose.Schema({
  name: String,
  timestamp: Number,
  funding: Number,
  subs: Number,
});
var starSchema = new mongoose.Schema({
  starID: Number,
  Hip: Number,
  HD: Number,
  HR: Number,
  Gliese: String,
  BayerFlamstead: String,
  ProperName: String,
  RA: Number,
  Dec: Number,
  Distance: Number,
  Mag: Number,
  AbsMag: Number,
  Spectrum: String,
  ColorIndex: Number,
  CalcSpectrum: String
});

var scrapeModel = subbableCon.model('scrape', scrapeSchema);
var starModel = starCon.model('star', starSchema);

// all environments
app.use(express.logger());
app.all('*', function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});
app.use(express.json());
app.use(express.urlencoded());

//db handler
app.get('/stars', function(req, res){
  var fields = req.param('fields') || 'count';
  var dist = req.param('dist') || 0;
  var spec = req.param('spec');
  console.log(fields + ' ' + dist + ' ' + spec);
  
  var distQuery = starModel.where('Distance').lt(dist).where('ColorIndex').ne(null);
  //var distQuery = starModel.where('Distance').lt(dist);
  
  //additional query constraints go here, chain to endQuery
  var endQuery = distQuery;
  
  //escape row count query
  if(fields === 'count'){
    endQuery.count(function(err, data){countSend(err, data, res);});
    return;
  }
  
  //return no fields by default
  var selectFields = {_id:0, __v:0, starID:0, Hip:0, HD:0, HR:0, Gliese:0, BayerFlamstead:0, ProperName:0, RA:0, Dec:0, Distance:0, Mag:0, AbsMag:0, Spectrum:0, ColorIndex:0, CalcSpectrum:0}, 
    selectQuery;
  //can omit _id:0?
  if(fields === 'full'){
    selectFields = {_id:0, starID:1, Hip:1, HD:1, HR:1, Gliese:1, BayerFlamstead:1, ProperName:1, RA:1, Dec:1, Distance:1, Mag:1, AbsMag:1, Spectrum:1, ColorIndex:1, CalcSpectrum:1};
  }
  if(fields === 'spec'){
    selectFields = {_id:0, StarID:1, AbsMag:1, Spectrum:1, ColorIndex:1, CalcSpectrum:1};
  }
  if(fields === 'min'){
    selectFields = {_id:0, AM:1, CI:1};
  }
  
  selectQuery = endQuery.select(selectFields);
  
  selectQuery.exec(function(err, data){
    stdSend(err, data, res);
  });
});

app.get('/subbable', function(req, res){
  var creator = req.param('creator') || 'none',
    timeStart = req.param('timeStart'),
    timeEnd = req.param('timeEnd'),
    dateDensity = req.param('dateDensity') || 86400000,
    wholeQuery = '';
    queryFields = 'id, name, timestamp, funding, subs';
  console.log(creator + ' ' + timeStart + ' ' + timeEnd + ' ' + dateDensity);
  
  creatorQuery = scrapeModel.find({name: creator});
  
  //1800000 is magic number for 30 minutes in milliseconds (scrapes taken 30 min apart)
  var densityQuery = creatorQuery.$where('(this.timestamp % ' + dateDensity + ') < 1800000');
  
  densityQuery.select({_id: 0, name:1, timestamp:1, subs:1, funding:1}).exec(function(err, data){stdSend(err, data, res);});
});

app.listen(port);
console.log('serving danheidel.net on port: ' + port);

process.on('exit', function() {
});



function stdSend(err, data, res){
  if(err){
    console.log(err);
    res.send(err);
  }else{
    console.log('rows returned: ' + data.length);
    res.send(data);
  }
}

function countSend(err, data, res){
  if(err){
    console.log(err);
    res.send(err);
  }else{
    console.log(data);
    res.send({count: data});
  }
}

function starQuery(iQuery){
  if(typeof iQuery === 'undefined'){return 'empty query';}
  if(!(isNum(iQuery) && iQuery > 0)){return 'invalid query format';}
  return true;
}
