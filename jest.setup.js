const config = require("./src/config");
const mysql = require("mysql2/promise");

const dbName = process.env.TEST_DB_NAME;
afterAll(async () => {
  const { host, user, password } = config.db.connection;
  const connection = await mysql.createConnection({ host, user, password });
  await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await connection.end();

  console.log(`Dropped test database: ${dbName}`);
});