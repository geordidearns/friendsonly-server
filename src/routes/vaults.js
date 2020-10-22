const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const logger = require("../config/logger.js");
// Middleware to use for locking endpoints
const isAuthenticated = require("./utils/isAuthenticated");
// Encryption methods
const { encrypt } = require("./utils/crypto");

const vault = require("../controllers/vault");
const member = require("../controllers/member");
const asset = require("../controllers/asset");

// TODO: GET all Vaults (Not used external facing)
router.get("/all", async (req, res) => {
  try {
    const data = await vault.getAllVaults();
    logger.log({
      level: "info",
      message: "Fetched all vaults",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to fetch all vaults: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// TODO: GET Vault by ID (Not used external facing)
router.get("/:vaultId", async (req, res) => {
  const { vaultId } = req.params;
  try {
    const data = await vault.getVaultById(vaultId);
    logger.log({
      level: "info",
      message: "Fetched a vault by ID",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to fetch a vault: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// GET Create QRCode to invite member
router.get("/member/invite", async (req, res) => {
  const { vaultId, vaultKey } = req.query;
  try {
    const data = await vault.getVaultInviteQRCode(vaultId, vaultKey);
    logger.log({
      level: "info",
      message: "Generated a QR Code to invite a member",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to generate a QR Code to invite a member: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// POST Validate QRCode to invite member
router.post("/member/validate", async (req, res) => {
  const { vaultId, vaultKey, memberId } = req.body;
  try {
    await vault.validateVaultInviteQRCode(vaultId, vaultKey, memberId);
    logger.log({
      level: "info",
      message: "Validated a QR Code to invite a member",
    });
    return res.json({
      data: { message: "Member has been added to the vault" },
    });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to generate a QR Code to invite a member: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// GET Closest Vault to member
router.get("/member/nearby", async (req, res) => {
  const { memberId, latitude, longitude } = req.query;
  try {
    const data = await vault.getClosestVaultById(memberId, {
      latitude: latitude,
      longitude: longitude,
    });
    logger.log({
      level: "info",
      message: "Fetched the closest vault to a member",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to fetch closest the vault to a member: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// POST Create a vault (and add member to that vault)
router.post("/create", async (req, res) => {
  const { latitude, longitude, memberId } = req.body;
  const key = uuidv4();
  const coordinates = [latitude, longitude];
  try {
    const data = await vault.createVault(memberId, key, coordinates);
    logger.log({
      level: "info",
      message: "Created a vault",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to create a vault: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// POST Add a member to a vault
router.post("/members", async (req, res) => {
  const { vaultId, memberId } = req.body;
  try {
    const data = await vault.addMemberToVault(vaultId, memberId);
    logger.log({
      level: "info",
      message: "Added a member to a vault",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to add a member to a vault: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// GET Members of a specific vault
router.get("/:vaultId/members", async (req, res) => {
  const { vaultId } = req.params;
  try {
    let data = await member.getMembersByVaultId(vaultId);
    logger.log({
      level: "info",
      message: "Fetched members of a specific vault",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to fetch members of a specific vault: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// POST Create an asset in the vault(and add the asset to that vault)
router.post("/:vaultId/assets/create", async (req, res) => {
  const { vaultId } = req.params;
  const { message } = req.body;
  const hash = await encrypt(message);
  console.log("HASH HERE", hash);
  try {
    const data = await asset.createAsset(vaultId, hash);
    logger.log({
      level: "info",
      message: "Created an asset",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to create an asset: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// GET Assets of a specific vault
router.get("/:vaultId/assets", async (req, res) => {
  const { vaultId } = req.params;
  const { page, pageLimit } = req.query;
  try {
    let data = await asset.getAssetsByVaultId(vaultId, page, pageLimit);
    logger.log({
      level: "info",
      message: "Fetched assets of a specific vault",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to fetch assets of a specific vault: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// DELETE Asset from a specific vault
router.delete("/assets/:assetId", async (req, res) => {
  const { assetId } = req.params;
  try {
    let data = await asset.deleteAssetById(assetId);
    logger.log({
      level: "info",
      message: "Deleted asset",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to delete asset: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// DELETE All asset from a specific vault
router.delete("/:vaultId/assets", async (req, res) => {
  const { vaultId } = req.params;
  try {
    let data = await asset.deleteAssetsByVaultId(vaultId);
    logger.log({
      level: "info",
      message: "Deleting vault assets",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to delete vault assets: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// DELETE All assets of a specific member
router.delete("/members/:memberId/assets", async (req, res) => {
  const { memberId } = req.params;
  try {
    let data = await asset.deleteAssetsByMemberId(memberId);
    logger.log({
      level: "info",
      message: "Deleting all assets for a member",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to delete all assets for a member: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// DELETE A vault (creator only)
router.delete("/:vaultId/remove", async (req, res) => {
  const { vaultId } = req.params;
  const { memberId } = req.query;
  try {
    const data = await vault.deleteVaultById(vaultId, memberId);
    logger.log({
      level: "info",
      message: "Deleted vault and vault assets",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to delete vault: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

module.exports = router;
