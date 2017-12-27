export const WEB_PORT = process.env.PORT || 8800
export const STATIC_PATH = '/static'
export const APP_NAME = 'Bloop App'
export const SEQUELIZE_CONFIG = {
  development: {
    use_env_variable: 'DATABASE_URL',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      idle: 20000,
      evict: 20000,
      acquire: 0,
    },
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      idle: 20000,
      evict: 20000,
      acquire: 0,
    },
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      idle: 20000,
      evict: 20000,
      acquire: 0,
    },
  },
}
