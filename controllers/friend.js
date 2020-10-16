const db = require("../models/index.js");

const getFriendsByVaultId = async (vaultId) => {
  const data = await db.Friend.findAll({
    raw: true,
    nest: true,
    attributes: ["id", "email", "key"],
    include: [
      {
        model: db.Vault,
        where: { id: vaultId },
        attributes: [],
      },
    ],
    order: [["id", "ASC"]],
  });

  return data;
};

const getAllFriends = async () => {
  const data = await db.Friend.findAll({
    raw: true,
    nest: true,
    attributes: ["id", "email", "key"],
    order: [["id", "ASC"]],
  });

  return data;
};

exports.getFriendsByVaultId = getFriendsByVaultId;
exports.getAllFriends = getAllFriends;
