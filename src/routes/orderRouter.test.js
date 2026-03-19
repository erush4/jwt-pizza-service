const request = require("supertest");
const app = require("../service");
const {
  makeTestUser,
  registerUser,
  getAdminToken,
  // createFranchise,
  // createStore,
  // makeTestFranchise,
} = require("./testHelpers");

let testAdminAuthToken, testUserAuthToken;
// let testFranchiseAuthtoken;

// const testFranchiseUser = makeTestUser();
const testUser = makeTestUser();

// let testFranchiseInstance, testStoreInstance;
// let testFranchise;

const testPizza = {
  title: "testPizza ",
  description: "just a test",
  image: "notreal.png",
  price: 0.01,
};

function getTestPizza() {
  testPizza.title += "I";
  return testPizza;
}

const testOrder = {
  franchiseId: 1,
  storeId: 1,
  items: [],
};

async function addMenuItem(authToken = testAdminAuthToken, status = 200) {
  const putItemRes = await request(app)
    .put("/api/order/menu")
    .set({Authorization: `Bearer ${authToken}`})
    .send(getTestPizza());
  if (putItemRes.status !== status) {
    throw new Error(`status ${putItemRes.status} did not match expected status ${status}.\nResponse Body: ${putItemRes.body}`);
  }
  if (status !== 200) return;
  const getMenuRes = await request(app).get("/api/order/menu");
  expect(getMenuRes.status).toBe(200);
  return getMenuRes;
}

beforeAll(async () => {
  ({ token: testUserAuthToken } = await registerUser(testUser));
  // ({ token: testFranchiseAuthtoken } = await registerUser(testFranchiseUser));
  testAdminAuthToken = await getAdminToken();
  // testFranchise = makeTestFranchise(testFranchiseUser.email);
  // testFranchiseInstance = (
  //   await createFranchise(testAdminAuthToken, testFranchise)
  // ).body;
  // testStoreInstance = (
  //   await createStore(testFranchiseAuthtoken, testFranchiseInstance)
  // ).body;
});

describe("orderRouter", () => {
  describe("getMenu", () => {
    it("returns proper menu", async () => {
      await addMenuItem();
      const getMenuRes = await request(app).get("/api/order/menu");
      expect(getMenuRes.status).toBe(200);
      expect(getMenuRes.body.some((m) => m.title === testPizza.title)).toBe(
        true,
      );
    });
  });

  describe("addMenuItem", () => {
    it("rejects when user is not allowed", async () => {
      addMenuItem(testUserAuthToken, 403);
    });
  });

  describe("createOrder", () => {
    it("rejects when unauthorized", async () => {
      const res = await request(app).post("/api/order").send(testOrder);
      expect(res.status).toBe(401);
    });

    it("does the thing", async () => {}); //TODO: make sure the order is created
  });
});
