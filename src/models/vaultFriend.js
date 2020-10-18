"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class VaultFriend extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {}
  }
  VaultFriend.init(
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
      friendId: {
        type: DataTypes.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Friends",
          key: "friendId",
        },
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "VaultFriend",
    }
  );
  return VaultFriend;
};
