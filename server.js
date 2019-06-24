var url     = require('url'),
    http    = require('http'),
    https   = require('https'),
    fs      = require('fs'),
    qs      = require('querystring'),
    express = require('express'),
    app     = express(),
    gatherFacts = require('./gather_facts');

var TRUNCATE_THRESHOLD = 10,
    REVEALED_CHARS = 3,
    REPLACEMENT = '***';

// Load config defaults from JSON file.
// Environment variables override defaults.
function loadConfig() {
  var config = JSON.parse(fs.readFileSync(__dirname+ '/config.json', 'utf-8'));
  log('Configuration');
  for (var i in config) {
    config[i] = process.env[i.toUpperCase()] || config[i];
    if (i === 'oauth_client_id' || i === 'oauth_client_secret') {
      log(i + ':', config[i], true);
    } else {
      log(i + ':', config[i]);
    }
  }
  return config;
}

var config = loadConfig();
var facts = {};
authenticateSpotify(function(error, result){
  gatherFacts.getInfo(result, function(info){
    facts = info;
    console.log(facts);
  })
})

setInterval(function(){
  authenticateSpotify(function(error, result){
    gatherFacts.getInfo(result, function(info){
      facts = info;
    })
  })
}, 120000)

function gather_facts(cb){
  cb(facts);
}

function authenticateGithub(code, cb) {
  var data = qs.stringify({
    client_id: config.github_oauth_client_id,
    client_secret: config.github_oauth_client_secret,
    code: code
  });

  var reqOptions = {
    host: config.github_oauth_host,
    port: config.github_oauth_port,
    path: config.github_oauth_path,
    method: config.github_oauth_method,
    headers: { 'content-length': data.length }
  };

  var body = "";
  var req = https.request(reqOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, qs.parse(body).access_token);
    });
  });

  req.write(data);
  req.end();
  req.on('error', function(e) { cb(e.message); });
}

function authenticateSpotify(cb) {
  console.log(config);
  var reqOptions = {
    host: config.spotify_oauth_host,
    port: 443,
    path: config.spotify_oauth_path,
    method: config.spotify_oauth_method,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' +Buffer.from(config.spotify_oauth_client_id+":"+config.spotify_oauth_client_secret, 'binary').toString('base64') },
  };
  var data = "grant_type=client_credentials";
  var body = "";
  var req = https.request(reqOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, JSON.parse(body));
    });
  });
  req.write(data);
  req.end();
  req.on('error', function(e) { cb(e.message); });
}

function authenticateDropbox(code, cb) {
  var data = qs.stringify({
      grant_type: "authorization_code",
      code: code
  });

  var reqOptions = {
    auth: config.dropbox_oauth_client_id + ":" + config.dropbox_oauth_client_secret,
    host: config.dropbox_oauth_host,
    port: config.dropbox_oauth_port,
    path: config.dropbox_oauth_path,
    method: config.dropbox_oauth_method,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'content-length': data.length }
  };

  var body = "";
  var req = https.request(reqOptions, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, JSON.parse(body).access_token);
    });
  });

  req.write(data);
  req.end();
  req.on('error', function(e) { cb(e.message); });
}

/**
 * Handles logging to the console.
 * Logged values can be sanitized before they are logged
 *
 * @param {string} label - label for the log message
 * @param {Object||string} value - the actual log message, can be a string or a plain object
 * @param {boolean} sanitized - should the value be sanitized before logging?
 */
function log(label, value, sanitized) {
  value = value || '';
  if (sanitized){
    if (typeof(value) === 'string' && value.length > TRUNCATE_THRESHOLD){
      console.log(label, value.substring(REVEALED_CHARS, 0) + REPLACEMENT);
    } else {
      console.log(label, REPLACEMENT);
    }
  } else {
    console.log(label, value);
  }
}


// Convenience for allowing CORS on routes - GET only
app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


app.get('/github/authenticate/:code', function(req, res) {
  log('authenticating code:', req.params.code, true);
  authenticateGithub(req.params.code, function(err, token) {
    log(token);
    var result
    if ( err || !token ) {
      result = {"error": err || "bad_code"};
      log(result.error);
    } else {
      result = {"token": token};
      log("token", result.token, true);
    }
    res.json(result);
  });
});

app.get('/github/authenticate', function(req, res) {
  log('authenticating code:', req.query.code, true);
  authenticateGithub(req.query.code, function(err, token) {
    var result
    if ( err || !token ) {
      result = {"error": err || "bad_code"};
      log(result.error);
    } else {
      result = {"token": token};
      log("token", result.token, true);
    }
    res.json(result);
  });
});


app.get('/spotify/authenticate', function(req, res) {
  authenticateSpotify(function(err, token) {
    var result
    if ( err || !token ) {
      result = {"error": err || "bad_code"};
      log(result.error);
    } else {
      result = token;
    }
    res.json(result);
  });
});

app.get('/gatheredFacts', function(req, res) {
  gather_facts(function(facts){
    res.json(facts);
  });
});

app.get('/dropbox/authenticate/:code', function(req, res) {
  log('authenticating code:', req.params.code, true);
  authenticateDropbox(req.params.code, function(err, token) {
    var result
    if ( err || !token ) {
      result = {"error": err || "bad_code"};
      log(result.error);
    } else {
      result = {"token": token};
      log("token", result.token, true);
    }
    res.json(result);
  });
});

app.get('/dropbox/authenticate', function(req, res) {
  log('authenticating code:', req.query.code, true);
  authenticateDropbox(req.query.code, function(err, token) {
    var result
    if ( err || !token ) {
      result = {"error": err || "bad_code"};
      log(result.error);
    } else {
      result = {"token": token};
      log("token", result.token, true);
    }
    res.json(result);
  });
});

var port = process.env.PORT || config.port || 9999;

app.listen(port, null, function (err) {
  log('Gatekeeper, at your service: http://localhost:' + port);
});




