const express = require("express");
const router = express.Router();
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const userRouter = require("./src/routes/user");
const cors = require("cors");
const MagicStrategy = require("passport-magic").Strategy;
const { Magic } = require("@magic-sdk/admin");
const app = express();
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const db = require("./src/models/index.js");

const PORT = 8080;
const friend = require("./src/controllers/friend");
const vault = require("./src/controllers/vault");

app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }));
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.ENCRYPTION_SECRET,
    resave: false, // don't resave session variables if nothing has changed
    saveUninitialized: true, // save empty value in session if there is no value
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: false, // set true for HTTPS only.
      sameSite: false,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/", userRouter);
app.use(router);

////////// Members //////////

// GET Members of a specific vault
router.get("/vaults/:vaultId/members", async (req, res) => {
  console.log("REQ", req.session);
  const { vaultId } = req.params;
  try {
    let data = await friend.getFriendsByVaultId(vaultId);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// GET all Members
router.get("/members", async (req, res) => {
  try {
    let data = await friend.getAllFriends();
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// POST Create a member
router.post("/members", async (req, res) => {
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
router.get("/vaults/:vaultId", async (req, res) => {
  const { vaultId } = req.params;
  try {
    const data = await vault.getVaultById(vaultId);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// GET QRCode to invite member
router.get("/vaults/member/invite", async (req, res) => {
  const { vaultId, vaultKey } = req.query;
  try {
    const data = await vault.getVaultInviteQRCode(vaultId, vaultKey);
    res.json({ data: data });
  } catch (err) {
    res.status(400).send({ error: err });
  }
});

// POST Validate QRCode to invite member
router.post("/vaults/member/validate", async (req, res) => {
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
router.get("/friends/:friendId/vaults", async (req, res) => {
  const { friendId } = req.params;
  try {
    const data = await vault.getVaultsByFriendId(friendId);
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// TODO: GET all Vaults (Maybe not needed client facing)
router.get("/vaults", async (req, res) => {
  try {
    const data = await vault.getAllVaults();
    res.json({ data: data });
  } catch (err) {
    res.status(404).send({ error: err });
  }
});

// GET Closest Vault to Friend
router.get("/vaults/member/nearby", async (req, res) => {
  const { friendId, latitude, longitude } = req.query;
  const data = await vault.getClosestVaultById(friendId, {
    latitude: latitude,
    longitude: longitude,
  });
  res.json({ data: data });
});

// POST Create a vault (and add member to that vault)
router.post("/vaults", async (req, res) => {
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
router.post("/vaults/members", async (req, res) => {
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
