const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const config = require("./src/config.js");

module.exports = async () => {
  const files = fs
    .readdirSync(__dirname)
    .filter(f => f.startsWith("test-db-info-") && f.endsWith(".json"));

  const { host, user, password } = config.db.connection;

  for (const file of files) {
    const info = JSON.parse(
      fs.readFileSync(path.join(__dirname, file), "utf8")
    );

    const connection = await mysql.createConnection({ host, user, password });
    await connection.query(`DROP DATABASE IF EXISTS \`${info.database}\``);
    await connection.end();

    console.log(`Dropped test database: ${info.database}`);

    fs.unlinkSync(path.join(__dirname, file));
  }
};