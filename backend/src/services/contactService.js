/**
 * contactService.js
 * Business logic for the contact/support messaging system.
 * Covers user-facing message submission and admin reply/management operations.
 */

import { ContactMessage } from "../models/ContactMessage.js";

/**
 * Persist a new contact message submitted by a logged-in user.
 * @param {string} userId — MongoDB ObjectId string of the submitting user.
 * @param {{ name: string, email: string, subject: string, message: string }} fields
 * @returns {ContactMessage} The saved document.
 */
export async function createMessage(userId, { name, email, subject, message }) {
  const saved = await ContactMessage.create({
    userId,
    name,
    email,
    subject,
    message,
    userReplySeen: true,
  });

  return saved;
}

/**
 * Retrieve all contact messages submitted by a specific user, newest first.
 * @param {string} userId
 * @returns {ContactMessage[]}
 */
export async function getUserMessages(userId) {
  return ContactMessage.find({ userId }).sort({ createdAt: -1 });
}

/**
 * Count admin replies that the user has not yet seen.
 * Only messages with status "replied" and a non-empty adminReply are counted.
 * @param {string} userId
 * @returns {number}
 */
export async function getUnreadReplyCount(userId) {
  return ContactMessage.countDocuments({
    userId,
    status: "replied",
    adminReply: { $ne: "" },
    userReplySeen: false,
  });
}

/**
 * Mark all admin replies for a user as seen.
 * @param {string} userId
 */
export async function markRepliesSeen(userId) {
  await ContactMessage.updateMany(
    {
      userId,
      status: "replied",
      adminReply: { $ne: "" },
      userReplySeen: false,
    },
    { $set: { userReplySeen: true } }
  );
}

/**
 * Admin: retrieve all contact messages, sorted newest first.
 * @returns {ContactMessage[]}
 */
export async function getAllMessages() {
  return ContactMessage.find().sort({ createdAt: -1 });
}

/**
 * Admin: mark a single message as read.
 * @param {string} messageId
 * @returns {ContactMessage} The updated document.
 * @throws if the message is not found.
 */
export async function markAsRead(messageId) {
  const item = await ContactMessage.findById(messageId);
  if (!item) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }

  item.isRead = true;
  await item.save();
  return item;
}

/**
 * Admin: store an admin reply on a message and flip its status to "replied".
 * The userReplySeen flag is reset to false so the user will see the new reply.
 * @param {string} messageId
 * @param {string} adminReply — The reply text.
 * @returns {ContactMessage} The updated document.
 * @throws if the message is not found.
 */
export async function replyToMessage(messageId, adminReply) {
  const item = await ContactMessage.findById(messageId);
  if (!item) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }

  item.adminReply = adminReply;
  item.status = "replied";
  item.isRead = true;
  item.repliedAt = new Date();
  item.userReplySeen = false;

  await item.save();
  return item;
}

/**
 * Admin: permanently delete a contact message.
 * @param {string} messageId
 * @throws if the message is not found.
 */
export async function deleteMessage(messageId) {
  const deleted = await ContactMessage.findByIdAndDelete(messageId);
  if (!deleted) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }
}
