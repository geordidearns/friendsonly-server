const db = require("../models/index.js");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

const getVaultById = async (vaultId) => {
  const data = await db.Vault.findOne({
    attributes: ["id", "key", "location", "updatedAt"],
    where: { id: vaultId },
    ...configOptions,
  });

  return data;
};

const getVaultsByFriendId = async (friendId) => {
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

  return data;
};

// Pass in latitude and longitude from client in query params
const getClosestVaultById = async (friendId, coordinates) => {
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
};

const getAllVaults = async () => {
  const data = await db.Vault.findAll({
    attributes: ["id", "key", "location"],
    ...configOptions,
  });

  return data;
};

const updateVaultKey = async (vaultId, newKey) => {
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
};

const createVault = async (userId, key, coordinates) => {
  const point = { type: "Point", coordinates: coordinates };
  // Create vault
  const vaultData = await db.Vault.create({
    key: key,
    location: point,
  });
  // Create membership when creating vault
  await db.VaultFriend.create({
    vaultId: vaultData.id,
    friendId: userId,
  });

  return vaultData;
};

const addMemberToVault = async (vaultId, friendId) => {
  const data = await db.VaultFriend.create({
    vaultId: vaultId,
    friendId: friendId,
  });

  return data;
};

const getVaultInviteQRCode = async (vaultId, vaultKey) => {
  // On Client
  // ID: parseInt("id=1&key=c8d6038b-d500-4816-8628-a7ff2e5ef2c2".match(/id=([^&]*)/)[1]);
  // KEY: "id=1&key=c8d6038b-d500-4816-8628-a7ff2e5ef2c2".match(/key=([^&]*)/)[1];
  // To test it's UUID format: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test("c8d6038b-d500-4816-8628-a7ff2e5ef2c2")
  try {
    const newKey = uuidv4();
    const data = await QRCode.toDataURL(`id=${vaultId}&key=${vaultKey}`);
    await updateVaultKey(vaultId, newKey);

    return data;
  } catch (err) {
    console.error(err);
  }
};

const validateVaultInviteQRCode = async (vaultId, vaultKey, friendId) => {
  try {
    const vault = await getVaultById(vaultId);
    console.log("VAULT KEY", vault.key, vaultKey);
    // if (vault.key === vaultKey) {
    //   throw Error;
    // }
    console.log("ADDING MEMBER");
    await addMemberToVault(vault.id, friendId);

    return;
  } catch (err) {
    throw Error(err);
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
