"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Asset extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Asset.belongsToMany(models.Vault, {
        through: "VaultAsset",
        foreignKey: {
          name: "assetId",
          allowNull: false,
        },
        onDelete: "CASCADE",
      });
    }
  }
  Asset.init(
    {
      type: {
        type: DataTypes.STRING,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      data: {
        type: DataTypes.JSON,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      uploaderId: {
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
      modelName: "Asset",
    }
  );
  return Asset;
};
