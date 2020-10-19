const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const app = express();
const { v4: uuidv4 } = require("uuid");
const db = require("./src/models/index.js");
const logger = require("./src/config/logger.js");
require("dotenv").config();

const PORT = 8080;

const membersRouter = require("./src/routes/members");
const vaultsRouter = require("./src/routes/vaults");

app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }));
app.set("trust proxy", 1);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  session({
    genid: () => uuidv4(),
    secret: process.env.ENCRYPTION_SECRET,
    resave: false, // don't resave session variables if nothing has changed
    saveUninitialized: false, // save empty value in session if there is no value
    rolling: true,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // TODO: Decide on session length7 days
      secure: false, // TODO: set true for HTTPS only in Prod.
      sameSite: false,
    },
    store: db.sessionStore,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/members", membersRouter);
app.use("/vaults", vaultsRouter);

const assertDatabaseConnectionOk = async () => {
  logger.log({
    level: "info",
    message: "Checking database connection...",
  });
  try {
    await db.sequelize.authenticate();
    logger.log({
      level: "debug",
      message: "Database connection established",
    });
  } catch (error) {
    logger.log({
      level: "error",
      message: `Unable to connect to the database: ${error.message}`,
    });
    process.exit(1);
  }
};

const init = async () => {
  await assertDatabaseConnectionOk();
  app.listen(PORT, () => {
    logger.log({
      level: "debug",
      message: `friendsonly is running on port ${PORT}.`,
    });
  });
};

init();
