const request = require("supertest");
const app = require("../service");
const { makeTestUser, registerUser, getAdminToken } = require("./testHelpers");

let testAdminAuthToken, testUserAuthToken;

const testUser = makeTestUser();

const testPizza = {
  title: "testPizza",
  description: "just a test",
  image: "notreal.png",
  price: 0.01,
};

beforeAll(async () => {
  ({ token: testUserAuthToken } = await registerUser(testUser));
  testAdminAuthToken = await getAdminToken();
});

describe("orderRouter", () => {
  describe("getMenu", () => {
    it("returns proper menu", async () => {
      await request(app)
        .put("/api/order/menu")
        .set({ Authorization: `Bearer ${testAdminAuthToken}` })
        .send(testPizza);
      const getMenuRes = await request(app).get("/api/order/menu");
      expect(getMenuRes.status).toBe(200);
      expect(getMenuRes.body.some((m) => m.title === testPizza.title)).toBe(
        true,
      );
    });
  });

  describe("addMenuItem", () => {
    it("rejects when user is unauthorized", async () => {
      const res = await request(app)
        .put("/api/order/menu")
        .set({ Authorization: `Bearer ${testUserAuthToken}` })
        .send(testPizza);

      expect(res.status).toBe(403);
    });
  });

  describe("createOrder", () => {
    it("rejects when unauthorized", async () => {
      const res = await request(app).post("/api/order").send({
        franchiseId: 1,
        storeId: 1,
        items: [],
      });

      expect(res.status).toBe(401);
    });
    //TODO: add authorized test
  });
});
