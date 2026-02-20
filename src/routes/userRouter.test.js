const request = require("supertest");
const app = require("../service");
const {
  makeTestUser,
  registerUser,
  getAdminToken,
  makeTestFranchise,
  createFranchise,
} = require("./testHelpers");
const { Role } = require("../database/database");
const config = require("../config");

let testUserAuthToken, testUserId;
let testFranchiseAuthtoken, testAdminAuthToken;
const testFranchiseUser = makeTestUser();
const testUser = makeTestUser();

beforeAll(async () => {
  ({ token: testUserAuthToken, id: testUserId } = await registerUser(testUser));
  ({ token: testFranchiseAuthtoken } = await registerUser(testFranchiseUser));
  testAdminAuthToken = await getAdminToken();
  await createFranchise(
    testAdminAuthToken,
    makeTestFranchise(testFranchiseUser.email),
  );
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

  describe("listUsers", () => {
    it("fails when unauthorized", async () => {
      const listUsersRes = await request(app).get("/api/user");
      expect(listUsersRes.status).toBe(401);
    });

    it("fails when not admin", async () => {
      const listUsersRes = await request(app)
        .get("/api/user")
        .set("Authorization", "Bearer " + testUserAuthToken);
      expect(listUsersRes.status).toBe(403);
    });

    it("lists all users", async () => {
      let numUsers = 3; //franchise, testdiner, admin
      const listUsersRes = await request(app)
        .get("/api/user")
        .set("Authorization", "Bearer " + testAdminAuthToken);
      expect(listUsersRes.status).toBe(200);
      const users = listUsersRes.body.users;
      expect(users).toHaveLength(numUsers);
      expect(users).toContainEqual(
        expect.objectContaining({
          name: testUser.name,
          email: testUser.email,
          roles: [Role.Diner],
        }),
      );
      expect(users).toContainEqual(
        expect.objectContaining({
          name: testFranchiseUser.name,
          email: testFranchiseUser.email,
          roles: expect.arrayContaining([Role.Diner, Role.Franchisee]),
        }),
      );
      expect(users).toContainEqual(
        expect.objectContaining({
          name: config.defaultAdmin.name,
          email: config.defaultAdmin.email,
          roles: [Role.Admin],
        }),
      );
    });

    it("has valid pagination", async () => {
      const limit = 2;
      let page = 0;
      const listUsersRes1 = await request(app)
        .get(`/api/user?page=${page}&limit=${limit}`)
        .set("Authorization", "Bearer " + testAdminAuthToken);
      expect(listUsersRes1.status).toBe(200);
      const users1 = listUsersRes1.body.users;

      page = 1;
      const listUsersRes2 = await request(app)
        .get(`/api/user?page=${page}&limit=${limit}`)
        .set("Authorization", "Bearer " + testAdminAuthToken);
      expect(listUsersRes2.status).toBe(200);
      const users2 = listUsersRes2.body.users;
      expect(users2.length).toBeLessThanOrEqual(limit); //in case there are more than 3 users, thanks to testing
      expect(users1).not.toContainEqual(users2);
    });

    it("can filter users", async () => {
      const newUser = makeTestUser();
      await registerUser(newUser);
      const nameFilter = newUser.name;
      const listUsersRes = await request(app)
        .get(`/api/user?name=${nameFilter}`)
        .set("Authorization", "Bearer " + testAdminAuthToken);
      expect(listUsersRes.status).toBe(200);
      const userlist = listUsersRes.body.users;
      expect(userlist.length).toBe(1);
      expect(userlist).toContainEqual(
        expect.objectContaining({
          name: newUser.name,
          email: newUser.email,
          roles: ["diner"],
        }),
      );
    });
  });
});
