const config = require("./src/config.js");
const BASE_URL = config.deploymentUrl + "/api";

let menu = []
const franchiseId = 1;
const storeId = 1;

let users = [
    {name: "metrics1", email: "metrics1@test.com", password: "pass1"},
    {name: "metrics2", email: "metrics2@test.com", password: "pass2"},
    {name: "metrics3", email: "metrics3@test.com", password: "pass3"}
];

async function registerUser(user) {
    const res = await fetch(BASE_URL + '/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    });
    const data = await res.json();
    if (res.status !== 200) {
        throw new Error("registerUser failed: " + res.status);
    }
    return data.token;
}

async function loginUser(user) {
    const res = await fetch(BASE_URL + '/auth', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({email: user.email, password: user.password}),
    });
    const data = await res.json();
    if (res.status !== 200) {
        throw new Error("loginUser failed: " + res.status);
    }
    return data.token;
}

async function login() {
    const user = users[Math.floor(Math.random() * users.length)];
    await loginUser(user);
}

async function getMenu(token) {
    const res = await fetch(BASE_URL + '/order/menu');
    menu = await res.json();
    if (res.status !== 200) {
        console.error("getMenu failed")
    }
    return token;
}

async function badLogin() {
    const res = await fetch(BASE_URL + '/auth', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({email: 'bad@test.com', password: 'wrongpassword'}),
    });
    if (res.status === 200) {
        throw new Error("badLogin succeeded");
    }
    await res.json();
    return undefined;
}

async function logout(token) {
    const res = await fetch(BASE_URL + '/auth', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (res.status !== 200) {
        throw new Error("logout failed");
    }
    await res.json();
    return undefined;
}

function buildOrder(numItems) {
    const items = [];

    for (let i = 0; i < numItems; i++) {
        const menuItem = menu[Math.floor(Math.random() * menu.length)];
        items.push({
            menuId: menuItem.id, description: menuItem.title, price: menuItem.price
        });
    }

    return {
        franchiseId, storeId, items
    };
}

async function orderPizza(token) {
    if (menu.length === 0) {
        await getMenu(token);
    }
    const numItems = Math.floor(Math.random() * 18) + 1; // 1-19 items
    const res = await fetch(BASE_URL + '/order', {
        method: 'POST', headers: {
            'Content-Type': 'application/json', Authorization: `Bearer ${token}`
        }, body: JSON.stringify(buildOrder(numItems))
    });
    if (res.status !== 200) {
        throw new Error("pizza order failed");
    }
    await res.json();
    return token;
}

async function makeBadOrder(token) {
    if (menu.length === 0) {
        await getMenu();
    }
    const numItems = 21;
    const res = await fetch(BASE_URL + '/order', {
        method: 'POST', headers: {
            'Content-Type': 'application/json', Authorization: `Bearer ${token}`
        }, body: JSON.stringify(buildOrder(numItems))
    });
    if (res.status === 200) {
        console.error("pizza order succeeded");
    }
    await res.json();
    return token;
}

const loggedInDinerActions = [
    {weight: 100, fn: async (token) => getMenu(token)},
    {weight: 20, fn: async (token) => logout(token)},
    {weight: 50, fn: async (token) => orderPizza(token)},
    {weight: 1, fn: async (token) => makeBadOrder(token)},
    {weight: 100, fn: async (token) => Promise.resolve(token)}, // do nothing
]

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function registerNewUser() {
    const name = `user${Math.random().toString(36).slice(2, 7)}`;
    const email = `${name}@test.com`;
    const password = `pass${Math.random().toString(36).slice(2, 7)}`;
    const res = await fetch(BASE_URL + '/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({name, email, password}),
    });
    const data = await res.json();
    users.push({name, email, password});
    if (users.length > 5) {
        users.shift();
    }
    return data.token;
}

const loggedOutActions = [
    {weight: 50, fn: async () => Promise.resolve()},
    {weight: 50, fn: async () => login()},
    {weight: 5, fn: async () => registerNewUser()},
    {weight: 1, fn: async () => badLogin()}
]

function getRandomAction(actionArray) {
    const totalWeight = actionArray.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;

    for (const action of actionArray) {
        random -= action.weight;
        if (random <= 0) return action.fn;
    }
}

async function simulateDiner() {
    const endTime = Date.now() + 60 * 60 * 1000; // 60 minutes in ms
    let token = undefined
    while (Date.now() < endTime) {
        let action;
        if (token !== undefined && token !== null) {
            action = getRandomAction(loggedInDinerActions);
        } else {
            action = getRandomAction(loggedOutActions);
        }
        console.log(action.toString());
        token = await action(token);
        await sleep(3_000);
    }
}

async function main() {
    for (let i = 0; i < users.length; i += 1) {
        let token;
        try {
            token = await loginUser(users[i]);
        } catch (e) {
            if (e.message === "loginUser failed: 401") {
                token = await registerUser(users[i]);
            } else {
                console.error(e)
                throw e;
            }
        }
        await logout(token);
    }
    await getMenu(undefined);
    await Promise.all([simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(),])
    return 0;
}

main();
