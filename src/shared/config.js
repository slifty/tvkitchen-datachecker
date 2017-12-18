export const WEB_PORT = process.env.PORT || 8800
export const STATIC_PATH = '/static'
export const APP_NAME = 'Bloop App'
export const SEQUELIZE_CONFIG = {
  development: {
    use_env_variable: 'DATABASE_URL',
    logging: false,
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    logging: false,
  },
}
