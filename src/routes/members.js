const express = require("express");
const router = express.Router();
const passport = require("passport");
const { Magic } = require("@magic-sdk/admin");
const MagicStrategy = require("passport-magic").Strategy;
const logger = require("../config/logger.js");
// Middleware to use for locking endpoints
const isAuthenticated = require("./utils/isAuthenticated");

const member = require("../controllers/member");
const vault = require("../controllers/vault");

/* 1️⃣ Setup Magic Admin SDK */
const magic = new Magic("sk_test_181E705F674542C3");

/* 2️⃣ Implement Auth Strategy */
const strategy = new MagicStrategy(async (user, done) => {
  const userMetadata = await magic.users.getMetadataByIssuer(user.issuer);
  const existingUser = await member.findMemberByIssuer(user.issuer);
  if (!existingUser) {
    /* Create new user if doesn't exist */
    logger.log({
      level: "info",
      message: "New member",
    });
    return signup(user, userMetadata, done);
  } else {
    /* Login user if otherwise */
    logger.log({
      level: "info",
      message: "Existing member",
    });
    return login(user, done);
  }
});

/* calls our MagicStrategy when a user logs in */
passport.use(strategy);

/* 3️⃣ Implement Auth Behaviors */

/* create a new user in the database */
const signup = async (user, userMetadata, done) => {
  logger.log({
    level: "info",
    message: "Member signup",
  });
  const newUser = await member.createMember(
    user.issuer,
    userMetadata.email,
    user.claim.iat
  );
  logger.log({
    level: "info",
    message: "Member created",
  });
  return done(null, newUser);
};

/* update user's lastLoginAt time in database */
const login = async (user, done) => {
  logger.log({
    level: "info",
    message: "Member login",
  });
  /* Replay attack protection (https://go.magic.link/replay-attack) */
  if (user.claim.iat <= user.lastLoginAt) {
    MemberAuth.error("Replay attack detected for member");
    return done(null, false, {
      message: `Replay attack detected for member ${user.issuer}}.`,
    });
  }
  await member.updateMemberByIssuer(
    user.issuer,
    {
      lastLoginAt: user.claim.iat,
    },
    true
  );
  logger.log({
    level: "info",
    message: "Member verified",
  });
  return done(null, user);
};

/* 4️⃣ Implement Session Behavior */

/* Defines what data/cookies are stored in the user session */
passport.serializeUser((user, done) => {
  done(null, user);
});

/* Populates user data in the req.user object */
passport.deserializeUser(async (user, done) => {
  try {
    const newUser = await member.findMemberByIssuer(user.issuer);
    done(null, newUser);
  } catch (err) {
    done(err, null);
  }
});

/* Attach middleware to login endpoint */
router.post("/login", passport.authenticate("magic"), async (req, res) => {
  logger.log({
    level: "info",
    message: "Member logging in",
  });
  /* strip token from Authorization header */
  let DIDT = req.headers.authorization.split(" ")[1];

  /* validate token to ensure request came from the issuer */
  await magic.token.validate(DIDT);

  /**
   * decode token to get claim obj with data, see https://docs.magic.link/admin-sdk/node-js/sdk/token-module/decode#returns
   *
   * `claim` will be in the form of
   * {
   * iat: 1595635806,
   * ext: 1595636706,
   * iss: 'did:ethr:0x84Ebf8BD2b35dA715A5351948f52ebcB57B7916A',
   * sub: 'LSZlrB5urQNFIXEXpTdVnI6BzwdJNJMlfqsEJvrCvRI=',
   * aud: 'did:magic:026e022c-9b57-42bf-95d4-997543be1c21',
   * nbf: 1595635806,
   * tid: 'aea69063-0665-41ca-a2e2-4ff36c734703',
   * add: '0xf6ee75197340d270156c25054a99edda0edfc0b491fe1b433c9360481c043992428c82ca8b341272ba81d8004ddfbf739dda2368743349db0b9f97f3293707aa1c'
   * }
   */
  let claim = magic.token.decode(DIDT)[1];

  /**
   * get user data from Magic
   *
   * `userMetadata` will be on the form of:
   * {
   * issuer: 'did:ethr:0x84Ebf7BD2b35aD715A5351948f52ebcB57B7916A',
   * publicAddress: '0x84Ebf7BD2b35aD715A5351948f52ebcB57B7916A',
   * email: 'example@gmail.com'
   * }
   */
  const userMetadata = await magic.users.getMetadataByIssuer(claim.iss);
  /* send back response with user obj */
  logger.log({
    level: "info",
    message: "Member authenticated",
  });
  return res.json({ authorized: true, user: userMetadata });
});

/* route to check if the user is authenticated */
router.get("/check", async (req, res) => {
  if (!req.isAuthenticated()) {
    logger.log({
      level: "info",
      message: "Member not authenticated",
    });
    return res.status(401).json({ authorized: false, error: "Not authorized" });
  } else {
    logger.log({
      level: "info",
      message: "Member authenticated",
    });
    return res.json({ authorized: true, user: req.user });
  }
});

router.get("/logout", (req, res) => {
  logger.log({
    level: "info",
    message: "Logging member out",
  });
  req.session.destroy((err) => {
    logger.log({
      level: "info",
      message: "Member logged out",
    });
    return res.json({ authorized: false });
  });
});

// GET all Members [Not for external use]
router.get("/all", async (req, res) => {
  try {
    let data = await member.getAllMembers();
    logger.log({
      level: "info",
      message: "Fetched all members",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "info",
      message: `Failed to fetch all members: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

// POST Create a member
router.post("/join", async (req, res) => {
  const { issuer, email, key } = req.body;
  try {
    let data = await member.createMember(issuer, email, key);
    logger.log({
      level: "info",
      message: "Created a member",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to create a member: ${err}`,
    });
    res.status(400).send({ error: err });
  }
});

// GET Vaults of a specific member
router.get("/:memberId/vaults", async (req, res) => {
  const { memberId } = req.params;
  try {
    const data = await vault.getVaultsByMemberId(memberId);
    logger.log({
      level: "info",
      message: "Fetched vaults for a specific member",
    });
    res.json({ data: data });
  } catch (err) {
    logger.log({
      level: "error",
      message: `Failed to vaults for a specific member: ${err}`,
    });
    res.status(404).send({ error: err });
  }
});

module.exports = router;
