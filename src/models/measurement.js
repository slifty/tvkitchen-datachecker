module.exports = (sequelize, DataTypes) => {
  const Measurement = sequelize.define(
    'Measurement', {
      type: DataTypes.STRING,
      value: DataTypes.STRING,
      confidence: DataTypes.INTEGER,
      archiveId: DataTypes.STRING,
      start: DataTypes.INTEGER,
      duration: DataTypes.INTEGER,
      verdict: DataTypes.STRING,
      imagePaths: DataTypes.TEXT,
    },
    {
      classMethods: {},
    },
  )
  return Measurement
}
