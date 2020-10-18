const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const app = express();
const db = require("./models/index.js");
const PORT = 8080;
require("dotenv").config();

const friend = require("./controllers/friend");
const vault = require("./controllers/vault");

var corsOptions = {
  origin: "http://localhost:8081",
};
app.use(cors(corsOptions));
// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

////////// Members //////////

// GET Members of a specific vault
app.get("/vaults/:vaultId/members", async (req, res) => {
  const { vaultId } = req.params;
  try {
    let data = await friend.getFriendsByVaultId(vaultId);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// GET all Members
app.get("/members", async (req, res) => {
  try {
    let data = await friend.getAllFriends();
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// POST Create a member
app.post("/members", async (req, res) => {
  const { issuer, email, key } = req.body;
  try {
    let data = await friend.createMember(issuer, email, key);
    res.json({ data: data });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

////////// Vaults //////////

// TODO: GET Vault by ID (Not used external facing yet)
app.get("/vaults/:vaultId", async (req, res) => {
  const { vaultId } = req.params;
  try {
    const data = await vault.getVaultById(vaultId);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// GET QRCode to invite member
app.get("/vaults/member/invite", async (req, res) => {
  const { vaultId, vaultKey } = req.query;
  try {
    const data = await vault.getVaultInviteQRCode(vaultId, vaultKey);
    res.json({ data: data });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

// POST Validate QRCode to invite member
app.post("/vaults/member/validate", async (req, res) => {
  try {
    const { vaultId, vaultKey, friendId } = req.body;
    await vault.validateVaultInviteQRCode(vaultId, vaultKey, friendId);

    return res.json({
      data: { message: "Member has been added to the vault" },
    });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

// GET Vaults of a specific friend
app.get("/friends/:friendId/vaults", async (req, res) => {
  const { friendId } = req.params;
  try {
    const data = await vault.getVaultsByFriendId(friendId);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// TODO: GET all Vaults (Maybe not needed client facing)
app.get("/vaults", async (req, res) => {
  try {
    const data = await vault.getAllVaults();
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// GET Closest Vault to Friend
app.get("/vaults/member/nearby", async (req, res) => {
  const { friendId, latitude, longitude } = req.query;
  const data = await vault.getClosestVaultById(friendId, {
    latitude: latitude,
    longitude: longitude,
  });
  res.json({ data: data });
});

// POST Create a vault (and add member to that vault)
app.post("/vaults", async (req, res) => {
  const { latitude, longitude, userId } = req.body;
  const key = uuidv4();
  const coordinates = [latitude, longitude];
  try {
    const data = await vault.createVault(userId, key, coordinates);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: "Member cannot be found" });
  }
});

// Add a member to a vault
app.post("/vaults/members", async (req, res) => {
  const { vaultId, friendId } = req.body;
  try {
    const data = await vault.addMemberToVault(vaultId, friendId);
    res.json({ data: data });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

async function assertDatabaseConnectionOk() {
  console.log(`Checking database connection...`);
  try {
    await db.sequelize.authenticate();
    console.log("Database connection OK!");
  } catch (error) {
    console.log("Unable to connect to the database:");
    console.log(error.message);
    process.exit(1);
  }
}

async function init() {
  await assertDatabaseConnectionOk();

  app.listen(PORT, () => {
    console.log(`friendsonly is running on port ${PORT}.`);
  });
}

init();
