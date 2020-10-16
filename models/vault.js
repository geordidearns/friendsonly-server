"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Vault extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Vault.belongsToMany(models.Friend, {
        through: "VaultFriend",
        foreignKey: {
          name: "vaultId",
          allowNull: false,
        },
      });
    }
  }
  Vault.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      key: {
        type: DataTypes.UUID,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      location: {
        type: DataTypes.GEOMETRY("POINT", 4326),
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Vault",
    }
  );
  return Vault;
};
