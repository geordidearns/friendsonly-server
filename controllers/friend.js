const db = require("../models/index.js");
const _ = require("lodash");
let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

const getFriendsByVaultId = async (vaultId) => {
  try {
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

    if (_.isEmpty(data)) {
      throw "No Members found";
    }

    return data;
  } catch (err) {
    throw err;
  }
};

const getAllFriends = async () => {
  try {
    const data = await db.Friend.findAll({
      attributes: ["id", "email", "key"],
      ...configOptions,
    });

    if (_.isEmpty(data)) {
      throw "No Members found";
    }

    return data;
  } catch (err) {
    throw err;
  }
};

const createMember = async (issuer, email, key) => {
  try {
    if (!issuer || !email || !key) {
      throw "Incorrect parameters passed to create a member";
    }
    return await db.Friend.create({
      issuer,
      email,
      key,
    });
  } catch (err) {
    throw err;
  }
};

exports.getFriendsByVaultId = getFriendsByVaultId;
exports.getAllFriends = getAllFriends;
exports.createMember = createMember;
