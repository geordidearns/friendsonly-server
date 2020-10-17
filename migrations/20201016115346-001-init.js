"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Vaults", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      key: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      location: {
        type: Sequelize.GEOGRAPHY("POINT", 4326),
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
    await queryInterface.addIndex("Vaults", {
      fields: ["location"],
      concurrently: true,
      type: "SPATIAL",
    });
    await queryInterface.createTable("Friends", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      issuer: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      lastLoginAt: Sequelize.STRING,
      key: {
        type: Sequelize.UUID,
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
    await queryInterface.createTable("Assets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      text: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
    await queryInterface.createTable("VaultFriends", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      vaultId: {
        type: Sequelize.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Vaults",
          key: "id",
        },
      },
      friendId: {
        type: Sequelize.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Friends",
          key: "id",
        },
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
    await queryInterface.addIndex("VaultFriends", {
      fields: ["vaultId", "friendId"],
      concurrently: true,
    });
    await queryInterface.createTable("VaultAssets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      vaultId: {
        type: Sequelize.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Vaults",
          key: "id",
        },
      },
      assetId: {
        type: Sequelize.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Assets",
          key: "id",
        },
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
    await queryInterface.addIndex("VaultAssets", {
      fields: ["vaultId", "assetId"],
      concurrently: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Vaults");
    await queryInterface.dropTable("VaultFriends");
    await queryInterface.dropTable("Friends");
    await queryInterface.dropTable("Assets");
    await queryInterface.dropTable("VaultAssets");
  },
};
