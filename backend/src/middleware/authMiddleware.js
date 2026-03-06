import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config.js";

export default function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized: missing token cookie" });

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    if (!decoded?.userId) return res.status(401).json({ message: "Unauthorized: invalid token payload" });

    req.user = { id: decoded.userId };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized: invalid/expired token" });
  }
}