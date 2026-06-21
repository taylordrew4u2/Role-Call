import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

// Lazily create the Drizzle instance so importing this module never throws.
// The connection string is only required the first time a query runs, which
// keeps `next build` safe when env vars are absent and routes any missing-env
// failure through the app's error boundaries instead of crashing at import.
let instance: Database | undefined;

function getDb(): Database {
  if (instance) return instance;

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL is not set. Connect a Postgres database in the Vercel " +
        "Storage tab and pull its environment variables (vercel env pull).",
    );
  }

  instance = drizzle(neon(connectionString), { schema });
  return instance;
}

// Proxy keeps the familiar `db.select()...` call sites working while deferring
// the connection until the first query.
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
