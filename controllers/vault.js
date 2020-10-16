const db = require("../models/index.js");

const getVaultsByFriendId = async (friendId) => {
  const data = await db.Vault.findAll({
    raw: true,
    nest: true,
    attributes: ["id", "key", "location", "updatedAt"],
    include: [
      {
        model: db.Friend,
        where: { id: friendId },
        attributes: [],
      },
    ],
    order: [["id", "ASC"]],
  });

  return data;
};

const getAllVaults = async () => {
  const data = await db.Vault.findAll({
    raw: true,
    nest: true,
    attributes: ["id", "key", "location"],
    order: [["id", "ASC"]],
  });

  return data;
};

exports.getVaultsByFriendId = getVaultsByFriendId;
exports.getAllVaults = getAllVaults;
