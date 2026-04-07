import { Request, Response, NextFunction } from "express";

// Lưu trữ dữ liệu: Key là URL (vd: /posts?_page=1), Value là data + thời gian hết hạn
const cacheStore = new Map<string, { data: any; expiry: number }>();
const TTL = 30 * 1000; // 30 giây

export const cacheMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Chỉ cache các request GET
  if (req.method !== "GET") return next();

  const key = req.originalUrl;
  const cached = cacheStore.get(key);

  // Nếu còn trong cache và chưa hết hạn
  if (cached && Date.now() < cached.expiry) {
    console.log(`✨ Cache Hit: ${key}`);
    return res.json(cached.data);
  }

  // Nếu không có cache hoặc hết hạn, chúng ta "ghi đè" hàm res.json
  // để lấy dữ liệu trước khi nó được gửi về client
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    cacheStore.set(key, { data: body, expiry: Date.now() + TTL });
    return originalJson(body);
  };

  next();
};

// Hàm xóa cache khi có hành động ghi (Invalidation)
export const invalidateCache = (resource: string) => {
  // Duyệt qua tất cả các key trong cacheStore
  for (const key of cacheStore.keys()) {
    // Nếu URL bắt đầu bằng tên resource (vd: /posts), xóa nó đi
    if (key.startsWith(`/${resource}`)) {
      cacheStore.delete(key);
      console.log(`🗑️ Cache invalidated for: ${key}`);
    }
  }
};
