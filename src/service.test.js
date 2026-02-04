const request = require("supertest");
const app = require("./service");
const config = require("./config.js");
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

const testPizza = {
  title: "testPizza",
  description: "just a test",
  image: "notreal.png",
  price: 0.01,
};

let testFranchise;

let testUserAuthToken;
let testUserId;
let testFranchiseAuthtoken;
let testFranchiseUserId;
let testAdminAuthToken;
let testFranchiseInstance;
const testStoreName = "test store";
let testStoreInstance;

async function registerUser(user) {
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(200);
  const token = registerRes.body.token;
  const id = registerRes.body.user.id;
  return { token, id };
}

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
  testAdminAuthToken = (
    await request(app).put("/api/auth").send(config.defaultAdmin)
  ).body.token;
  testFranchise = {
    stores: [],
    id: "",
    name: "test franchise ",
    admins: [{ email: testFranchiseUser.email }],
  };
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

test("getUser", async () => {
  const getUserRes = await request(app)
    .get("/api/user/me")
    .set({ Authorization: `Bearer ${testUserAuthToken}` });

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
      .set({ Authorization: `Bearer ${testUserAuthToken}` });

    expect(getUserRes.body.name).toBe(testUser.name);
  });

  // TODO: adjust to ensure emails cannot be registered to two users!!!
});

test("getFranchises", async () => {
  const getFranchiseRes = await request(app).get("/api/franchise/");
  expect(getFranchiseRes.status).toBe(200);
  expect(getFranchiseRes.body.franchises).toBeDefined();
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
  //TODO: test that franchisee role is added
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
});

describe("getMenu", () => {
  it("returns proper menu", async () => {
    await request(app)
      .put("/api/order/menu")
      .set({ Authorization: `Bearer ${testAdminAuthToken}` })
      .send(testPizza);
    const getMenuRes = await request(app).get("/api/order/menu");
    expect(getMenuRes.status).toBe(200);
    expect(getMenuRes.body.some((m) => m.title === testPizza.title)).toBe(true);
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

  it("properly adds menu item when authorized", async () => {
    const res = await request(app)
      .put("/api/order/menu")
      .set({ Authorization: `Bearer ${testAdminAuthToken}` })
      .send(testPizza);

    expect(res.status).toBe(200);
    expect(res.body.some((m) => m.title === testPizza.title)).toBe(true);
  });
});

afterAll(async () => {
  //nothing, for now
});
