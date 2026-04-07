import knex from "knex";
import "dotenv/config";

// Kết nối đến PostgreSQL
export const db = knex({
  client: "pg",
  connection: {
    // Nếu có DATABASE_URL (Render) thì dùng nó, không thì dùng các biến lẻ (Local)
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "postgres_db",
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  },
});
