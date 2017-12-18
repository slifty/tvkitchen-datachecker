// While code was not directly used, this project was inspired by
// @danvk's [localturk](https://github.com/danvk/localturk)
//
// You should check that out, since it serves a different use case very
// well!

import compression from 'compression'
import express from 'express'
import bodyParser from 'body-parser'
import fs from 'fs'
import request from 'request'
import path from 'path'
import dotenv from 'dotenv'
import schedule from 'node-schedule'
import csv from 'csv'
import { exec } from 'child_process'

import { APP_NAME, STATIC_PATH, WEB_PORT } from '../shared/config'
import { isProd } from '../shared/util'
import renderApp from './render-app'

import models from '../models'

// Load .env config values
dotenv.config()

const { Measurement } = models
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(compression())
app.use(STATIC_PATH, express.static('dist'))
app.use(STATIC_PATH, express.static('public'))

app.get('/', (req, res) => {
  res.send(renderApp(APP_NAME))
})

app.listen(WEB_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${WEB_PORT} ${isProd ? '(production)' : '(development)'}.`)
})


app.get('/', (req, res) => {
  res.send('Not Implemented')
})

app.get('/work/single/:id', (req, res) => {
  res.send('Not Implemented')
})

app.get('/work/group/:typeId', (req, res) => {
  res.send('Not Implemented')
})

app.post('/api/measurements', (req, res) => {
  const {
    type,
    value,
    confidence,
    archiveId,
    start,
    duration,
  } = req.body
  let responded = false
  Measurement
    .build({
      type,
      value,
      confidence,
      archiveId,
      start,
      duration,
      verdict: null,
    })
    .save()
    .catch((error) => {
      if (!responded) {
        res.send(error)
        responded = true
      }
    })
    .then((measurement) => {
      if (!responded) {
        res.send(measurement)
        responded = true
      }
    })
})

app.delete('/api/measurements', (req, res) => {
  res.send('Not Implemented')
})

app.get('/api/measurements', (req, res) => {
  const where = {}
  const settings = {}

  if (req.query.noVerdict) {
    where.verdict = null
  }

  if (where !== {}) {
    settings.where = where
  }

  if (req.query.count) {
    settings.limit = parseInt(req.query.count, 10)
  } else {
    settings.limit = 10
  }

  Measurement.findAll(settings).then((measurements) => {
    res.send(measurements)
  })
})

app.get('/api/measurements/:id', (req, res) => {
  Measurement.findById(req.params.id).then((measurement) => {
    if (measurement != null) {
      res.send(measurement)
    } else {
      res.send('{}')
    }
  })
})

app.post('/api/measurements/:id', (req, res) => {
  Measurement.findById(req.params.id).then((measurement) => {
    if (measurement != null) {
      const mutableMeasurement = measurement
      if ('verdict' in req.body) {
        mutableMeasurement.verdict = req.body.verdict
      }

      let responded = false
      mutableMeasurement
        .save()
        .catch((error) => {
          if (!responded) {
            res.send(error)
            responded = true
          }
        })
        .then((updatedMeasurement) => {
          if (!responded) {
            res.send(updatedMeasurement)
            responded = true
          }
        })
    } else {
      res.send('{}')
    }
  })
})

// Below are helper methods that should be properly organized
// if the prototype turns into a real tool

// Download the mp4 associated with a clip
function downloadClip(archiveId, start, stop, callback) {
  const timestamp = Date.now()
  const storageFile = `/tmp/${archiveId}_${start}_${stop}_${timestamp}.mp4`
  const archiveUrl = `https://archive.org/download/${archiveId}/${archiveId}.mp4?t=${start}/${stop}`
  const file = fs.createWriteStream(storageFile)
  const options = {
    uri: archiveUrl,
    method: 'GET',
    headers: {
      Cookie: `logged-in-user=${process.env.ARCHIVE_USER_ID};logged-in-sig=${process.env.ARCHIVE_SIG}`,
    },
  }

  const stream = request(options).pipe(file)
  stream.on('finish', () => {
    file.close()
    if (callback) {
      callback(storageFile)
    }
  })
}

// Extract key frames from a clip
function extractFrame(archiveId, videoPath, second, callback) {
  const ffmpegPath = process.env.FFMPEG_PATH
  const imageFile = path.join(__dirname, `../../public/frames/${archiveId}_${second}.jpg`)
  const command = `${ffmpegPath} -ss ${second}.001 -i "${videoPath}" -vf scale=800:-1 -vframes 1 ${imageFile} 2>&1`
  exec(command, (err, stdout, stderr) => {
    if (err || stderr) {
      console.log(`ERR: ${command}`)
    }

    if (callback) {
      callback(imageFile)
    }
  })
  return imageFile
}

function logFaceomaticMeasurement(archiveId, label, start, duration) {
  // Does the measurement exist
  Measurement.findAll({
    where: {
      archiveId,
      start,
      value: label,
      type: 'faceomatic',
    },
  }).then((results) => {
    if (results.length > 0) {
      return
    }

    const paddedStart = Math.max(0, start - 4)
    const paddedDuration = duration + Math.min(4, start) + 4
    downloadClip(archiveId, paddedStart, paddedStart + paddedDuration, (videoFile) => {
      const images = []
      images.push(extractFrame(`${archiveId}_${paddedStart}`, videoFile, Math.floor(paddedDuration / 2) - 1).split('/').slice(-2).join('/'))
      images.push(extractFrame(`${archiveId}_${paddedStart}`, videoFile, Math.floor(paddedDuration / 2)).split('/').slice(-2).join('/'))
      images.push(extractFrame(`${archiveId}_${paddedStart}`, videoFile, Math.floor(paddedDuration / 2) + 1).split('/').slice(-2).join('/'))
      Measurement
        .build({
          type: 'faceomatic',
          value: label,
          confidence: 0.9,
          archiveId,
          start,
          duration,
          imagePaths: JSON.stringify(images),
          verdict: null,
        })
        .save()
        .catch((error) => {
          console.log(error)
        })
    })
  })
}

function loadResults() {
  console.log('Downloading latest results...')
  const storageFile = '/tmp/faceomaticResults.csv'
  const file = fs.createWriteStream(storageFile)
  let stream = null

  if (process.env.CSV_LOCATION === '') {
    console.log('Loading from https://archive.org/download/faceomatic/results.csv')
    const archiveUrl = 'https://archive.org/download/faceomatic/results.csv'
    const options = {
      uri: archiveUrl,
      method: 'GET',
      headers: {
        Cookie: `logged-in-user=${process.env.ARCHIVE_USER_ID};logged-in-sig=${process.env.ARCHIVE_SIG}`,
      },
    }
    stream = request(options)
      .pipe(file)
  } else {
    console.log(`Loading from ${process.env.CSV_LOCATION}`)
    stream = fs.createReadStream(process.env.CSV_LOCATION)
      .pipe(file)
  }

  stream.on('finish', () => {
    // Open the file...
    fs.readFile(storageFile, (readErr, fileData) => {
      csv.parse(fileData, {}, (parseErr, rows) => {
        // We are only going to load the most recent 10 rows
        const truncatedRows = rows.slice(rows.length - 100)
        truncatedRows.forEach((row) => {
          const archiveId = row[7]
          const label = row[0]
          const parts = row[8].split('/')
          const start = parts[parts.length - 3]
          const duration = parseInt(row[6], 10)
          logFaceomaticMeasurement(archiveId, label, start, duration)
        })
      })
    })
  })
}

// Set up hourly scheduled download of CSV and import of latest rows
schedule.scheduleJob('30 * * * *', loadResults)

loadResults()
