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
      creatorId: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: false,
        type: Sequelize.INTEGER,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
    await queryInterface.addIndex("Vaults", {
      fields: ["location"],
      concurrently: true,
      type: "SPATIAL",
    });
    await queryInterface.addIndex("Vaults", {
      fields: ["creatorId"],
      concurrently: true,
    });
    await queryInterface.createTable("Members", {
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
      lastLoginAt: Sequelize.INTEGER,
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
    await queryInterface.createTable("Assets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      type: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      data: {
        type: Sequelize.JSON,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
    await queryInterface.createTable("VaultMembers", {
      id: {
        allowNull: false,
        autoIncrement: true,
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
      memberId: {
        type: Sequelize.INTEGER,
        unique: false,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Members",
          key: "id",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
    await queryInterface.addConstraint("VaultMembers", {
      fields: ["vaultId", "memberId"],
      type: "primary key",
      name: "vaultMemberId_pkey",
    });
    await queryInterface.addIndex("VaultMembers", {
      fields: ["id"],
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
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        references: {
          model: "Assets",
          key: "id",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
    await queryInterface.addIndex("VaultAssets", {
      fields: ["vaultId", "assetId"],
      concurrently: true,
    });
    await queryInterface.createTable("Session", {
      sid: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: true,
        type: Sequelize.STRING(36),
      },
      expires: {
        type: Sequelize.DATE,
        unique: false,
        allowNull: true,
        validate: {
          notEmpty: false,
        },
      },
      data: {
        type: Sequelize.TEXT,
        unique: false,
        allowNull: true,
        validate: {
          notEmpty: false,
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Vaults");
    await queryInterface.dropTable("VaultMembers");
    await queryInterface.dropTable("Members");
    await queryInterface.dropTable("Assets");
    await queryInterface.dropTable("VaultAssets");
  },
};
