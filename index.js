const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

const db = require("./models/index.js");
const Vault = require("./models/vault.js");
const PORT = 8080;

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
  const data = await db.Friend.findAll({
    raw: true,
    nest: true,
    attributes: ["id", "email", "key"],
    include: [
      {
        model: db.Vault,
        where: { id: req.params.vaultId },
      },
    ],
    order: [["id", "ASC"]],
  });
  console.log("DATA", data);
  res.json({ message: "Welcome" });
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
