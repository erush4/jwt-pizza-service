const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("./src/config.js");

module.exports = async () => {
  const infoPath = path.join(__dirname, "test-db-info.json");

  if (!fs.existsSync(infoPath)) {
    console.log("No test DB info file found — skipping teardown.");
    return;
  }

  const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
  const { host, user, password } = config.db.connection;

  for (const worker of Object.keys(info)) {
    const { database } = info[worker];

    const connection = await mysql.createConnection({ host, user, password });
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.end();

    console.log(`Dropped test database: ${database}`);
  }

  fs.unlinkSync(infoPath);
};
