import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import dotenv from 'dotenv'
import { SEQUELIZE_CONFIG } from '../shared/config'

const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'development'
const config = SEQUELIZE_CONFIG[env]
const db = {}
let sequelize = {}
dotenv.config()


if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config)
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config)
}

fs
  .readdirSync(__dirname)
  .filter((file) => {
    const returnValue = (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js')
    return returnValue
  })
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file))
    db[model.name] = model
  })

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize
module.exports = db
