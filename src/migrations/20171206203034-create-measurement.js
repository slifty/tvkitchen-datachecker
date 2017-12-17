module.exports = {
  up: (queryInterface, Sequelize) => {
    const returnValue = queryInterface.createTable('Measurements', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      type: {
        type: Sequelize.STRING,
      },
      value: {
        type: Sequelize.STRING,
      },
      confidence: {
        type: Sequelize.INTEGER,
      },
      archiveId: {
        type: Sequelize.STRING,
      },
      start: {
        type: Sequelize.INTEGER,
      },
      duration: {
        type: Sequelize.INTEGER,
      },
      verdict: {
        type: Sequelize.STRING,
      },
      imagePaths: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
    return returnValue
  },
  down: (queryInterface) => {
    const returnValue = queryInterface.dropTable('Measurements')
    return returnValue
  },
}
