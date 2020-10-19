"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const session = require("express-session");
const sequelizeSessionStore = require("connect-session-sequelize")(
  session.Store
);
const logger = require("../config/logger.js");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require("../config/db/dbSettings.json")[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: (msg) => logger.info(msg),
  });
}

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Store session data in DB (https://github.com/mweibel/connect-session-sequelize)
const sessionStore = new sequelizeSessionStore({
  db: sequelize,
});
// Create the session table if doesn't exist
// sessionStore.sync();

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.sessionStore = sessionStore;

module.exports = db;
