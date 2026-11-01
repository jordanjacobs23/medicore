import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "prisma/config";

dotenvConfig({ path: ".env.local" });

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/medicore",
  },
});
