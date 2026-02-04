const request = require("supertest");
const app = require("./service");
// const config = require("./config.js");
const testUser = {
  name: "pizza diner",
  email: "reg@test.com",
  password: "a",
};

const testFranchiseUser = {
  name: "pizza franchise",
  email: "temp@test.com",
  password: "b",
};

// const testFranchise = {
//   id: "",
//   name: "Something",
// };

let testUserAuthToken;
let testUserId;
let testFranchiseAuthtoken;
let testFranchiseId;
// let testAdminAuthToken;

async function registerUser(user) {
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(user);
  const token = registerRes.body.token;
  const id = registerRes.body.user.id;
  return { token, id };
}

beforeAll(async () => {
  ({ token: testUserAuthToken, id: testUserId } = await registerUser(testUser));
  ({ token: testFranchiseAuthtoken, id: testFranchiseId } =
    await registerUser(testFranchiseUser));
  // testAdminAuthToken = (
  //   await request(app).put("/api/auth").send(config.defaultAdmin)
  // ).body.token;
});
describe("register", () => {
  it("fails without email", async () => {
    //register fails without email (assume others will also fail)
    const badUser = { name: "pizza diner", password: "a" };
    const badRegisterRes = await request(app).post("/api/auth").send(badUser);
    expect(badRegisterRes.status).toBe(400);
  });

  //register succeeds on appropriate user and returns valid authtoken
  it("succeeds when appropriate and returns valid authtoken", async () => {
    const registerRes = await request(app).post("/api/auth").send(testUser);
    expect(registerRes.status).toBe(200);
    const testRegisterAuth = registerRes.body.token;
    expect(testRegisterAuth).toMatch(
      /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/,
    );
  });
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
  expect(getUserRes.body.id).toBe(testUserId);
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
      .set({ Authorization: `Bearer ${testUserAuthToken}` })
      .send();
    expect(getUserRes.body.name).toBe(testUser.name);
  });

  // TODO: adjust to ensure emails cannot be registered to two users!!!
});

test("getFranchises", async () => {
  const getFranchiseRes = await request(app).get("/api/franchise/").send();
  expect(getFranchiseRes.status).toBe(200);
  expect(getFranchiseRes.body.franchises).toBeDefined();
});

describe("getUserFranchises", () => {
  it("returns empty when no franchises", async () => {
    const getUserFranchiseRes = await request(app)
      .get(`/api/franchise/${testFranchiseId}`)
      .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` })
      .send();
    expect(getUserFranchiseRes.status).toBe(200);
    expect(getUserFranchiseRes.body).toMatchObject([]);
  });
  // it("returns franchise when one exists", async () => {
  //   await request(app)
  //     .post("/api/franchise")
  //     .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` })
  //     .send(testFranchise);
  //   const getUserFranchiseRes = await request(app)
  //     .get(`/api/franchise/${testFranchiseId}`)
  //     .set({ Authorization: `Bearer ${testFranchiseAuthtoken}` })
  //     .send();
  //   expect(getUserFranchiseRes.status).toBe(200);
  //   expect(getUserFranchiseRes.body).toEqual(
  //     expect.arrayContaining([
  //       expect.objectContaining({
  //         name: testFranchise.name,
  //         admins: expect.any(Array),
  //         stores: expect.any(Array),
  //       }),
  //     ]),
  //   );
  // });
});

afterAll(async () => {
  //something
});
