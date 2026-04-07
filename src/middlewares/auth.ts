import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware 1: Xác thực xem người dùng đã đăng nhập chưa (có Token hợp lệ không)
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "JWT_SECRET");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid Token" });
  }
};
// Middleware 2: Phân quyền (Kiểm tra role của người dùng)
export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Nếu không có user hoặc role của user không nằm trong danh sách cho phép
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: Chỉ Admin mới có quyền thực hiện hành động này",
      });
    }
    next();
  };
};
