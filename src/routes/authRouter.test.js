const request = require("supertest");
const { makeTestUser, registerUser } = require("./testHelpers");
const app = require("../service");

const testUser = makeTestUser();

let testUserAuthToken;

beforeAll(async () => {
  ({ token: testUserAuthToken } = await registerUser(testUser));
});

describe("authRouter", () => {
  describe("register", () => {
    it("fails without email", async () => {
      //register fails without email (assume others will also fail)
      const badUser = { name: "pizza diner", password: "a" };
      const badRegisterRes = await request(app).post("/api/auth").send(badUser);
      expect(badRegisterRes.status).toBe(400);
    });

    it("succeeds when appropriate and returns valid authtoken", async () => {
      const registerRes = await request(app).post("/api/auth").send(testUser);
      expect(registerRes.status).toBe(200);
      const testRegisterAuth = registerRes.body.token;
      expect(testRegisterAuth).toMatch(
        /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,
      );
      const getUserRes = await request(app)
        .get("/api/user/me")
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(getUserRes.status).toBe(200);
    });

    //TODO: ensure that users cannot register the same email twice!
  });
  describe("login", () => {
    it("returns appropriately", async () => {
      const loginRes = await request(app).put("/api/auth").send(testUser);
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toMatch(
        /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,
      );

      const user = { ...testUser, roles: [{ role: "diner" }] };
      delete user.password;
      expect(loginRes.body.user).toMatchObject(user);
    });

    //TODO: ensure fails when wrong password
  });

  describe("logout", () => {
    it("deletes user and removes authtoken", async () => {
      //returns successfully
      const logoutRes = await request(app)
        .delete("/api/auth")
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(logoutRes.status).toBe(200);

      //auth token no longer works
      const getUserRes = await request(app)
        .get("/api/user/me")
        .set({ Authorization: `Bearer ${testUserAuthToken}` });

      expect(getUserRes.status).toBe(401);

      //log back in to prevent issues with other tests
      const loginRes = await request(app).put("/api/auth").send(testUser);
      testUserAuthToken = loginRes.body.token;
    });

    //TODO: ensure fails appropriately with wrong authtoken
  });
});
