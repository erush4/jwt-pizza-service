const worker = process.env.JEST_WORKER_ID || "0";
const dbName = `test_db_${worker}_${Date.now()}`;
process.env.TEST_DB_NAME = dbName;