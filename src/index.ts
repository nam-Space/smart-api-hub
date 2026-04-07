import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { db } from "./db/knex";
import { runMigration } from "./db/migrate";
import resourceRouter from "./routes/resource.route";
import authRouter from "./routes/auth.route";
import { errorHandler } from "./middlewares/error";
import { rateLimiter } from "./middlewares/rateLimit";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

const PORT = 3000;

// --- 1. Cấu hình Swagger UI (Yêu cầu số 7) ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Smart API Hub Documentation",
      version: "1.0.0",
      description: "Hệ thống API động hỗ trợ Auth và Query nâng cao",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    // --- THÊM PHẦN NÀY ĐỂ HIỆN NÚT AUTHORIZE (KHÓA) TRÊN SWAGGER ---
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // Quét cả file .ts (khi code) và .js (sau khi build)
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// THÊM ĐOẠN NÀY: Route để tải file swagger.json
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- 2. Endpoint Health Check (Yêu cầu số 1) ---
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Ping DB thật để kiểm tra kết nối
    await db.raw("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// --- 3. Đăng ký các Routes ---
// Áp dụng Rate Limit cho toàn bộ ứng dụng
app.use(rateLimiter);
// Phải để Auth lên trước vì Resource dùng đường dẫn động /:resource
app.use("/auth", authRouter);

// Các route động (/:resource)
app.use("/", resourceRouter);

// --- 4. Xử lý lỗi (Yêu cầu số 6) ---

// Route 404 cho các đường dẫn không tồn tại
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint không tồn tại" });
});

// Global Error Handler (Phải là middleware cuối cùng)
app.use(errorHandler);

// --- 5. Khởi động Server sau khi Migration thành công ---
runMigration()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`-----------------------------------------------`);
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      console.log(`📖 Swagger Docs: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`-----------------------------------------------`);
    });
  })
  .catch((err) => {
    console.error("❌ Lỗi nghiêm trọng khi khởi động DB:", err);
    process.exit(1); // Thoát chương trình nếu DB không sẵn sàng
  });
