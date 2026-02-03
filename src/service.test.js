const request = require("supertest");
const app = require("./service");

const testUser = {
  name: "pizza diner",
  email: "reg@test.com",
  password: "a",
};
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

test("register", async () => {
  //register fails without email (assume others will also fail)
  const badUser = { name: "pizza diner", password: "a" };
  const badRegisterRes = await request(app).post("/api/auth").send(badUser);
  expect(badRegisterRes.status).toBe(400);

  //register succeeds on appropriate user and returns valid authtoken
  const registerRes = await request(app).post("/api/auth").send(testUser);
  expect(registerRes.status).toBe(200);
  const testRegisterAuth = registerRes.body.token;
  expect(testRegisterAuth).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,
  );
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,
  );

  const user = { ...testUser, roles: [{ role: "diner" }] };
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
});

test("logout", async () => {
  //returns successfully
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set({ Authorization: `Bearer ${testUserAuthToken}` })
    .send();
  expect(logoutRes.status).toBe(200);

  //auth token no longer works
  const getUserRes = await request(app)
    .get("/api/user/me")
    .set({ Authorization: `Bearer ${testUserAuthToken}` })
    .send();
  expect(getUserRes.status).toBe(401);

  //log back in to prevent issues with other tests
  const loginRes = await request(app).put("/api/auth").send(testUser);
  testUserAuthToken = loginRes.body.token;
});

test("getUser", async () => {
  const getUserRes = await request(app)
    .get("/api/user/me")
    .set({ Authorization: `Bearer ${testUserAuthToken}` })
    .send();
  expect(getUserRes.status).toBe(200);
  //returns appropriate user object
  expect(getUserRes.body.id).toBe(testUserId)
});

