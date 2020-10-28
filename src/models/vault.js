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
      Vault.belongsToMany(models.Member, {
        through: "VaultMember",
        foreignKey: {
          name: "vaultId",
          allowNull: false,
        },
      });
      Vault.belongsToMany(models.Asset, {
        through: "VaultAsset",
        foreignKey: {
          name: "vaultId",
          allowNull: true,
        },
      });
    }
  }
  Vault.init(
    {
      key: {
        type: DataTypes.UUID,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      location: {
        type: DataTypes.GEOGRAPHY("POINT", 4326),
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      creatorId: {
        type: DataTypes.INTEGER,
        unique: false,
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
