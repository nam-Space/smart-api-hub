# 🎯 Kế Hoạch Khoá Học: Build Your Own JSON Server

> **Dự án xuyên suốt:** Clone lại `json-server` bằng Node.js + TypeScript + Express.js + PostgreSQL.
> **Tổng thời gian:** 12 buổi × 2.5 giờ = ~30 giờ học.
> **Đối tượng:** Intern / Junior đã biết JavaScript cơ bản (ES6+).

---

## CÔNG NGHỆ SỬ DỤNG

| Công nghệ | Phiên bản | Vai trò |
| :--- | :--- | :--- |
| Node.js | ≥ 20 LTS | Runtime |
| TypeScript | ≥ 5.x (Strict) | Ngôn ngữ |
| Express.js | ≥ 4.x | Web Framework |
| PostgreSQL | ≥ 15 | Database |
| knex.js | ≥ 3.x | Query Builder (Dynamic SQL) |
| Zod | ≥ 3.x | Input Validation |
| Vitest + Supertest | Latest | Unit & Integration Testing |
| Docker + docker-compose | Latest | Deployment |

> **Lưu ý Tech Stack:** Vì dự án tạo API **động** (không biết trước tên bảng/cột), chúng ta **không dùng ORM** (Prisma/TypeORM) vì chúng yêu cầu model cố định. `knex.js` là Query Builder — nó build câu SQL động dựa vào biến, và tự động parameterize để chống SQL Injection.

## YÊU CẦU CODING
1. Luôn luôn comment ngắn gọn, giải thích đơn giản dễ hiểu
2. Đối tượng là người mới bắt đầu học Nodejs nên cần giải thích cặn kẽ
3. Không được dùng các thư viện không cần thiết
4. Luôn luôn tuân thủ các yêu cầu trong file agent.md



### Buổi 1: [WHAT/HOW] — Setup Project & Nền tảng TypeScript

**Thời gian:** ~2.5 giờ | **Hình thức:** Coding Together

#### 🎯 Mục tiêu học viên đạt được
- Hiểu tại sao TypeScript tốt hơn JavaScript thuần cho dự án backend.
- Tự tạo được project Node.js + TypeScript từ đầu.
- Chạy được server "Hello World" với Express.

#### 📖 Nội dung lý thuyết (30 phút)
**TypeScript là gì? Tại sao dùng?**
```
Ẩn dụ: TypeScript như BẢN VẼ KỸ THUẬT so với bản vẽ tay.
- JavaScript: "cứ build thôi, sai đâu sửa đó" → lỗi xuất hiện lúc RUNTIME.
- TypeScript: "khai báo kiểu dữ liệu từ đầu" → lỗi bị bắt lúc COMPILE TIME, trước khi chạy.
```

Các khái niệm TypeScript cần biết cho dự án:
- `interface` và `type`: định nghĩa hình dạng của object.
- `generics` cơ bản: `function identity<T>(arg: T): T`.
- Strict mode: `noImplicitAny`, `strictNullChecks`.

#### 💻 Coding (90 phút)

**Bước 1: Khởi tạo project**
```bash
npm init -y
npm install express
npm install -D typescript ts-node @types/node @types/express nodemon
npx tsc --init
```

**Bước 2: Cấu hình `tsconfig.json`**
```json
// Các cờ quan trọng cần bật:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,        // ← Bắt buộc dùng type mọi nơi
    "esModuleInterop": true
  }
}
```

**Bước 3: Cấu hình `nodemon.json`**
```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/index.ts"
}
```

**Bước 4: Cấu trúc thư mục**
```
src/
├── index.ts          ← Entry point (khởi động Express)
├── routes/
│   └── resource.route.ts  ← Route động /:resource
├── controllers/
│   └── resource.controller.ts
├── db/
│   └── knex.ts       ← Kết nối database
└── utils/
    └── validate.ts   ← Helper functions
```

**Bước 5: Server Hello World**
```typescript
// src/index.ts
import express from 'express';

const app = express();
app.use(express.json()); // Parse JSON body từ request

app.get('/', (req, res) => {
  res.json({ message: 'pg-json-server đang chạy! 🚀' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
```

#### 📝 Bài tập cuối buổi (30 phút)
1. Tự setup lại project từ đầu không nhìn tài liệu.
2. Thêm route `GET /health` trả về `{ status: 'ok', uptime: process.uptime() }`.
3. Tạo một `interface Request` tùy chỉnh có thêm field `tableName: string`.

#### 💡 Lưu ý giảng viên
- Dùng **Starter Template** đã config sẵn ESLint/Prettier để học viên không mất thời gian vào config tool.
- Giải thích rõ: `ts-node` chạy TypeScript trực tiếp (không cần build), `nodemon` tự reload khi đổi code.

---

### Buổi 2: [HOW] — Kết nối PostgreSQL & Schema đơn giản

**Thời gian:** ~2.5 giờ | **Hình thức:** Coding Together

#### 🎯 Mục tiêu học viên đạt được
- Kết nối được Node.js với PostgreSQL qua knex.js.
- Hiểu tại sao phải whitelist tên bảng (bảo mật SQL Injection).
- Đọc được file `db.json` và tự động tạo bảng trong database.

#### 📖 Nội dung lý thuyết (30 phút)
**knex.js là gì?**
```
Ẩn dụ: knex.js như NGƯỜI PHIÊN DỊCH giữa JavaScript và SQL.
- Thay vì viết: "SELECT * FROM posts WHERE id = 1"
- Bạn viết: knex('posts').where({ id: 1 }).select('*')
- Lợi ích: Tự động parameterize → KHÔNG bị SQL Injection.
```

**Tại sao phải kiểm tra tên bảng?**
- Parameterized query bảo vệ được VALUES nhưng KHÔNG bảo vệ được table name hay column name.
- Nếu dùng `SELECT * FROM ${req.params.resource}` → hacker có thể inject `; DROP TABLE users --`.
- Giải pháp: Query `information_schema.tables` để whitelist tên bảng hợp lệ.

#### 💻 Coding (90 phút)

**Bước 1: Cài đặt và cấu hình knex**
```bash
npm install knex pg dotenv
```
```typescript
// src/db/knex.ts
import knex from 'knex';

// Đọc config từ biến môi trường → không hardcode mật khẩu vào code!
export const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'pg_json_server',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
});
```

**Bước 2: Middleware kiểm tra tên bảng**
```typescript
// src/utils/tableValidator.ts
import { db } from '../db/knex';

// Hàm này query information_schema (bảng metadata của Postgres)
// để kiểm tra xem tên bảng có tồn tại không → whitelist an toàn
export async function tableExists(tableName: string): Promise<boolean> {
  const result = await db('information_schema.tables')
    .where({
      table_schema: 'public',
      table_name: tableName,
    })
    .count('table_name as count')
    .first();
  return Number(result?.count) > 0;
}
```

**Bước 3: Mini Auto-Migration từ `db.json`**
```typescript
// src/db/migrate.ts
import fs from 'fs';
import { db } from './knex';

// Đọc db.json, với mỗi key (tên bảng), tạo bảng nếu chưa tồn tại
export async function runMigration() {
  const raw = fs.readFileSync('./db.json', 'utf-8');
  const schema = JSON.parse(raw);

  for (const tableName of Object.keys(schema)) {
    const exists = await db.schema.hasTable(tableName);
    if (!exists) {
      // Lấy bản record đầu tiên để suy ra các cột
      const sample = schema[tableName][0];
      await db.schema.createTable(tableName, (table) => {
        table.increments('id'); // Tự động tạo cột id auto-increment
        Object.entries(sample).forEach(([col, val]) => {
          if (col === 'id') return;
          // Suy đoán kiểu dữ liệu từ giá trị mẫu
          if (typeof val === 'number') table.integer(col);
          else if (typeof val === 'boolean') table.boolean(col);
          else table.text(col); // Mặc định là text
        });
      });
      console.log(`✅ Đã tạo bảng "${tableName}"`);
    }
  }
}
```

#### 📝 Bài tập cuối buổi
1. Thêm xử lý `INSERT` dữ liệu từ `db.json` vào bảng sau khi tạo xong.
2. Thêm cột `created_at` và `updated_at` tự động cho mỗi bảng.
3. Viết test thủ công: Gọi API với tên bảng không tồn tại, xem server trả về lỗi gì?

#### 💡 Lưu ý giảng viên
- Đây là bản **beta** của Auto-Migration — chỉ tạo bảng đơn giản. Buổi 10 sẽ hoàn thiện toàn bộ logic inference kiểu dữ liệu.
- Nhấn mạnh: `tableExists()` là **LỚP BẢO VỆ đầu tiên** — chạy trước mọi query.

---

### Buổi 3: [HOW] — Dynamic GET (Danh sách & Chi tiết)

**Thời gian:** ~2.5 giờ | **Hình thức:** Coding Together

#### 🎯 Mục tiêu học viên đạt được
- Xây dựng được route động `GET /:resource` và `GET /:resource/:id`.
- Hiểu được cơ chế Dynamic Routing trong Express.
- Trả về đúng HTTP Status Code (200, 404) theo chuẩn REST.

#### 📖 Nội dung lý thuyết (30 phút)
**RESTful API là gì?**
```
Ẩn dụ: REST là BỘ QUY TẮC GIAO THÔNG cho API.
- Ai cũng tuân theo cùng một quy tắc → dễ đọc, dễ tích hợp.
- Một URL mô tả một TÀI NGUYÊN (resource).
- HTTP Method mô tả HÀNH ĐỘNG trên tài nguyên đó.
```

| HTTP Method | URL | Ý nghĩa |
| :--- | :--- | :--- |
| GET | `/posts` | Lấy tất cả posts |
| GET | `/posts/1` | Lấy post có id = 1 |
| POST | `/posts` | Tạo mới |
| PUT | `/posts/1` | Cập nhật toàn bộ |
| PATCH | `/posts/1` | Cập nhật 1 phần |
| DELETE | `/posts/1` | Xóa |

**HTTP Status Codes quan trọng:**
| Status | Ý nghĩa |
| :---: | :--- |
| `200` | Thành công (GET, PUT, PATCH) |
| `201` | Tạo mới thành công (POST) |
| `204` | Thành công, không có nội dung (DELETE) |
| `400` | Request sai (dữ liệu đầu vào lỗi) |
| `404` | Không tìm thấy (resource/ID không tồn tại) |
| `500` | Lỗi server nội bộ |

#### 💻 Coding (90 phút)

**Route định nghĩa**
```typescript
// src/routes/resource.route.ts
import { Router } from 'express';
import { getAll, getById } from '../controllers/resource.controller';

const router = Router();

// Một route pattern /:resource bắt tất cả paths
// VD: /posts → resource = "posts", /users → resource = "users"
router.get('/:resource', getAll);
router.get('/:resource/:id', getById);

export default router;
```

**Controller: GET all**
```typescript
// src/controllers/resource.controller.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';
import { tableExists } from '../utils/tableValidator';

export async function getAll(req: Request, res: Response, next: NextFunction) {
  const { resource } = req.params; // VD: "posts"

  // Bước 1: Kiểm tra bảng có tồn tại không → bảo mật SQL Injection
  if (!(await tableExists(resource))) {
    return res.status(404).json({ error: `Resource '${resource}' not found` });
  }

  // Bước 2: Query toàn bộ bảng — knex tự parameterize tableName an toàn
  const data = await db(resource).select('*');
  return res.status(200).json(data);
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const { resource, id } = req.params;

  // Validate: id phải là số nguyên dương (không để Postgres crash với "abc")
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'ID phải là số nguyên hợp lệ' });
  }

  if (!(await tableExists(resource))) {
    return res.status(404).json({ error: `Resource '${resource}' not found` });
  }

  const item = await db(resource).where({ id: Number(id) }).first();

  if (!item) {
    return res.status(404).json({ error: `${resource} với id=${id} không tồn tại` });
  }

  return res.status(200).json(item);
}
```

**Đăng ký route trong Express**
```typescript
// src/index.ts (cập nhật)
import resourceRouter from './routes/resource.route';
app.use('/', resourceRouter);
```

#### 🧪 Test với curl hoặc Postman
```bash
# Lấy tất cả posts
curl http://localhost:3000/posts

# Lấy post có id = 1
curl http://localhost:3000/posts/1

# Kiểm tra 404 khi bảng không tồn tại
curl http://localhost:3000/nonexistent_table

# Kiểm tra 400 khi ID không hợp lệ
curl http://localhost:3000/posts/abc
```

#### 📝 Bài tập cuối buổi
1. Import Postman collection mẫu (giảng viên cung cấp) và chạy thử tất cả các case.
2. Thêm query `SELECT` chỉ lấy các cột nhất định: `GET /posts?_fields=id,title`.
3. Thêm validation: nếu `id` là số âm → trả về 400 Bad Request.

---