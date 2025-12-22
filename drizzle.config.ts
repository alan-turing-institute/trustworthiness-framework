import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH ? `${process.env.DB_PATH}/distaf.db` : "./data/distaf.db",
  },
});
