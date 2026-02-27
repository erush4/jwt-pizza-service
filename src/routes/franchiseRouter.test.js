const request = require("supertest");
const {
  makeTestUser,
  registerUser,
  getAdminToken,
  createFranchise,
  createStore,
  testStore,
  makeTestFranchise,
} = require("./testHelpers");
const app = require("../service");

let testAdminAuthToken;
let testUserAuthToken, testUserId;
let testFranchiseAuthtoken, testFranchiseUserId;
let testFranchise;

const testUser = makeTestUser();
const testFranchiseUser = makeTestUser();

beforeAll(async () => {
  ({ token: testUserAuthToken, id: testUserId } = await registerUser(testUser));
  ({ token: testFranchiseAuthtoken, id: testFranchiseUserId } =
    await registerUser(testFranchiseUser));
  testAdminAuthToken = await getAdminToken();
  testFranchise = makeTestFranchise(testFranchiseUser.email);
});

describe("franchiseRouter", () => {
  describe("getFranchises", () => {
    it("returns something", async () => {
      const getFranchisesRes = await request(app).get("/api/franchise/");
      expect(getFranchisesRes.status).toBe(200);
      expect(getFranchisesRes.body.franchises).toEqual(expect.any(Array));
    });

    //TODO: Ensure returns are appropriate if franchises exist
  });

  describe("getUserFranchises", () => {
    it("returns empty when no franchises", async () => {
      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testUserId}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(getUserFranchisesRes.status).toBe(200);
      expect(getUserFranchisesRes.body).toHaveLength(0);
    });

    it("returns appropriate franchise when one exists", async () => {
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;

      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(getUserFranchisesRes.status).toBe(200);

      const franchise = getUserFranchisesRes.body.find(
        (f) => f.id === testFranchiseInstance.id,
      );
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
      await createFranchise(testUserAuthToken, testFranchise, 403);
    });

    it("properly creates when authorized", async () => {
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;
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
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;

      const deleteFranchiseRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(deleteFranchiseRes.status).toBe(403);

      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(getUserFranchisesRes.status).toBe(200);

      // Franchise still exists
      expect(
        getUserFranchisesRes.body.some(
          (f) => f.id === testFranchiseInstance.id,
        ),
      ).toBe(true);
    });

    it("accepts when authorized", async () => {
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;
      const deleteFranchiseRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(deleteFranchiseRes.status).toBe(200);
      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(getUserFranchisesRes.status).toBe(200);
      expect(
        getUserFranchisesRes.body.find(
          (f) => f.id === testFranchiseInstance.id,
        ),
      ).toBeUndefined();
    });

    //TODO: test that franchisee role is removed when needed
    //TODO: ensure that only one franchise is deleted
  });

  describe("createStore", () => {
    it("rejects when unauthorized", async () => {
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;

      await createStore(testUserAuthToken, testFranchiseInstance, 403);
    });

    it("properly creates when authorized", async () => {
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;
      const testStoreInstance = (
        await createStore(testFranchiseAuthtoken, testFranchiseInstance)
      ).body;

      expect(testStoreInstance).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: testStore.name,
        }),
      );

      // Confirm the store appears in the franchise
      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      const franchise = getUserFranchisesRes.body.find(
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
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;
      const testStoreInstance = (
        await createStore(testFranchiseAuthtoken, testFranchiseInstance)
      ).body;

      const storeId = testStoreInstance.id;

      const deleteRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}/store/${storeId}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` });
      expect(deleteRes.status).toBe(403);

      // Confirm store still exists
      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      const franchise = getUserFranchisesRes.body.find(
        (f) => f.id === testFranchiseInstance.id,
      );
      expect(franchise).toBeDefined();
      expect(franchise.stores.some((s) => s.id === storeId)).toBe(true);
    });

    it("accepts when authorized", async () => {
      const testFranchiseInstance = (
        await createFranchise(testAdminAuthToken, testFranchise)
      ).body;
      const testStoreInstance = (
        await createStore(testFranchiseAuthtoken, testFranchiseInstance)
      ).body;

      const storeId = testStoreInstance.id;
      const deleteRes = await request(app)
        .delete(`/api/franchise/${testFranchiseInstance.id}/store/${storeId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      expect(deleteRes.status).toBe(200);

      // Confirm store is gone
      const getUserFranchisesRes = await request(app)
        .get(`/api/franchise/${testFranchiseUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` });

      const franchise = getUserFranchisesRes.body.find(
        (f) => f.id === testFranchiseInstance.id,
      );
      expect(franchise).toBeDefined();
      expect(franchise.stores.find((s) => s.id === storeId)).toBeUndefined();
    });

    //TODO: ensure that only the right store is deleted
  });
});
