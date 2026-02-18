const request = require("supertest");
const app = require("../service");
const { makeTestUser, registerUser, getAdminToken } = require("./testHelpers");

let testUserAuthToken, testUserId;
let testFranchiseAuthtoken, testAdminAuthToken;
const testFranchiseUser = makeTestUser();
const testUser = makeTestUser();

beforeAll(async () => {
  ({ token: testUserAuthToken, id: testUserId } = await registerUser(testUser));
  ({ token: testFranchiseAuthtoken } = await registerUser(testFranchiseUser));
});

describe("userRouter", () => {
  describe("getUser", () => {
    it("returns the right user", async () => {
      const getUserRes = await request(app)
        .get("/api/user/me")
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(getUserRes.status).toBe(200);
      //returns appropriate user object
      expect(getUserRes.body.id).toBe(testUserId);
    });
  });

  describe("updateUser", () => {
    it("properly updates the user", async () => {
      const updatedUser = {
        name: "new Name",
        email: testUser.email,
        password: "a",
      };
      const updateUserRes = await request(app)
        .put(`/api/user/${testUserId}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` })
        .send(updatedUser);

      expect(updateUserRes.status).toBe(200);
      //name has updated
      expect(updateUserRes.body.user.name).toBe(updatedUser.name);
      //else remains the same
      expect(updateUserRes.body.user.email).toBe(updatedUser.email);
      expect(updateUserRes.body.user.id).toBe(testUserId);
      //keep authtoken consistent
      testUserAuthToken = updateUserRes.body.token;

      //update back to avoid issues with other tests
      const undoRes = await request(app)
        .put(`/api/user/${testUserId}`)
        .set({ Authorization: `Bearer ${testUserAuthToken}` })
        .send(testUser);
      testUserAuthToken = undoRes.body.token;
    });

    it("fails when not user or admin", async () => {
      const updatedUser = {
        name: "new Name",
        email: testUser.email,
        password: "a",
      };
      const updateUserRes = await request(app)
        .put(`/api/user/${testUserId}`)
        .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` })
        .send(updatedUser);
      expect(updateUserRes.status).toBe(403);

      // user is not changing
      const getUserRes = await request(app)
        .get("/api/user/me")
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(getUserRes.body.name).toBe(testUser.name);
    });

    // TODO: adjust to ensure emails cannot be registered to two users!!!
  });

  describe("list users", () => {
    test("list users unauthorized", async () => {
      const listUsersRes = await request(app).get("/api/user");
      expect(listUsersRes.status).toBe(401);
    });

    test("list users bad auth", async () => {
      const listUsersRes = await request(app)
        .get("/api/user")
        .set("Authorization", "Bearer " + testUserAuthToken);
      expect(listUsersRes.status).toBe(403);
    });

    test("list users", async () => {
      const testAdminAuthToken = await getAdminToken();
      const listUsersRes = await request(app)
        .get("/api/user")
        .set("Authorization", "Bearer " + testAdminAuthToken);
      expect(listUsersRes.status).toBe(200);
    });
  });
});
