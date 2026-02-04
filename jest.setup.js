const fs = require("fs");
const path = require("path");

const worker = process.env.JEST_WORKER_ID || "0";
const dbName = `test_db_${worker}_${Date.now()}`;

//create files pointing to database
const infoPath = path.join(__dirname, `test-db-info-${worker}.json`);

fs.writeFileSync(
  infoPath,
  JSON.stringify({ database: dbName }, null, 2),
  "utf8",
);

process.env.TEST_DB_NAME = dbName;
