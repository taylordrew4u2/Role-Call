import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

// Create the Drizzle ORM database instance using the Vercel Postgres client
export const db = drizzle(sql, { schema });
