const db = require("../models/index.js");
const _ = require("lodash");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

const getVaultById = async (vaultId) => {
  try {
    const data = await db.Vault.findOne({
      attributes: ["id", "key", "location", "updatedAt"],
      where: { id: vaultId },
      ...configOptions,
    });

    if (_.isEmpty(data)) {
      throw "Vault not found";
    }

    return data;
  } catch (err) {
    throw err;
  }
};

const getVaultsByFriendId = async (friendId) => {
  try {
    const data = await db.Vault.findAll({
      attributes: ["id", "key", "location", "updatedAt"],
      include: [
        {
          model: db.Friend,
          where: { id: friendId },
          attributes: [],
        },
      ],
      ...configOptions,
    });

    if (_.isEmpty(data)) {
      throw "No Vaults linked to this member";
    }

    return data;
  } catch (err) {
    throw err;
  }
};

// Pass in latitude and longitude from client in query params
const getClosestVaultById = async (friendId, coordinates) => {
  try {
    if (!friendId || _.isEmpty(coordinates)) {
      throw "Incorrect parameters passed to find the nearest Vault";
    }
    const data = await db.sequelize.query(
      `select distinct
        "Vaults".id, "Vaults".key, "Vaults".location, ST_Distance(location, ST_MakePoint(:latitude,:longitude)::geography)
      from 
      "Vaults", "VaultFriends", "Friends" where ST_DWithin(location, ST_MakePoint(:latitude,:longitude)::geography, :range) 
      and 
      "Vaults".id = "VaultFriends"."vaultId" 
      and 
      "VaultFriends"."friendId" = :friendId  
      order by 
      ST_Distance(location, ST_MakePoint(:latitude,:longitude)::geography) 
      limit :limit;`,
      {
        replacements: {
          friendId: friendId,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          range: 20,
          limit: 5,
        },
        ...configOptions,
      }
    );

    return data;
  } catch (err) {
    throw err;
  }
};

const getAllVaults = async () => {
  try {
    const data = await db.Vault.findAll({
      attributes: ["id", "key", "location"],
      ...configOptions,
    });

    if (_.isEmpty(data)) {
      throw "No Vaults found";
    }

    return data;
  } catch (err) {
    throw err;
  }
};

const updateVaultKey = async (vaultId, newKey) => {
  try {
    return await db.Vault.update(
      { key: newKey },
      {
        attributes: ["id", "key", "location"],
        where: {
          id: vaultId,
        },
        ...configOptions,
      }
    );
  } catch (err) {
    throw "Unable to update the Vault key";
  }
};

const createVault = async (userId, key, coordinates) => {
  const point = { type: "Point", coordinates: coordinates };
  if (_.isEmpty(coordinates)) {
    throw "Unable to create Vault - No coordinates present";
  }
  try {
    // Create Vault & add creating Member (Does not create vault if no Member)
    const result = await db.sequelize.transaction(async (t) => {
      const vaultData = await db.Vault.create(
        {
          key: key,
          location: point,
        },
        { transaction: t }
      );
      await db.VaultFriend.create(
        {
          vaultId: vaultData.id,
          friendId: userId,
        },
        { transaction: t }
      );

      return vaultData;
    });

    return result;
  } catch (err) {
    throw "Vault cannot be created";
  }
};

const addMemberToVault = async (vaultId, friendId) => {
  try {
    if (!vaultId || !friendId) {
      throw "Incorrect parameters passed to add a member to a vault";
    }
    return await db.VaultFriend.create({
      vaultId: vaultId,
      friendId: friendId,
    });
  } catch (err) {
    throw "Member is already in this vault";
  }
};

const getVaultInviteQRCode = async (vaultId, vaultKey) => {
  // On Client
  // ID: parseInt("id=1&key=c8d6038b-d500-4816-8628-a7ff2e5ef2c2".match(/id=([^&]*)/)[1]);
  // KEY: "id=1&key=c8d6038b-d500-4816-8628-a7ff2e5ef2c2".match(/key=([^&]*)/)[1];
  // To test it's UUID format: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test("c8d6038b-d500-4816-8628-a7ff2e5ef2c2")
  try {
    if (!vaultId || !vaultKey) {
      throw "Incorrect parameters passed to generate QR Code";
    }
    await getVaultById(vaultId);
    const data = await QRCode.toDataURL(`id=${vaultId}&key=${vaultKey}`);
    if (_.isEmpty(data)) {
      throw "Failed to generate QR Code";
    }
    return data;
  } catch (err) {
    throw err;
  }
};

const validateVaultInviteQRCode = async (vaultId, vaultKey, friendId) => {
  try {
    const newKey = uuidv4();
    const vault = await getVaultById(vaultId);
    if (vault.key !== vaultKey) {
      throw "This QR Code has been used before. Ask your friend to generate a new code to join this vault";
    }
    await addMemberToVault(vault.id, friendId);
    await updateVaultKey(vaultId, newKey);
  } catch (err) {
    throw err;
  }
};

exports.getVaultById = getVaultById;
exports.getVaultsByFriendId = getVaultsByFriendId;
exports.getAllVaults = getAllVaults;
exports.createVault = createVault;
exports.getClosestVaultById = getClosestVaultById;
exports.addMemberToVault = addMemberToVault;
exports.getVaultInviteQRCode = getVaultInviteQRCode;
exports.validateVaultInviteQRCode = validateVaultInviteQRCode;
