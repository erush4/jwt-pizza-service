const request = require("supertest");
const app = require("../service");
const config = require("../config");

const testStore = { name: "test store " };

let i = 0;
function makeTestUser() {
  i++;
  return {
    name: `user ${i}`,
    email: "reg@test.com",
    password: Math.random().toString(36).slice(2),
  };
}

function makeTestFranchise(email) {
  return {
    stores: [],
    id: "",
    name: "test franchise ",
    admins: [{ email: email }],
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

async function createFranchise(adminToken, testFranchise, status = 200) {
  testFranchise.name += "I";
  const createFranchiseRes = await request(app)
    .post("/api/franchise/")
    .set({ Authorization: `Bearer ${adminToken}` })
    .send(testFranchise);
  expect(createFranchiseRes.status).toBe(status);
  return createFranchiseRes;
}

async function createStore(
  franchiseAuthtoken,
  franchiseInstance,
  status = 200,
) {
  testStore.name += "I";
  const createStoreRes = await request(app)
    .post(`/api/franchise/${franchiseInstance.id}/store`)
    .set({ Authorization: `Bearer ${franchiseAuthtoken}` })
    .send({ name: testStore.name });
  expect(createStoreRes.status).toBe(status);
  return createStoreRes; //body is testStore
}

module.exports = {
  makeTestUser,
  registerUser,
  getAdminToken,
  createFranchise,
  createStore,
  testStore,
  makeTestFranchise,
};
