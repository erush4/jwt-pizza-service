const request = require("supertest");
const app = require("../service");
const config = require("../config");

function makeTestUser() {
  return {
    name: "pizza diner",
    email: "reg@test.com",
    password: "a",
  };
}

function makeTestFranchiseUser() {
  return {
    name: "pizza franchise",
    email: "temp@test.com",
    password: "b",
  };
}
async function registerUser(user) {
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(200);
  const token = registerRes.body.token;
  const id = registerRes.body.user.id;
  return { token, id };
}

async function getAdminToken() {
  let testAdminAuthToken = (
    await request(app).put("/api/auth").send(config.defaultAdmin)
  ).body.token;
  return testAdminAuthToken;
}

module.exports = {
  makeTestUser,
  registerUser,
  getAdminToken,
  makeTestFranchiseUser,
};
