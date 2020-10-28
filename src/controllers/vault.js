const db = require("../models/index.js");
const _ = require("lodash");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const {
  uniqueNamesGenerator,
  adjectives,
  animals,
} = require("unique-names-generator");

const asset = require("./asset.js");

let configOptions = {
  raw: true,
  nest: true,
  benchmark: true,
  order: [["id", "ASC"]],
};

// let randomVaultName = uniqueNamesGenerator({
//   dictionaries: [adjectives, animals],
//   separator: "-",
//   length: 2,
// });

const getVaultById = async (vaultId) => {
  try {
    const data = await db.Vault.findOne({
      attributes: ["id", "key", "name", "location", "updatedAt"],
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

const getVaultsByMemberId = async (memberId) => {
  try {
    const data = await db.Vault.findAll({
      attributes: ["id", "key", "name", "location", "updatedAt"],
      include: [
        {
          model: db.Member,
          where: { id: memberId },
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
const getClosestVaultById = async (memberId, coordinates) => {
  try {
    if (!memberId || _.isEmpty(coordinates)) {
      throw "Incorrect parameters passed to find the nearest Vault";
    }
    const data = await db.sequelize.query(
      `select distinct
        "Vaults".id, "Vaults".key, "Vaults".name, "Vaults".location, ST_Distance(location, ST_MakePoint(:latitude,:longitude)::geography)
      from 
      "Vaults", "VaultMembers", "Members" where ST_DWithin(location, ST_MakePoint(:latitude,:longitude)::geography, :range) 
      and 
      "Vaults".id = "VaultMembers"."vaultId" 
      and 
      "VaultMembers"."memberId" = :memberId  
      order by 
      ST_Distance(location, ST_MakePoint(:latitude,:longitude)::geography) 
      limit :limit;`,
      {
        type: db.sequelize.QueryTypes.SELECT,
        replacements: {
          memberId: memberId,
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
      attributes: ["id", "key", "name", "location"],
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
        attributes: ["id", "key", "name", "location"],
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

const createVault = async (memberId, name, coordinates) => {
  const point = { type: "Point", coordinates: coordinates };
  const vaultName = name
    ? name
    : uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: "-",
        length: 2,
      });
  const key = uuidv4();
  if (_.isEmpty(coordinates)) {
    throw "Unable to create Vault - No coordinates present";
  }
  try {
    // Create Vault & add creating Member (Does not create vault if no Member)
    const result = await db.sequelize.transaction(async (t) => {
      const vaultData = await db.Vault.create(
        {
          key: key,
          name: vaultName,
          location: point,
          creatorId: memberId,
        },
        { transaction: t }
      );
      await db.VaultMember.create(
        {
          vaultId: vaultData.id,
          memberId: memberId,
        },
        { transaction: t }
      );

      return vaultData;
    });

    return result;
  } catch (err) {
    throw `Vault cannot be created: ${err}`;
  }
};

const addMemberToVault = async (vaultId, memberId) => {
  try {
    if (!vaultId || !memberId) {
      throw "Incorrect parameters passed to add a member to a vault";
    }
    return await db.VaultMember.create({
      vaultId: vaultId,
      memberId: memberId,
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

const validateVaultInviteQRCode = async (vaultId, vaultKey, memberId) => {
  try {
    const newKey = uuidv4();
    const vault = await getVaultById(vaultId);
    if (vault.key !== vaultKey) {
      throw "This QR Code has been used before. Ask your friend to generate a new code to join this vault";
    }
    await addMemberToVault(vault.id, memberId);
    await updateVaultKey(vaultId, newKey);
  } catch (err) {
    throw err;
  }
};

const deleteVaultById = async (vaultId, memberId) => {
  try {
    const result = await db.sequelize.transaction(async (t) => {
      // Search if the member is the creator of the vault
      let Vault = await db.Vault.findOne(
        { where: { id: vaultId, creatorId: memberId }, ...configOptions },
        { transaction: t }
      );
      if (_.isEmpty(Vault)) {
        throw "Member cannot delete this vault";
      }
      // Delete all assets related to the Vault
      await asset.deleteAssetsByVaultId(vaultId);
      // Delete all the VaultMembers
      await db.VaultMember.destroy(
        {
          where: { vaultId: vaultId },
          ...configOptions,
        },
        { transaction: t }
      );
      // Delete the Vault
      await db.Vault.destroy(
        {
          where: { id: vaultId, creatorId: memberId },
          ...configOptions,
        },
        { transaction: t }
      );

      return { message: "Vault and its assets have been deleted" };
    });

    return result;
  } catch (err) {
    throw "Unable to delete the vault";
  }
};

// const deleteVaultById = async (vaultId, memberId) => {
//   try {
//     const result = await db.sequelize.transaction(async (t) => {
//       await db.VaultMember.destroy(
//         {
//           where: { vaultId: vaultId },
//           ...configOptions,
//         },
//         { transaction: t }
//       );

//       await db.Vault.destroy(
//         {
//           where: { id: vaultId, creatorId: memberId },
//           ...configOptions,
//         },
//         { transaction: t }
//       );
//     });

//     return result;
//   } catch (err) {
//     throw "Unable to delete the vault";
//   }
// };

exports.getVaultById = getVaultById;
exports.getVaultsByMemberId = getVaultsByMemberId;
exports.getAllVaults = getAllVaults;
exports.createVault = createVault;
exports.getClosestVaultById = getClosestVaultById;
exports.addMemberToVault = addMemberToVault;
exports.getVaultInviteQRCode = getVaultInviteQRCode;
exports.validateVaultInviteQRCode = validateVaultInviteQRCode;
exports.deleteVaultById = deleteVaultById;
