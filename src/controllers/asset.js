const db = require("../models/index.js");
const _ = require("lodash");
const vault = require("../models/vault.js");
// Encryption methods
const { encrypt, decrypt } = require("../routes/utils/crypto");

let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

const paginate = ({ page, pageLimit }) => {
  const offset = page * pageLimit;
  const limit = pageLimit;

  return {
    offset,
    limit,
  };
};

const createAsset = async (vaultId, type, data) => {
  try {
    if (!vaultId || !type || !data) {
      throw "Incorrect parameters passed to create an asset";
    }

    // Create Asset & add to VaultAssets
    const encryptedData = await encrypt(data);
    const result = await db.sequelize.transaction(async (t) => {
      const assetData = await db.Asset.create(
        {
          type,
          data: encryptedData,
        },
        { transaction: t }
      );
      await db.VaultAsset.create(
        {
          vaultId: vaultId,
          assetId: assetData.id,
        },
        { transaction: t }
      );

      return assetData;
    });

    if (_.isEmpty(result)) {
      throw "Asset not created";
    }

    return result;
  } catch (err) {
    throw err;
  }
};

const decryptMessage = async (obj) => {
  const decryptMessage = await decrypt(obj.data);
  return { ...obj, data: decryptMessage };
};

const getAssetsByVaultId = async (vaultId, page, pageLimit) => {
  try {
    const data = await db.Asset.findAndCountAll({
      attributes: ["id", "type", "data", "createdAt"],
      include: [
        {
          model: db.Vault,
          where: { id: vaultId },
          attributes: [],
        },
      ],
      ...paginate({ page, pageLimit }),
      ...configOptions,
    });

    const decryptedMessages = await Promise.all(
      data.rows.map(async (x) => decryptMessage(x))
    );

    if (_.isEmpty(decryptedMessages)) {
      throw "No assets found";
    }

    return decryptedMessages;
  } catch (err) {
    throw err;
  }
};

const deleteAssetById = async (assetId) => {
  try {
    const result = await db.sequelize.transaction(async (t) => {
      await db.VaultAsset.destroy(
        {
          where: { assetId: assetId },
          ...configOptions,
        },
        { transaction: t }
      );

      await db.Asset.destroy(
        {
          where: { id: assetId },
          ...configOptions,
        },
        { transaction: t }
      );

      return { message: "Asset has been deleted" };
    });

    return result;
  } catch (err) {
    throw "Unable to delete the asset";
  }
};

const deleteAssetsByVaultId = async (vaultId) => {
  try {
    const data = await db.Asset.findAll({
      include: [
        {
          model: db.Vault,
          where: { id: vaultId },
        },
      ],
      ...configOptions,
    });
    const deleteIds = data.map((x) => x.id);

    await db.VaultAsset.destroy({ where: { id: deleteIds } });
    await db.Asset.destroy({ where: { id: deleteIds } });

    return { message: "All vault assets have been deleted" };
  } catch (err) {
    throw "Unable to delete the assets";
  }
};

// TODO: Delete all assets by member id
// TODO: Delet assets in vault by member id

exports.createAsset = createAsset;
exports.getAssetsByVaultId = getAssetsByVaultId;
exports.deleteAssetById = deleteAssetById;
exports.deleteAssetsByVaultId = deleteAssetsByVaultId;
