"use strict";
const { v4: uuidv4 } = require("uuid");
let members = [];

const insertMembers = async () => {
  for (var i = 0; i < 1000; i++) {
    members.push({
      issuer: uuidv4(),
      email: `geordi@${uuidv4()}.com`,
      key: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await insertMembers();
    queryInterface.bulkInsert("Members", members);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("Members", null, {});
  },
};
