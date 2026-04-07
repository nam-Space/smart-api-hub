import { Response, Router } from "express";
import {
  create,
  getAll,
  getById,
  patch,
  remove,
  update,
} from "../controllers/resource.controller";
import { checkTableExists } from "../middlewares/checkExists";
import { authenticate, authorize } from "../middlewares/auth";
import { cacheMiddleware } from "../middlewares/cache";

const router = Router();

router.get("/", (_, res: Response) => {
  res.send({ message: "Hello world app API!" });
});

/**
 * @openapi
 * /{resource}:
 *   get:
 *     tags:
 *       - Dynamic Resources CRUD
 *     summary: Lấy danh sách dữ liệu
 *     description: Hỗ trợ Filter nâng cao (_gte, _lte, _ne, _like), Phân trang (_page, _limit), Sắp xếp (_sort, _order) và Quan hệ (_expand, _embed).
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         description: Tên bảng dữ liệu (Ví dụ posts, users, categories)
 *         schema:
 *           type: string
 *       - in: query
 *         name: _fields
 *         description: Tên cột để lấy (Ví dụ title, content, name, email,...)
 *         schema:
 *           type: string
 *       - in: query
 *         name: _page
 *         description: Số trang
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: _limit
 *         description: Số bản ghi mỗi trang
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: _sort
 *         description: Cột dùng để sắp xếp
 *         schema:
 *           type: string
 *       - in: query
 *         name: _order
 *         description: Thứ tự sắp xếp (asc hoặc desc)
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *       - in: query
 *         name: q
 *         description: Tìm kiếm từ khóa trên các cột text
 *         schema:
 *           type: string
 *       - in: query
 *         name: _expand
 *         description: Lấy dữ liệu cha (Ví dụ user)
 *         schema:
 *           type: string
 *       - in: query
 *         name: _embed
 *         description: Lấy dữ liệu con (Ví dụ posts)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trả về mảng dữ liệu và Header X-Total-Count
 */
router.get("/:resource", checkTableExists, cacheMiddleware, getAll);

/**
 * @openapi
 * /{resource}/{id}:
 *   get:
 *     tags: [Dynamic Resources CRUD]
 *     summary: Lấy chi tiết bản ghi theo ID
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Trả về object dữ liệu chi tiết
 *       404:
 *         description: Không tìm thấy
 */
router.get("/:resource/:id", checkTableExists, cacheMiddleware, getById);

/**
 * @openapi
 * /{resource}:
 *   post:
 *     tags: [Dynamic Resources CRUD]
 *     summary: Thêm mới dữ liệu
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example: { "title": "New Post", "content": "Hello World", "user_id": 1 }
 *     responses:
 *       201:
 *         description: Tạo mới thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.post("/:resource", authenticate, checkTableExists, create);

/**
 * @openapi
 * /{resource}/{id}:
 *   put:
 *     tags: [Dynamic Resources CRUD]
 *     summary: Cập nhật toàn bộ bản ghi (PUT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/:resource/:id", authenticate, checkTableExists, update);

/**
 * @openapi
 * /{resource}/{id}:
 *   patch:
 *     tags: [Dynamic Resources CRUD]
 *     summary: Cập nhật một phần bản ghi (PATCH)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example: { "name": "Updated name" }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch("/:resource/:id", authenticate, checkTableExists, patch);

/**
 * @openapi
 * /{resource}/{id}:
 *   delete:
 *     tags: [Dynamic Resources CRUD]
 *     summary: Xóa bản ghi (Chỉ Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Xóa thành công (Không trả về body)
 *       403:
 *         description: Không có quyền Admin
 */
router.delete(
  "/:resource/:id",
  authenticate,
  authorize(["admin"]),
  checkTableExists,
  remove,
);

export default router;
