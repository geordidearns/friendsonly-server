const db = require("../models/index.js");
const aws = require("aws-sdk");
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

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});

const paginate = ({ page, pageLimit }) => {
  const offset = page * pageLimit;
  const limit = pageLimit;

  return {
    offset,
    limit,
  };
};

const createAsset = async (vaultId, uploaderId, type, data) => {
  try {
    if (!vaultId || !uploaderId || !type || !data) {
      throw "Incorrect parameters passed to create an asset";
    }

    // Encrypt the url
    const encryptedData = await encrypt(JSON.stringify(data));

    // Create Asset & add to VaultAssets
    const result = await db.sequelize.transaction(async (t) => {
      const assetData = await db.Asset.create(
        {
          uploaderId: uploaderId,
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
  const parsedMessage = JSON.parse(decryptMessage);
  return { ...obj, data: parsedMessage };
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

const getAssetsByMemberId = async (memberId) => {
  try {
    const data = await db.Asset.findAndCountAll({
      attributes: ["id", "type", "data", "createdAt"],
      where: { uploaderId: memberId },
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

const deleteAsset = async (assetId, assetKey) => {
  const params = { Bucket: process.env.AWS_BUCKET, Key: assetKey };
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

      if (assetKey) {
        await s3.deleteObject(params, (err, data) => {
          if (err) throw err;
        });
      }

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
    const decryptedObjs = await Promise.all(
      data.map(async (x) => decryptMessage(x))
    );
    const keys = decryptedObjs.map((x) => {
      return {
        Key: x.data.key,
      };
    });

    await db.VaultAsset.destroy({ where: { id: deleteIds } });
    await db.Asset.destroy({ where: { id: deleteIds } });

    s3.deleteObjects(
      { Bucket: process.env.AWS_BUCKET, Delete: { Objects: keys } },
      (err, data) => {
        if (err) throw err;
      }
    );

    return { message: "All vault assets have been deleted" };
  } catch (err) {
    throw "Unable to delete the assets";
  }
};

const deleteAssetsByMemberId = async (memberId) => {
  try {
    const data = await db.Asset.findAll({
      where: { uploaderId: memberId },
      ...configOptions,
    });
    const deleteIds = data.map((x) => x.id);
    const decryptedObjs = await Promise.all(
      data.map(async (x) => decryptMessage(x))
    );
    const keys = decryptedObjs.map((x) => {
      return {
        Key: x.data.key,
      };
    });

    await db.VaultAsset.destroy({ where: { id: deleteIds } });
    await db.Asset.destroy({ where: { id: deleteIds } });

    if (!_.isEmpty(keys)) {
      s3.deleteObjects(
        { Bucket: process.env.AWS_BUCKET, Delete: { Objects: keys } },
        (err, data) => {
          if (err) throw err;
        }
      );
    }

    return { message: "All vault assets have been deleted for this member" };
  } catch (err) {
    throw "Unable to delete the assets";
  }
};

// TODO: Delet assets in vault by member id

exports.createAsset = createAsset;
exports.getAssetsByVaultId = getAssetsByVaultId;
exports.getAssetsByMemberId = getAssetsByMemberId;
exports.deleteAsset = deleteAsset;
exports.deleteAssetsByVaultId = deleteAssetsByVaultId;
exports.deleteAssetsByMemberId = deleteAssetsByMemberId;
