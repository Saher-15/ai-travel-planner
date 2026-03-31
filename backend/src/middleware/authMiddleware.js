import jwt from "jsonwebtoken";
import { JWT_ACCESS_SECRET } from "../config.js";

export default function authMiddleware(req, res, next) {
  try {
    // Accept token from cookie (web) or Authorization header (iOS PWA / mobile)
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers?.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) return res.status(401).json({ message: "Unauthorized: missing token" });

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    if (!decoded?.userId) return res.status(401).json({ message: "Unauthorized: invalid token payload" });

    req.user = { id: decoded.userId };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized: invalid/expired token" });
  }
}