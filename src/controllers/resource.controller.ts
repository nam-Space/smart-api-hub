import { Request, Response, NextFunction } from "express";
import { db } from "../db/knex";
import { tableExists, toPlural, toSingular } from "../utils/tableValidator";
import { invalidateCache } from "../middlewares/cache";
import { logAudit } from "../utils/auditLogger";
import { IUser } from "../types";

/**
 * Helper: Xử lý Expand (Lấy dữ liệu cha)
 * Quy ước: _expand=user => Tìm cột user_id trong bảng hiện tại, lấy dữ liệu từ bảng users
 */
async function handleExpand(data: any[], expandParam: string) {
  if (!data || data.length === 0) return data;

  // 1. Chuẩn hóa tên tham số (Ví dụ: 'categories' -> 'category')
  const singularName = toSingular(expandParam.toLowerCase());

  // 2. Quy ước Foreign Key: [số ít]_id (Ví dụ: category_id, user_id, post_id)
  const foreignKey = `${singularName}_id`;

  // 3. Kiểm tra xem dữ liệu hiện tại có cột ID này không
  // (Ví dụ: Nếu gọi posts?_expand=user, kiểm tra xem bảng posts có cột user_id không)
  if (!(foreignKey in data[0])) {
    console.warn(`⚠️ Cột [${foreignKey}] không tồn tại trong resource này.`);
    return data;
  }

  // 4. Quy ước tên bảng cha: [số nhiều] (Ví dụ: categories, users, posts)
  const parentTableName = toPlural(singularName);

  // 5. Kiểm tra bảng cha có tồn tại trong DB không
  if (!(await tableExists(parentTableName))) {
    console.warn(`⚠️ Bảng cha [${parentTableName}] không tồn tại.`);
    return data;
  }

  // 6. Truy vấn lấy dữ liệu cha (Tránh N+1 query)
  const parentIds = [
    ...new Set(data.map((item) => item[foreignKey]).filter(Boolean)),
  ];
  if (parentIds.length === 0) return data;

  const parents = await db(parentTableName).whereIn(
    "id",
    parentIds as number[],
  );

  // 7. Gán dữ liệu vào object (Key trả về trùng với tham số client gửi lên)
  return data.map((item) => ({
    ...item,
    [expandParam]: parents.find((p) => p.id === item[foreignKey]) || null,
  }));
}

/**
 * Helper: Xử lý Embed (Lấy dữ liệu con)
 * Quy ước: _embed=posts => Sang bảng posts, tìm các dòng có [resource]_id trùng với ID hiện tại
 */
async function handleEmbed(resource: string, data: any[], embedParam: string) {
  if (!data || data.length === 0) return data;

  // 1. Tên bảng con (Ví dụ: 'posts')
  const childTableName = embedParam;

  // Kiểm tra bảng con có tồn tại không
  if (!(await tableExists(childTableName))) {
    console.warn(`⚠️ Bảng con [${childTableName}] để embed không tồn tại.`);
    return data;
  }

  // 2. Xác định Foreign Key nằm trong bảng con
  // Quy ước: [Resource_Cha_Số_Ít]_id
  // Ví dụ: Resource cha là 'users' -> 'user' -> 'user_id'
  // Ví dụ: Resource cha là 'categories' -> 'category' -> 'category_id'
  const parentSingular = toSingular(resource.toLowerCase());
  const foreignKeyInChild = `${parentSingular}_id`;

  // 3. Lấy danh sách ID của bảng cha hiện tại
  const parentIds = data.map((item) => item.id);

  // 4. Truy vấn bảng con (Lấy tất cả các con có cha nằm trong list ID trên)
  // SELECT * FROM posts WHERE user_id IN (1, 2, 3...)
  const children = await db(childTableName).whereIn(
    foreignKeyInChild,
    parentIds,
  );

  // 5. Group dữ liệu: Nhúng mảng các con vào đúng cha của nó
  return data.map((item) => ({
    ...item,
    // Trả về key theo đúng tên client yêu cầu (Ví dụ: item.posts = [...])
    [embedParam]: children.filter(
      (child) => child[foreignKeyInChild] === item.id,
    ),
  }));
}

export async function getAll(
  req: Request<{ resource: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { resource } = req.params;
    const {
      _page,
      _limit,
      _sort,
      _order,
      _expand,
      _embed,
      q,
      _fields,
      ...filters
    } = req.query;

    let query = db(resource);

    // 1. CHỌN CỘT (_fields=id,title)
    if (_fields) {
      query = query.select((_fields as string).split(","));
    } else {
      query = query.select("*");
    }

    // 2. TÌM KIẾM CHUNG (?q=keyword)
    if (q) {
      // 💡 BƯỚC THÔNG MINH: Lấy thông tin cấu trúc bảng từ DB
      const columnInfo = await db(resource).columnInfo();

      // Lọc ra danh sách các cột có kiểu dữ liệu là chuỗi (text, varchar,...)
      const searchableColumns = Object.keys(columnInfo).filter((col) => {
        const type = columnInfo[col].type;
        return ["text", "varchar", "character varying", "string"].includes(
          type,
        );
      });

      // Tạo câu lệnh WHERE động: column1 ILIKE %q% OR column2 ILIKE %q% ...
      query = query.where((builder) => {
        searchableColumns.forEach((col) => {
          builder.orWhereILike(col, `%${q}%`);
        });
      });
    }

    // 3. BỘ LỌC NÂNG CAO (_gte, _lte, _ne, _like)
    Object.keys(filters).forEach((key: any) => {
      const value = filters[key] as any;

      if (key.endsWith("_gte")) {
        query = query.where(key.replace("_gte", ""), ">=", value);
      } else if (key.endsWith("_lte")) {
        query = query.where(key.replace("_lte", ""), "<=", value);
      } else if (key.endsWith("_ne")) {
        query = query.where(key.replace("_ne", ""), "!=", value);
      } else if (key.endsWith("_like")) {
        // ilike trong Postgres là tìm kiếm không phân biệt hoa thường
        query = query.where(key.replace("_like", ""), "ilike", `%${value}%`);
      } else {
        // Mặc định là so sánh bằng (=)
        query = query.where(key, value);
      }
    });

    // 4. SẮP XẾP
    if (_sort) {
      query = query.orderBy(
        _sort as string,
        ((_order as string) || "asc") as any,
      );
    }

    // 5. PHÂN TRANG & HEADER
    const totalCountResult = await db(resource).count("id as count").first();
    res.setHeader("X-Total-Count", String(totalCountResult?.count || 0));

    if (_page) {
      const limit = Number(_limit) || 10;
      query = query.limit(limit).offset((Number(_page) - 1) * limit);
    }

    // THỰC THI QUERY
    let data = await query;

    // 6. XỬ LÝ RELATIONSHIPS (Sau khi đã lấy dữ liệu từ DB)
    if (_expand) data = await handleExpand(data, _expand as string);
    if (_embed) data = await handleEmbed(resource, data, _embed as string);

    return res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: Request<{ resource: string; id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { resource, id } = req.params;
    const { _expand, _embed } = req.query;

    const item = await db(resource).where({ id }).first();
    if (!item) return res.status(404).json({ error: "Not found" });

    let data = [item]; // Đưa vào mảng để dùng chung logic xử lý quan hệ

    if (_expand) data = await handleExpand(data, _expand as string);
    if (_embed) data = await handleEmbed(resource, data, _embed as string);

    return res.status(200).json(data[0]);
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: Request<{ resource: string }> & { user?: IUser },
  res: Response,
  next: NextFunction,
) {
  try {
    const { resource } = req.params;
    const [newItem] = await db(resource).insert(req.body).returning("*");

    // --- BONUS LOGIC ---
    invalidateCache(resource); // Xóa cache
    logAudit(req.user?.id || null, "CREATE", resource, newItem.id); // Ghi log

    return res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request<{ resource: string; id: string }> & { user?: IUser },
  res: Response,
  next: NextFunction,
) {
  try {
    const { resource, id } = req.params;

    // 1. Lấy bản ghi hiện tại để biết cấu trúc các cột
    const existingItem = await db(resource).where({ id }).first();
    if (!existingItem) {
      return res
        .status(404)
        .json({ error: "Dữ liệu không tồn tại để thay thế" });
    }

    // 2. LOGIC PUT: Tạo một object mới để thay thế hoàn toàn
    // Chúng ta duyệt qua tất cả các key của bản ghi cũ
    const putData: any = { updated_at: new Date() };

    Object.keys(existingItem).forEach((key) => {
      // Bỏ qua các trường không được phép ghi đè
      if (key === "id" || key === "created_at" || key === "updated_at") return;

      // Nếu client gửi trường này lên -> lấy giá trị của client
      // Nếu client KHÔNG gửi -> set về null (đây chính là sự khác biệt của PUT)
      putData[key] = req.body[key] !== undefined ? req.body[key] : null;
    });

    // 3. Thực hiện cập nhật
    const [updatedItem] = await db(resource)
      .where({ id })
      .update(putData)
      .returning("*");

    // --- BONUS LOGIC ---
    invalidateCache(resource);
    logAudit(req.user?.id || null, "PUT", resource, Number(id));

    return res.status(200).json(updatedItem);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /:resource/:id
 * Ý nghĩa: Cập nhật MỘT PHẦN bản ghi.
 * Client chỉ gửi những field cần thay đổi.
 */
export async function patch(
  req: Request<{ resource: string; id: string }> & { user?: IUser },
  res: Response,
  next: NextFunction,
) {
  try {
    const { resource, id } = req.params;

    // PATCH chỉ cập nhật những gì client gửi lên trong req.body
    const [updatedItem] = await db(resource)
      .where({ id })
      .update({
        ...req.body,
        updated_at: new Date(),
      })
      .returning("*");

    if (!updatedItem) {
      return res.status(404).json({ error: "Không tìm thấy để patch" });
    }

    // --- BONUS LOGIC ---
    invalidateCache(resource);
    logAudit(req.user?.id || null, "PATCH", resource, Number(id));

    return res.status(200).json(updatedItem);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request<{ resource: string; id: string }> & { user?: IUser },
  res: Response,
  next: NextFunction,
) {
  try {
    const { resource, id } = req.params;

    const deletedCount = await db(resource).where({ id }).delete();
    if (deletedCount === 0)
      return res.status(404).json({ error: "Cannot be deleted!" });

    // --- BONUS LOGIC ---
    invalidateCache(resource);
    logAudit(req.user?.id || null, "DELETE", resource, Number(id));

    return res.status(200).send(); // Thành công không trả về body
  } catch (error) {
    next(error);
  }
}
