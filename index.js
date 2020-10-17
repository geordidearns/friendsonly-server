const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
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
  let data = await friend.getFriendsByVaultId(req.params.vaultId);
  res.json({ data: data });
});

// GET all Members
app.get("/members", async (req, res) => {
  let data = await friend.getAllFriends();
  res.json({ data: data });
});

// POST Create a member
app.post("/members", async (req, res) => {
  let data = await friend.createMember(
    req.body.issuer,
    req.body.email,
    req.body.key
  );
  res.json({ data: data });
});

////////// Vaults //////////

// TODO: GET Vault by ID (Not used external facing yet)
app.get("/vaults/:vaultId", async (req, res) => {
  let data = await vault.getVaultById(req.params.vaultId);
  res.json({ data: data });
});

// GET QRCode to invite member
app.get("/vaults/member/invite", async (req, res) => {
  let data = await vault.getVaultInviteQRCode(
    req.query.vaultId,
    req.query.vaultKey
  );
  res.json({ data: data });
});

// POST Validate QRCode to invite member
app.post("/vaults/member/validate", async (req, res) => {
  try {
    const data = await vault.validateVaultInviteQRCode(
      req.body.vaultId,
      req.body.vaultKey
    );
    console.log("GOOD HERE");
    res.json({ data: data });
  } catch (err) {
    res.status(400).send("QR Code has been used before");
  }
});

// GET Vaults of a specific friend
app.get("/friends/:friendId/vaults", async (req, res) => {
  let data = await vault.getVaultsByFriendId(req.params.friendId);
  res.json({ data: data });
});

// TODO: GET all Vaults
app.get("/vaults", async (req, res) => {
  let data = await vault.getAllVaults();
  res.json({ data: data });
});

// GET Closest Vault to Friend
app.get("/vaults/nearby", async (req, res) => {
  let data = await vault.getClosestVaultById(req.query.friendId, {
    latitude: req.query.latitude,
    longitude: req.query.longitude,
  });
  res.json({ data: data });
});

// POST Create a vault (and add member to that vault)
app.post("/vaults", async (req, res) => {
  const coordinates = [req.body.latitude, req.body.longitude];
  let data = await vault.createVault(
    req.body.userId,
    req.body.key,
    coordinates
  );
  res.json({ data: data });
});

// Add a member to a vault
app.post("/vaults/members", async (req, res) => {
  let data = await vault.addMemberToVault(req.body.vaultId, req.body.friendId);
  res.json({ data: data });
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
