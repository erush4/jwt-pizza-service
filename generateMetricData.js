const config = require("./src/config");

const BASE_URL = config.deploymentUrl + "/api";

let menu = []
const franchiseId = 1;
const storeId = 1;

let users = [
    {name: "metrics1", email: "metrics1@test.com", password: "pass1"},
    {name: "metrics2", email: "metrics2@test.com", password: "pass2"},
    {name: "metrics3", email: "metrics3@test.com", password: "pass3"},
    {name: "metrics4", email: "metrics4@test.com", password: "pass1"},
    {name: "metrics5", email: "metrics5@test.com", password: "pass2"},
    {name: "metrics6", email: "metrics6@test.com", password: "pass3"},
    {name: "metrics7", email: "metrics7@test.com", password: "pass1"},
    {name: "metrics8", email: "metrics8@test.com", password: "pass2"},
    {name: "metrics9", email: "metrics9@test.com", password: "pass3"}
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
    return await loginUser(user);
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
    console.log("bad login");
    return null;
}

async function logout(token) {
    const res = await fetch(BASE_URL + '/auth', {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    await res.json()
    if (res.status !== 200) {
        throw new Error("logout failed: " + res.status);
    }
    return null;
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
    const data = await res.json()
    if (res.status === 401 && data.message === "Token expired") {
        throw new Error("expired token");
    } else if (res.status !== 200) {
        throw new Error("pizza order failed: " + res.status + " " + token);
    }
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
        throw new Error("pizza order succeeded");
    }
    await res.json();
    console.log("bad order");
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
    if (users.length > 15) {
        users.shift();
    }
    console.log("new user registered")
    return data.token;
}

const loggedOutActions = [
    {weight: 20, fn: async () => Promise.resolve()},
    {weight: 20, fn: async () => login()},
    {weight: 2, fn: async () => registerNewUser()},
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
    let token = null
    let actions = [];
    let action;
    try {
        console.log("starting loop")
        while (Date.now() < endTime) {
            if (token) {
                action = getRandomAction(loggedInDinerActions);
            } else {
                action = getRandomAction(loggedOutActions);
            }
            try {
                token = await action(token);
                if (actions.push(action) > 10) {
                    actions.shift();
                }
                await sleep(3_000);
            } catch (e) {
                if (e.message === "expired token") {
                    console.log('expired token');
                    await logout(token);
                    token = await login();
                } else {
                    throw e;
                }
            }
        }
        if (token) {
            await logout(token);
        }
    } catch (error) {
        console.error(token);
        console.error(error.message + "\n");
        for (let i in actions) {
            console.error(actions[i].toString());
        }
        console.error(action.toString() + "\n");
        process.exit(1);
    }
}

async function main() {
    for (let i = 0; i < users.length; i += 1) {
        let token;
        try {
            token = await loginUser(users[i]);
        } catch (e) {
            if (e.message === "loginUser failed: 401") {
                console.log(e);
                token = await registerUser(users[i]);
            } else {
                console.error(e)
                throw e;
            }
        }
        await logout(token);
    }
    await getMenu(undefined);
    await Promise.all([simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(), simulateDiner(),])
    return 0;
}

main();
