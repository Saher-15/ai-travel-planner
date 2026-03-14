import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { ContactMessage } from "../models/ContactMessage.js";

const router = express.Router();

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * POST /api/contact
 * Logged-in user sends contact message
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const saved = await ContactMessage.create({
      userId: req.user.id,
      name,
      email,
      subject,
      message,
      userReplySeen: true,
    });

    return res.status(201).json({
      message: "Message sent successfully",
      id: saved._id,
    });
  } catch (err) {
    console.error("Create contact message error:", err);
    return res.status(500).json({ message: "Failed to send message" });
  }
});

/**
 * GET /api/contact/my/messages
 * Logged-in user: get own contact messages
 */
router.get("/my/messages", authMiddleware, async (req, res) => {
  try {
    const messages = await ContactMessage.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    return res.json(messages);
  } catch (err) {
    console.error("Fetch my contact messages error:", err);
    return res.status(500).json({ message: "Failed to fetch your messages" });
  }
});

/**
 * GET /api/contact/my/messages/unread-count
 * Logged-in user: get unread admin replies count
 */
router.get("/my/messages/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await ContactMessage.countDocuments({
      userId: req.user.id,
      status: "replied",
      adminReply: { $ne: "" },
      userReplySeen: false,
    });

    return res.json({ count });
  } catch (err) {
    console.error("Fetch unread reply count error:", err);
    return res.status(500).json({ message: "Failed to fetch unread reply count" });
  }
});

/**
 * PATCH /api/contact/my/messages/mark-replies-seen
 * Logged-in user: mark all admin replies as seen
 */
router.patch("/my/messages/mark-replies-seen", authMiddleware, async (req, res) => {
  try {
    await ContactMessage.updateMany(
      {
        userId: req.user.id,
        status: "replied",
        adminReply: { $ne: "" },
        userReplySeen: false,
      },
      {
        $set: { userReplySeen: true },
      }
    );

    return res.json({ message: "Replies marked as seen" });
  } catch (err) {
    console.error("Mark replies seen error:", err);
    return res.status(500).json({ message: "Failed to mark replies as seen" });
  }
});

/**
 * GET /api/contact/admin/messages
 * Admin: get all messages
 */
router.get("/admin/messages", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return res.json(messages);
  } catch (err) {
    console.error("Fetch contact messages error:", err);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/**
 * PATCH /api/contact/admin/messages/:id/read
 * Admin: mark one message as read
 */
router.patch(
  "/admin/messages/:id/read",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const item = await ContactMessage.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: "Message not found" });
      }

      item.isRead = true;
      await item.save();

      return res.json({
        message: "Message marked as read",
        item,
      });
    } catch (err) {
      console.error("Mark message read error:", err);
      return res.status(500).json({ message: "Failed to update message" });
    }
  }
);

/**
 * PATCH /api/contact/admin/messages/:id/reply
 * Admin: reply to one message
 */
router.patch(
  "/admin/messages/:id/reply",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const adminReply = String(req.body?.adminReply || "").trim();

      if (!adminReply) {
        return res.status(400).json({ message: "Reply is required" });
      }

      const item = await ContactMessage.findById(req.params.id);

      if (!item) {
        return res.status(404).json({ message: "Message not found" });
      }

      item.adminReply = adminReply;
      item.status = "replied";
      item.isRead = true;
      item.repliedAt = new Date();
      item.userReplySeen = false;

      await item.save();

      return res.json({
        message: "Reply sent successfully",
        item,
      });
    } catch (err) {
      console.error("Reply to contact message error:", err);
      return res.status(500).json({ message: "Failed to save reply" });
    }
  }
);

/**
 * DELETE /api/contact/admin/messages/:id
 * Admin: delete one message
 */
router.delete(
  "/admin/messages/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await ContactMessage.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: "Message not found" });
      }

      return res.json({ message: "Message deleted" });
    } catch (err) {
      console.error("Delete contact message error:", err);
      return res.status(500).json({ message: "Failed to delete message" });
    }
  }
);

export default router;