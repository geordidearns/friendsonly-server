"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class VaultAsset extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {}
  }
  VaultAsset.init(
    {
      vaultId: {
        type: DataTypes.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Vaults",
          key: "vaultId",
        },
      },
      assetId: {
        type: DataTypes.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Assets",
          key: "assetId",
        },
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "VaultAsset",
    }
  );
  return VaultAsset;
};
