const db = require("../models/index.js");
let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
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
const getClosestVaultByLocation = async (coordinates) => {
  const data = await db.sequelize.query(
    `select *, ST_Distance(location, ST_MakePoint(:latitude,:longitude)::geography) from "Vaults" where ST_DWithin(location, ST_MakePoint(:latitude,:longitude)::geography, :range) order by ST_Distance(location, ST_MakePoint(:latitude,:longitude)::geography) limit :limit;`,
    {
      replacements: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        range: 80,
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

exports.getVaultsByFriendId = getVaultsByFriendId;
exports.getAllVaults = getAllVaults;
exports.createVault = createVault;
exports.getClosestVaultByLocation = getClosestVaultByLocation;
