const request = require("supertest");
const app = require("../service");
const {
    makeTestUser, registerUser, getAdminToken, createFranchise, createStore, makeTestFranchise,
} = require("./testHelpers");

let testAdminAuthToken, testUserAuthToken;
let testFranchiseAuthToken;

const testFranchiseUser = makeTestUser();
const testUser = makeTestUser();

let testFranchiseInstance, testStoreInstance;

const testPizza = {
    title: "testPizza ", description: "just a test", image: "notreal.png", price: 0.01,
};

function getTestPizza() {
    testPizza.title += "I";
    return testPizza;
}

const testOrder = {
    franchiseId: 1, storeId: 1, items: [],
};

async function addMenuItem(authToken, status = 200) {
    const putItemRes = await request(app)
        .put("/api/order/menu")
        .set({Authorization: `Bearer ${authToken}`})
        .send(getTestPizza());
    if (putItemRes.status !== status) {
        throw new Error(`Response status ${putItemRes.status} did not match expected status ${status}.\nResponse Body: ${JSON.stringify(
            putItemRes.body)}`);
    }
    if (status !== 200) {
        return;
    }
    const getMenuRes = await request(app).get("/api/order/menu");
    expect(getMenuRes.status).toBe(200);
    return getMenuRes;
}

beforeAll(async () => {
    ({token: testUserAuthToken} = await registerUser(testUser));
    ({token: testFranchiseAuthToken} = await registerUser(testFranchiseUser));
    testAdminAuthToken = await getAdminToken();
    const testFranchise = makeTestFranchise(testFranchiseUser.email);
    testFranchiseInstance = (await createFranchise(testAdminAuthToken, testFranchise)).body;
    testStoreInstance = (await createStore(testFranchiseAuthToken, testFranchiseInstance)).body;
});

describe("orderRouter", () => {
    describe("getMenu", () => {
        it("returns proper menu", async () => {
            await addMenuItem(testAdminAuthToken);
            const getMenuRes = await request(app).get("/api/order/menu");
            expect(getMenuRes.status).toBe(200);
            expect(getMenuRes.body.some((m) => m.title === testPizza.title)).toBe(true);
        });
    });

    describe("addMenuItem", () => {
        it("rejects when user is not allowed", async () => {
            await addMenuItem(testUserAuthToken, 403);
        });
    });

    describe("createOrder", () => {

        it("rejects when unauthorized", async () => {
            const res = await request(app).post("/api/order").send(testOrder);
            expect(res.status).toBe(401);
        });

        it("creates an order with valid menu items", async () => {
            const menuRes = await addMenuItem(testAdminAuthToken);
            const newItem = menuRes.body.find((m) => m.title === testPizza.title);
            expect(newItem).toBeDefined();

            const order = {
                franchiseId: testFranchiseInstance.id,
                storeId: testStoreInstance.id,
                items: [{menuId: newItem.id, description: newItem.description, price: newItem.price}],
            };

            const res = await request(app)
                .post("/api/order")
                .set({Authorization: `Bearer ${testUserAuthToken}`})
                .send(order);

            expect(res.status).toBe(200);
            expect(res.body.order).toMatchObject({
                franchiseId: testFranchiseInstance.id, storeId: testStoreInstance.id,
            });
            expect(res.body.order.items).toHaveLength(1);
            expect(res.body.order.items[0]).toMatchObject({
                description: newItem.description, price: newItem.price,
            });
            expect(res.body.jwt).toBeDefined();
        });

        it("rejects an order with an invalid menu item", async () => {
            const order = {
                franchiseId: testFranchiseInstance.id,
                storeId: testStoreInstance.id,
                items: [{menuId: 999999, description: "ghost pizza", price: 0.01}],
            };

            const res = await request(app)
                .post("/api/order")
                .set({Authorization: `Bearer ${testUserAuthToken}`})
                .send(order);

            expect(res.status).toBe(400);
        });

        it("returns a jwt and order id on success", async () => {
            const menuRes = await addMenuItem(testAdminAuthToken);
            const newItem = menuRes.body.find((m) => m.title === testPizza.title);

            const order = {
                franchiseId: testFranchiseInstance.id,
                storeId: testStoreInstance.id,
                items: [{menuId: newItem.id, description: newItem.description, price: newItem.price}],
            };

            const res = await request(app)
                .post("/api/order")
                .set({Authorization: `Bearer ${testUserAuthToken}`})
                .send(order);

            expect(res.status).toBe(200);
            expect(res.body.jwt).toBeDefined();
            expect(res.body.order.id).toBeDefined();
        });
    });
});