'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _sequelize = require('sequelize');

var _sequelize2 = _interopRequireDefault(_sequelize);

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var basename = _path2.default.basename(__filename);
var env = process.env.NODE_ENV || 'development';
var config = require('../config/config.json')[env];

var db = {};
var sequelize = {};
_dotenv2.default.config();

if (config.use_env_variable) {
  sequelize = new _sequelize2.default(process.env[config.use_env_variable], config);
} else {
  sequelize = new _sequelize2.default(config.database, config.username, config.password, config);
}

_fs2.default.readdirSync(__dirname).filter(function (file) {
  var returnValue = file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  return returnValue;
}).forEach(function (file) {
  var model = sequelize.import(_path2.default.join(__dirname, file));
  db[model.name] = model;
});

Object.keys(db).forEach(function (modelName) {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = _sequelize2.default;
module.exports = db;