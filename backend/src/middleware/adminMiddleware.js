import { User } from "../models/User.js";

export default async function adminMiddleware(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id).select("role email");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin access required" });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}