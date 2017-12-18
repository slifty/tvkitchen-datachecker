'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var WEB_PORT = exports.WEB_PORT = process.env.PORT || 8800;
var STATIC_PATH = exports.STATIC_PATH = '/static';
var APP_NAME = exports.APP_NAME = 'Bloop App';
var SEQUELIZE_CONFIG = exports.SEQUELIZE_CONFIG = {
  development: {
    use_env_variable: 'DATABASE_URL',
    logging: false
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    logging: false
  }
};