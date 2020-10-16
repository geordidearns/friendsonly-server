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

// GET Members of a specific vault
app.get("/vaults/:vaultId/friends", async (req, res) => {
  let data = await friend.getFriendsByVaultId(req.params.vaultId);
  res.json({ data: data });
});

// GET all Members
app.get("/friends", async (req, res) => {
  let data = await friend.getAllFriends();
  res.json({ data: data });
});

// GET Vaults of a specific friend
app.get("/friends/:friendId/vaults", async (req, res) => {
  let data = await vault.getVaultsByFriendId(req.params.friendId);
  res.json({ data: data });
});

// GET all Vaults
app.get("/vaults", async (req, res) => {
  let data = await vault.getAllVaults();
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
