import { Request, Response, NextFunction } from "express";

// Key: IP, Value: { count: số request, startTime: thời điểm bắt đầu chu kỳ 1 phút }
const limitMap = new Map<string, { count: number; startTime: number }>();

const LIMIT = 100; // Tối đa 100 request
const WINDOW_MS = 60 * 1000; // Trong 1 phút (60,000 ms)

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || "unknown";
  const now = Date.now();

  if (!limitMap.has(ip)) {
    // Nếu IP mới, tạo bản ghi mới
    limitMap.set(ip, { count: 1, startTime: now });
  } else {
    const data = limitMap.get(ip)!;

    // Nếu đã qua 1 phút, reset lại bộ đếm
    if (now - data.startTime > WINDOW_MS) {
      data.count = 1;
      data.startTime = now;
    } else {
      // Trong cùng 1 phút, tăng bộ đếm
      data.count++;
    }
  }

  const currentData = limitMap.get(ip)!;

  // Gắn các Header theo yêu cầu (Bonus point)
  res.setHeader("X-RateLimit-Limit", LIMIT);
  res.setHeader(
    "X-RateLimit-Remaining",
    Math.max(0, LIMIT - currentData.count),
  );

  // Nếu vượt quá giới hạn
  if (currentData.count > LIMIT) {
    return res.status(429).json({
      error: "Too Many Requests",
      message:
        "Bạn đã vượt quá giới hạn 100 request/phút. Vui lòng thử lại sau.",
    });
  }

  next();
};
