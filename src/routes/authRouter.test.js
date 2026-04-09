jest.mock('./decodeBody');
const request = require("supertest");
const { makeTestUser, registerUser } = require("./testHelpers");
const app = require("../service");
const {DB} = require("../database/database");
const config = require("../config");

const testUser = makeTestUser();

let testUserAuthToken;

beforeAll(async () => {
  ({ token: testUserAuthToken } = await registerUser(testUser));
});

describe("authRouter", () => {
  describe("register", () => {
    it("fails without email", async () => {
      //register fails without email (assume others will also fail)
      const badUser = {name: "pizza diner", password: "a"};
      const badRegisterRes = await request(app).post("/api/auth").send(badUser);
      expect(badRegisterRes.status).toBe(400);
    });

    it("succeeds when appropriate and returns valid authtoken", async () => {
      const registerUser = makeTestUser();
      const registerRes = await request(app).post("/api/auth").send(registerUser);
      expect(registerRes.status).toBe(200);
      const testRegisterAuth = registerRes.body.token;
      expect(testRegisterAuth).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,);
      const getUserRes = await request(app)
        .get("/api/user/me")
        .set({Authorization: `Bearer ${testUserAuthToken}`});
      expect(getUserRes.status).toBe(200);
    });

    it("prevents users from registering twice", async () => {
      const registerRes = await request(app).post("/api/auth").send(testUser);
      expect(registerRes.status).toBe(409);
    });
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
    it("fails on empty string", async () => {
      const loginRes = await request(app).put("/api/auth").send({email: testUser.email, password: ""});
      expect(loginRes.status).toBe(401);
    })
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

  describe("authtoken", () => {
    it("times out appropriately", async () => {
      const spy = jest.spyOn(DB, 'getFromToken').mockResolvedValueOnce({
        token: "whatever",
        userId: 1,
        lastActiveTime: new Date(Date.now() - (config.authTimeoutValue + 1) * 60 * 1000) // 21 minutes ago
      });

      const res = await request(app)
        .get("/api/user/me")
        .set({Authorization: `Bearer ${testUserAuthToken}`});

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Token expired');

      spy.mockRestore();
    })
    it("allows logout when expired", async () => {
      const spy = jest.spyOn(DB, 'getFromToken').mockResolvedValueOnce({
        token: `${testUserAuthToken}`,
        userId: 1,
        lastActiveTime: new Date(Date.now() - (config.authTimeoutValue + 1) * 60 * 1000) // 21 minutes ago
      });

      const res = await request(app)
        .get("/api/user/me")
        .set({Authorization: `Bearer ${testUserAuthToken}`});

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Token expired');

      spy.mockRestore();
    })
  })
});
