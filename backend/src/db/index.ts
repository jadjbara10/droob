import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://droob:droob_password@localhost:5432/droob";

const client = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export type DbClient = typeof db;