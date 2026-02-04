// print-config.js
const config = require("./src/config.js");

console.log(
  JSON.stringify({
    adminEmail: config.defaultAdmin.email,
    adminPassword: config.defaultAdmin.password,
    dinerEmail: config.testUsers.diner.email,
    dinerPassword: config.testUsers.diner.password,
    franchiseEmail: config.testUsers.franchisee.email,
    franchisePassword: config.testUsers.franchisee.password,
  }),
);
