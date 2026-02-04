const fs = require("fs");
const path = require("path");

const worker = process.env.JEST_WORKER_ID || 1;
const dbName = `test_db_${worker}_${Date.now()}`;

// Store for teardown
const infoPath = path.join(__dirname, "test-db-info.json");
let info = {};

if (fs.existsSync(infoPath)) {
  info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
}

info[worker] = {
  database: dbName,
};

fs.writeFileSync(infoPath, JSON.stringify(info, null, 2), "utf8");

// Set environment variables for the test run
process.env.DB_NAME = dbName;
