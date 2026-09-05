import { pool } from "./database.js";

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    console.log("PostgreSQL connection successful:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error(
      "PostgreSQL connection failed:",
      error
    );

    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();