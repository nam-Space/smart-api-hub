import fs from "fs";
import { db } from "./knex";
import bcrypt from "bcrypt"; // Bạn cần cài: npm install bcrypt & npm install -D @types/bcrypt

export async function runMigration() {
  console.log("🚀 Đang bắt đầu quá trình Auto-Migration...");

  // 1. Đọc file schema.json
  const rawData = fs.readFileSync("./db.json", "utf-8");
  const schema = JSON.parse(rawData);

  // 2. Duyệt qua từng bảng trong file JSON
  for (const tableName of Object.keys(schema)) {
    const tableData = schema[tableName];

    // Kiểm tra xem bảng đã tồn tại chưa
    const exists = await db.schema.hasTable(tableName);

    if (!exists) {
      console.log(`--- Đang tạo bảng: ${tableName} ---`);

      // Lấy bản ghi đầu tiên làm mẫu để suy luận kiểu dữ liệu
      const sampleRecord = tableData[0];

      await db.schema.createTable(tableName, (table) => {
        // Mặc định luôn có ID tự tăng làm khóa chính
        table.increments("id").primary();

        if (sampleRecord) {
          Object.entries(sampleRecord).forEach(([columnName, value]) => {
            // Bỏ qua ID vì đã tạo ở trên
            if (columnName === "id") return;

            // KIỂM TRA TÊN CỘT ĐẶC BIỆT (Cho bảng users)
            if (columnName === "email" && tableName === "users") {
              table.string(columnName).unique().notNullable();
              return;
            }

            // SUY LUẬN KIỂU DỮ LIỆU
            if (typeof value === "number") {
              // Nếu tên cột kết thúc bằng _id (VD: user_id), ta tạo kiểu integer
              // Nhưng KHÔNG dùng .references() để tránh tạo ràng buộc cứng theo yêu cầu của bạn
              table.integer(columnName);
            } else if (typeof value === "boolean") {
              table.boolean(columnName).defaultTo(false);
            } else {
              // Mặc định cho string/object/array là text
              table.text(columnName);
            }
          });
        }

        // Tự động thêm created_at và updated_at (Yêu cầu số 2)
        table.timestamps(true, true);
      });

      // 3. SEEDING DỮ LIỆU BAN ĐẦU
      console.log(`--- Đang đổ dữ liệu cho bảng: ${tableName} ---`);

      // Xử lý riêng cho bảng users: Cần Hash password trước khi lưu
      const dataToInsert = await Promise.all(
        tableData.map(async (row: any) => {
          const newRow = { ...row };
          if (tableName === "users" && newRow.password) {
            // Hash password với salt round = 10
            newRow.password = await bcrypt.hash(newRow.password, 10);
          }
          return newRow;
        }),
      );

      await db(tableName).insert(dataToInsert);

      // --- PHẦN QUAN TRỌNG: RESET SEQUENCE CHO ID TỰ TĂNG ---
      // Sau khi chèn dữ liệu có sẵn ID từ JSON, ta phải cập nhật Sequence của Postgres
      // để nó biết phải đếm tiếp từ ID lớn nhất hiện tại.
      try {
        await db.raw(`
          SELECT setval(
            pg_get_serial_sequence('${tableName}', 'id'), 
            (SELECT MAX(id) FROM "${tableName}")
          );
        `);
        console.log(`✅ Reset ID sequence cho bảng: ${tableName}`);
      } catch (err) {
        console.warn(
          `⚠️ Không thể reset sequence cho ${tableName} (có thể bảng trống)`,
        );
      }

      console.log(`✅ Hoàn thành bảng: ${tableName}`);
    }
  }

  await db.schema.createTableIfNotExists("audit_logs", (table) => {
    table.increments("id");
    table.integer("user_id").nullable(); // ID người thực hiện
    table.string("action"); // CREATE, UPDATE, DELETE
    table.string("resource_name"); // posts, users...
    table.integer("record_id"); // ID của bản ghi bị tác động
    table.timestamp("timestamp").defaultTo(db.fn.now());
  });
  console.log("🏁 Tất cả bảng đã sẵn sàng!");
}
