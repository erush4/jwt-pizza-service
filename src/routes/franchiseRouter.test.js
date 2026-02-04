const request = require("supertest");
const {
  makeTestUser,
  makeTestFranchiseUser,
  registerUser,
  getAdminToken,
} = require("./testHelpers");
const app = require("../service");

let testAdminAuthToken;
let testUserAuthToken, testUserId;
let testFranchiseAuthtoken, testFranchiseUserId;
let testFranchise, testFranchiseInstance;
let testStoreInstance;

const testUser = makeTestUser();
const testFranchiseUser = makeTestFranchiseUser();
const testStoreName = "test store";

async function createFranchise() {
  testFranchise.name = testFranchise.name + "I";
  const createFranchiseRes = await request(app)
    .post("/api/franchise/")
    .set({ Authorization: `Bearer ${testAdminAuthToken}` })
    .send(testFranchise);
  expect(createFranchiseRes.status).toBe(200);
  testFranchiseInstance = createFranchiseRes.body;
  return createFranchiseRes;
}

async function createStore() {
  const createStoreRes = await request(app)
    .post(`/api/franchise/${testFranchiseInstance.id}/store`)
    .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` })
    .send({ name: testStoreName });
  expect(createStoreRes.status).toBe(200);
  testStoreInstance = createStoreRes.body;
}

beforeAll(async () => {
  ({ token: testUserAuthToken, id: testUserId } = await registerUser(testUser));
  ({ token: testFranchiseAuthtoken, id: testFranchiseUserId } =
    await registerUser(testFranchiseUser));
  testAdminAuthToken = await getAdminToken();
  testFranchise = {
    stores: [],
    id: "",
    name: "test franchise ",
    admins: [{ email: testFranchiseUser.email }],
  };
});

describe("franchiseRouter", () => {
  describe("getFranchises", () => {
    it("returns something", async () => {
      const getFranchiseRes = await request(app).get("/api/franchise/");
      expect(getFranchiseRes.status).toBe(200);
      expect(getFranchiseRes.body.franchises).toEqual(expect.any(Array));
    });

    //TODO: Ensure returns are appropriate if franchises exist
  });

  describe("getUserFranchises", () => {
    it("returns empty when no franchises", async () => {
      const res = await request(app)
        .get(`/api/franchise/${testUserId}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it("returns appropriate franchise when one exists", async () => {
      await createFranchise();

      const res = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(res.status).toBe(200);

      const franchise = res.body.find((f) => f.id === testFranchiseInstance.id);
      expect(franchise).toBeDefined();

      // Ensure the correct admin is attached
      expect(franchise.admins.some((a) => a.id === testFranchiseUserId)).toBe(
        true,
      );
    });

    //TODO: ensure no additional franchises are returned
  });

  describe("createFranchise", () => {
    it("rejects when unauthorized", async () => {
      const createFranchiseRes = await request(app)
        .post("/api/franchise/")
        .set({ Authorization: `Bearer ${testUserAuthToken}` })
        .send(testFranchise);
      expect(createFranchiseRes.status).toBe(403);
    });

    it("properly creates when authorized", async () => {
      await createFranchise();
      expect(testFranchiseInstance).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: testFranchise.name,
          stores: [],
          admins: expect.arrayContaining([
            expect.objectContaining({
              email: testFranchiseUser.email,
              name: testFranchiseUser.name,
              id: testFranchiseUserId,
            }),
          ]),
        }),
      );
    });

    //TODO: test that franchisee role is added to user
  });

  describe("deleteFranchise", () => {
    it("rejects when unauthorized", async () => {
      await createFranchise();

      const deleteRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(deleteRes.status).toBe(403);

      const getRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(getRes.status).toBe(200);

      // Franchise still exists
      expect(getRes.body.some((f) => f.id === testFranchiseInstance.id)).toBe(
        true,
      );
    });

    it("accepts when authorized", async () => {
      await createFranchise();
      const deleteFranchiseRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(deleteFranchiseRes.status).toBe(200);
      const getUserFranchiseRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(getUserFranchiseRes.status).toBe(200);
      expect(
        getUserFranchiseRes.body.find((f) => f.id === testFranchiseInstance.id),
      ).toBeUndefined();
    });

    //TODO: test that franchisee role is removed when needed
    //TODO: ensure that only one franchise is deleted
  });

  describe("createStore", () => {
    it("rejects when unauthorized", async () => {
      await createFranchise();

      const res = await request(app)
        .post(`/api/franchise/${testFranchiseInstance.id}/store`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` })
        .send({ name: testStoreName });

      expect(res.status).toBe(403);
    });

    it("properly creates when authorized", async () => {
      await createFranchise();

      await createStore();

      expect(testStoreInstance).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: testStoreName,
        }),
      );

      // Confirm the store appears in the franchise
      const getRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      const franchise = getRes.body.find(
        (f) => f.id === testFranchiseInstance.id,
      );
      expect(franchise).toBeDefined();
      expect(franchise.stores.some((s) => s.id === testStoreInstance.id)).toBe(
        true,
      );
    });
  });

  describe("deleteStore", () => {
    it("rejects when unauthorized", async () => {
      await createFranchise();
      await createStore();

      const storeId = testStoreInstance.id;

      const deleteRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}/store/${storeId}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` });
      expect(deleteRes.status).toBe(403);

      // Confirm store still exists
      const getRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      const franchise = getRes.body.find(
        (f) => f.id === testFranchiseInstance.id,
      );
      expect(franchise).toBeDefined();
      expect(franchise.stores.some((s) => s.id === storeId)).toBe(true);
    });

    it("accepts when authorized", async () => {
      await createFranchise();
      await createStore();

      const storeId = testStoreInstance.id;
      const deleteRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}/store/${storeId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(deleteRes.status).toBe(200);

      // Confirm store is gone
      const getRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      const franchise = getRes.body.find(
        (f) => f.id === testFranchiseInstance.id,
      );
      expect(franchise).toBeDefined();
      expect(franchise.stores.find((s) => s.id === storeId)).toBeUndefined();
    });

    //TODO: ensure that only the right store is deleted
  });
});
