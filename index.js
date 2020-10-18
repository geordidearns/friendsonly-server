const express = require("express");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MagicStrategy = require("passport-magic").Strategy;
const { Magic } = require("@magic-sdk/admin");
const app = express();
const router = express.Router();
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const db = require("./src/models/index.js");

const PORT = 8080;
const friend = require("./src/controllers/friend");
const vault = require("./src/controllers/vault");

var corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("not my cat's name"));
app.use(
  session({
    secret: "not my cat's name",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: false, // Uncomment this line to enforce HTTPS protocol.
      sameSite: true,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(router);

////////// AUTH HERE //////////

/* 1️⃣ Setup Magic Admin SDK */
const magic = new Magic(process.env.MAGIC_SECRET_KEY);

/* 2️⃣ Implement Auth Strategy */

const strategy = new MagicStrategy(async (user, done) => {
  const userMetadata = await magic.users.getMetadataByIssuer(user.issuer);
  const existingUser = await friend.findMemberByIssuer(user.issuer);
  if (!existingUser) {
    console.log("IN PASSPORT SIGNUP");
    /* Create new user if doesn't exist */
    return signup(user, userMetadata, done);
  } else {
    console.log("IN PASSPORT LOGIN");
    /* Login user if otherwise */
    return login(user, done);
  }
});

passport.use(strategy);

/* 3️⃣ Implement Auth Behaviors */

/* Implement User Signup */
const signup = async (user, userMetadata, done) => {
  console.log("PASSPORT SIGNUP USER");
  const newUser = await friend.createMember(
    user.issuer,
    userMetadata.email,
    user.claim.iat
  );
  return done(null, newUser);
};

/* Implement User Login */
const login = async (user, done) => {
  console.log("PASSPORT LOGIN USER");
  /* Replay attack protection (https://go.magic.link/replay-attack) */
  if (user.claim.iat <= user.lastLoginAt) {
    return done(null, false, {
      message: `Replay attack detected for user ${user.issuer}}.`,
    });
  }
  await friend.updateMemberByIssuer(
    user.issuer,
    {
      lastLoginAt: user.claim.iat,
    },
    true
  );
  return done(null, user);
};

/* Attach middleware to login endpoint */
router.post("/member/login", passport.authenticate("magic"), (req, res) => {
  console.log("REQ", req.isAuthenticated());
  if (req.user) {
    res.status(200).end("User is logged in.");
  } else {
    return res.status(401).end("Could not log user in.");
  }
});

/* Implement Get Data Endpoint */
router.get("/member/check", async (req, res) => {
  console.log("REQ", req.user);
  if (req.user) {
    return res.status(200).json(req.user).end();
  } else {
    return res.status(401).end(`User is not logged in.`);
  }
});

/* 4️⃣ Implement Session Behavior */

/* Defines what data are stored in the user session */
passport.serializeUser((user, done) => {
  console.log("IN SERIALIZE", user);
  done(null, user);
});

/* Populates user data in the req.user object */
passport.deserializeUser(async (user, done) => {
  try {
    const user = await friend.findMemberByIssuer(user.issuer);
    console.log("IN DESERIALIZE", user);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

/* Implement Logout Endpoint */
router.post("/member/logout", async (req, res) => {
  if (req.isAuthenticated()) {
    await magic.users.logoutByIssuer(req.user.issuer);
    req.logout();
    return res.status(200).end();
  } else {
    return res.status(401).end(`User is not logged in.`);
  }
});

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
