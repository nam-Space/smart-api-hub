import { Request, Response, NextFunction } from "express";
import { db } from "../db/knex";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret_key_cua_ban";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, password, role } = req.body;

    // 1. Kiểm tra user tồn tại chưa
    const existingUser = await db("users").where({ email }).first();
    if (existingUser)
      return res.status(400).json({ error: "Email đã tồn tại" });

    // 2. Hash mật khẩu (Yêu cầu số 5)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Lưu vào DB (Mặc định role là 'user' nếu không gửi)
    const [newUser] = await db("users")
      .insert({
        email,
        password: hashedPassword,
        role: role || "user",
      })
      .returning(["id", "email", "role"]);

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    // 1. Tìm user
    const user = await db("users").where({ email }).first();
    if (!user)
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

    // 2. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

    // 3. Cấp mã JWT (Yêu cầu số 5)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRATION as any },
    );

    res.json({ message: "Đăng nhập thành công", token });
  } catch (error) {
    next(error);
  }
}
