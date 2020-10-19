const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const passport = require("passport");
const { Magic } = require("@magic-sdk/admin");
const MagicStrategy = require("passport-magic").Strategy;

const friend = require("../controllers/friend");

/* 1️⃣ Setup Magic Admin SDK */
const magic = new Magic("sk_test_181E705F674542C3");

/* 2️⃣ Implement Auth Strategy */

const strategy = new MagicStrategy(async (user, done) => {
  const userMetadata = await magic.users.getMetadataByIssuer(user.issuer);
  const existingUser = await friend.findMemberByIssuer(user.issuer);
  if (!existingUser) {
    /* Create new user if doesn't exist */
    return signup(user, userMetadata, done);
  } else {
    /* Login user if otherwise */
    return login(user, done);
  }
});

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

/* calls our MagicStrategy when a user logs in */
passport.use(strategy);

/* 3️⃣ Implement Auth Behaviors */

/* create a new user in the database */
const signup = async (user, userMetadata, done) => {
  console.log("PASSPORT SIGNUP USER");
  const newUser = await friend.createMember(
    user.issuer,
    userMetadata.email,
    user.claim.iat
  );
  return done(null, newUser);
};

/* update user's lastLoginAt time in database */
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

/* 4️⃣ Implement Session Behavior */

/* Defines what data/cookies are stored in the user session */
passport.serializeUser((user, done) => {
  console.log("IN SERIALIZE", user);
  done(null, user);
});

/* Populates user data in the req.user object */
passport.deserializeUser(async (user, done) => {
  try {
    const newUser = await friend.findMemberByIssuer(user.issuer);
    console.log("IN DESERIALIZE", newUser);
    done(null, newUser);
  } catch (err) {
    done(err, null);
  }
});

/* route to check if the user is authenticated */
router.get("/member/check", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ authorized: false });
  } else {
    return res.json({ authorized: true, user: req.user });
  }
});

/* Attach middleware to login endpoint */
router.post("/login", passport.authenticate("magic"), async (req, res) => {
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
  return res.json({ authorized: true, user: userMetadata });
});

router.get("/logout", (req, res) => {
  req.logout();
  return res.json({ authorized: false });
});

module.exports = router;
