import { createClient } from "redis";
import mysql from "mysql2/promise";
import { config } from "@letterbookxd/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log("?? Starting database migration...");

  // Connect to MySQL
  const db = await mysql.createConnection({
    uri: config.database.url,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
  });

  // Read and execute schema
  const schemaPath = join(__dirname, "../../../docker/mysql/init/01-schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  
  // Split by semicolon and execute each statement
  const statements = schema
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    try {
      await db.execute(statement);
      console.log(`? Executed: ${statement.substring(0, 50)}...`);
    } catch (error: any) {
      if (error.code !== "ER_TABLE_EXISTS_ERROR" && error.code !== "ER_DUP_KEYNAME") {
        console.error(`? Failed: ${statement.substring(0, 100)}...`);
        console.error(error.message);
      } else {
        console.log(`? Skipped (already exists): ${statement.substring(0, 50)}...`);
      }
    }
  }

  await db.end();
  console.log("? Migration completed!");
}

migrate().catch(console.error);
