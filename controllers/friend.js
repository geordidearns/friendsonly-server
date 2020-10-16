const db = require("../models/index.js");
let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

const getFriendsByVaultId = async (vaultId) => {
  const data = await db.Friend.findAll({
    attributes: ["id", "email", "key"],
    include: [
      {
        model: db.Vault,
        where: { id: vaultId },
        attributes: [],
      },
    ],
    ...configOptions,
  });

  return data;
};

const getAllFriends = async () => {
  const data = await db.Friend.findAll({
    attributes: ["id", "email", "key"],
    ...configOptions,
  });

  return data;
};

exports.getFriendsByVaultId = getFriendsByVaultId;
exports.getAllFriends = getAllFriends;
