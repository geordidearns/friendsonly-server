const db = require("../models/index.js");
const _ = require("lodash");
let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

const getMembersByVaultId = async (vaultId) => {
  try {
    const data = await db.Member.findAll({
      attributes: ["id", "email"],
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

const getAllMembers = async () => {
  try {
    const data = await db.Member.findAll({
      attributes: ["id", "email"],
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

const createMember = async (issuer, email, lastLoginAt) => {
  try {
    if (!issuer || !email || !lastLoginAt) {
      throw "Incorrect parameters passed to create a member";
    }
    return await db.Member.create({
      issuer,
      email,
      lastLoginAt,
    });
  } catch (err) {
    throw err;
  }
};

const findMemberByIssuer = async (issuer) => {
  try {
    if (!issuer) {
      throw "No issuer passed to find a member";
    }
    return await db.Member.findOne({
      attributes: ["id", "issuer", "email", "lastLoginAt"],
      where: { issuer: issuer },
      ...configOptions,
    });
  } catch (err) {
    throw err;
  }
};

const updateMemberByIssuer = async (issuer, properties, isSilent) => {
  try {
    return await db.Member.update(properties, {
      attributes: ["id", "issuer", "email", "lastLoginAt"],
      where: {
        issuer: issuer,
      },
      silent: isSilent,
      ...configOptions,
    });
  } catch (err) {
    throw "Unable to update member";
  }
};

const updateMember = async (memberId, properties, isSilent) => {
  try {
    return await db.Member.update(properties, {
      attributes: ["id", "issuer", "email", "lastLoginAt"],
      where: {
        id: memberId,
      },
      silent: isSilent,
      ...configOptions,
    });
  } catch (err) {
    throw "Unable to update member";
  }
};

exports.getMembersByVaultId = getMembersByVaultId;
exports.getAllMembers = getAllMembers;
exports.createMember = createMember;
exports.findMemberByIssuer = findMemberByIssuer;
exports.updateMemberByIssuer = updateMemberByIssuer;
exports.updateMember = updateMember;
