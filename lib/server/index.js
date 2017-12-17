'use strict';

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

var _nodeSchedule = require('node-schedule');

var _nodeSchedule2 = _interopRequireDefault(_nodeSchedule);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _child_process = require('child_process');

var _config = require('../shared/config');

var _util = require('../shared/util');

var _renderApp = require('./render-app');

var _renderApp2 = _interopRequireDefault(_renderApp);

var _models = require('../models');

var _models2 = _interopRequireDefault(_models);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Load .env config values
// While code was not directly used, this project was inspired by
// @danvk's [localturk](https://github.com/danvk/localturk)
//
// You should check that out, since it serves a different use case very
// well!

_dotenv2.default.config();

var Measurement = _models2.default.Measurement;

var app = (0, _express2.default)();
app.use(_bodyParser2.default.urlencoded({ extended: true }));
app.use(_bodyParser2.default.json());
app.use((0, _compression2.default)());
app.use(_config.STATIC_PATH, _express2.default.static('dist'));
app.use(_config.STATIC_PATH, _express2.default.static('public'));

app.get('/', function (req, res) {
  res.send((0, _renderApp2.default)(_config.APP_NAME));
});

app.listen(_config.WEB_PORT, function () {
  // eslint-disable-next-line no-console
  console.log('Server running on port ' + _config.WEB_PORT + ' ' + (_util.isProd ? '(production)' : '(development)') + '.');
});

app.get('/', function (req, res) {
  res.send('Not Implemented');
});

app.get('/work/single/:id', function (req, res) {
  res.send('Not Implemented');
});

app.get('/work/group/:typeId', function (req, res) {
  res.send('Not Implemented');
});

app.post('/api/measurements', function (req, res) {
  var _req$body = req.body,
      type = _req$body.type,
      value = _req$body.value,
      confidence = _req$body.confidence,
      archiveId = _req$body.archiveId,
      start = _req$body.start,
      duration = _req$body.duration;

  var responded = false;
  Measurement.build({
    type: type,
    value: value,
    confidence: confidence,
    archiveId: archiveId,
    start: start,
    duration: duration,
    verdict: null
  }).save().catch(function (error) {
    if (!responded) {
      res.send(error);
      responded = true;
    }
  }).then(function (measurement) {
    if (!responded) {
      res.send(measurement);
      responded = true;
    }
  });
});

app.delete('/api/measurements', function (req, res) {
  res.send('Not Implemented');
});

app.get('/api/measurements', function (req, res) {
  var where = {};
  var settings = {};

  if (req.query.noVerdict) {
    where.verdict = null;
  }

  if (where !== {}) {
    settings.where = where;
  }

  if (req.query.count) {
    settings.limit = parseInt(req.query.count, 10);
  } else {
    settings.limit = 10;
  }

  Measurement.findAll(settings).then(function (measurements) {
    res.send(measurements);
  });
});

app.get('/api/measurements/:id', function (req, res) {
  Measurement.findById(req.params.id).then(function (measurement) {
    if (measurement != null) {
      res.send(measurement);
    } else {
      res.send('{}');
    }
  });
});

app.post('/api/measurements/:id', function (req, res) {
  Measurement.findById(req.params.id).then(function (measurement) {
    if (measurement != null) {
      var mutableMeasurement = measurement;
      if ('verdict' in req.body) {
        mutableMeasurement.verdict = req.body.verdict;
      }

      var responded = false;
      mutableMeasurement.save().catch(function (error) {
        if (!responded) {
          res.send(error);
          responded = true;
        }
      }).then(function (updatedMeasurement) {
        if (!responded) {
          res.send(updatedMeasurement);
          responded = true;
        }
      });
    } else {
      res.send('{}');
    }
  });
});

// Below are helper methods that should be properly organized
// if the prototype turns into a real tool

// Download the mp4 associated with a clip
function downloadClip(archiveId, start, stop, callback) {
  var timestamp = Date.now();
  var storageFile = '/tmp/' + archiveId + '_' + start + '_' + stop + '_' + timestamp + '.mp4';
  var archiveUrl = 'https://archive.org/download/' + archiveId + '/' + archiveId + '.mp4?t=' + start + '/' + stop;
  var file = _fs2.default.createWriteStream(storageFile);
  var options = {
    uri: archiveUrl,
    method: 'GET',
    headers: {
      Cookie: 'logged-in-user=' + process.env.ARCHIVE_USER_ID + ';logged-in-sig=' + process.env.ARCHIVE_SIG
    }
  };

  var stream = (0, _request2.default)(options).pipe(file);
  stream.on('finish', function () {
    file.close();
    if (callback) {
      callback(storageFile);
    }
  });
}

// Extract key frames from a clip
function extractFrame(archiveId, videoPath, second, callback) {
  var ffmpegPath = process.env.FFMPEG_PATH;
  var imageFile = _path2.default.join(__dirname, '../../public/frames/' + archiveId + '_' + second + '.jpg');
  var command = ffmpegPath + ' -ss ' + second + '.001 -i "' + videoPath + '" -vf scale=800:-1 -vframes 1 ' + imageFile + ' 2>&1';
  (0, _child_process.exec)(command, function (err, stdout, stderr) {
    if (err || stderr) {
      console.log('ERR: ' + command);
    }

    if (callback) {
      callback(imageFile);
    }
  });
  return imageFile;
}

function logFaceomaticMeasurement(archiveId, label, start, duration) {
  // Does the measurement exist
  Measurement.findAll({
    where: {
      archiveId: archiveId,
      start: start,
      value: label,
      type: 'faceomatic'
    }
  }).then(function (results) {
    if (results.length > 0) {
      return;
    }

    var paddedStart = Math.max(0, start - 4);
    var paddedDuration = duration + Math.min(4, start) + 4;
    downloadClip(archiveId, paddedStart, paddedStart + paddedDuration, function (videoFile) {
      var images = [];
      images.push(extractFrame(archiveId + '_' + paddedStart, videoFile, Math.floor(paddedDuration / 2) - 1).split('/').slice(-2).join('/'));
      images.push(extractFrame(archiveId + '_' + paddedStart, videoFile, Math.floor(paddedDuration / 2)).split('/').slice(-2).join('/'));
      images.push(extractFrame(archiveId + '_' + paddedStart, videoFile, Math.floor(paddedDuration / 2) + 1).split('/').slice(-2).join('/'));
      Measurement.build({
        type: 'faceomatic',
        value: label,
        confidence: 0.9,
        archiveId: archiveId,
        start: start,
        duration: duration,
        imagePaths: JSON.stringify(images),
        verdict: null
      }).save().catch(function (error) {
        console.log(error);
      });
    });
  });
}

function loadResults() {
  console.log('Downloading latest results...');
  var storageFile = '/tmp/faceomaticResults.csv';
  var archiveUrl = 'https://archive.org/download/faceomatic/results.csv';
  var file = _fs2.default.createWriteStream(storageFile);
  var options = {
    uri: archiveUrl,
    method: 'GET',
    headers: {
      Cookie: 'logged-in-user=' + process.env.ARCHIVE_USER_ID + ';logged-in-sig=' + process.env.ARCHIVE_SIG
    }
  };

  var stream = (0, _request2.default)(options).pipe(file);
  stream.on('finish', function () {
    // Open the file...
    _fs2.default.readFile(storageFile, function (readErr, fileData) {
      _csv2.default.parse(fileData, {}, function (parseErr, rows) {
        // We are only going to load the most recent 10 rows
        var truncatedRows = rows.slice(rows.length - 100);
        truncatedRows.forEach(function (row) {
          var archiveId = row[7];
          var label = row[0];
          var parts = row[8].split('/');
          var start = parts[parts.length - 3];
          var duration = parseInt(row[6], 10);
          logFaceomaticMeasurement(archiveId, label, start, duration);
        });
      });
    });
  });
}

// Set up hourly scheduled download of CSV and import of latest rows
_nodeSchedule2.default.scheduleJob('0 * * * *', loadResults);