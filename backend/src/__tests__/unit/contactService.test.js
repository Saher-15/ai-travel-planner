/**
 * Unit tests for contactService.js
 * Uses mongodb-memory-server for real Mongoose operations.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "@jest/globals";
import mongoose from "mongoose";
import { setupDB, teardownDB, clearDB } from "../helpers/dbSetup.js";
import {
  createMessage,
  getUserMessages,
  getUnreadReplyCount,
  markRepliesSeen,
  markAsRead,
  replyToMessage,
  deleteMessage,
} from "../../services/contactService.js";

const fakeUserId = () => new mongoose.Types.ObjectId();

beforeAll(setupDB);
afterAll(teardownDB);
afterEach(clearDB);

// ─── createMessage ────────────────────────────────────────────────────────────

describe("createMessage", () => {
  it("persists a contact message to the database", async () => {
    const userId = fakeUserId();
    const saved = await createMessage(userId, {
      name: "Alice",
      email: "alice@example.com",
      subject: "Help",
      message: "I need help with my trip.",
    });

    expect(saved._id).toBeDefined();
    expect(saved.name).toBe("Alice");
    expect(saved.email).toBe("alice@example.com");
    expect(saved.subject).toBe("Help");
    expect(saved.status).toBe("pending");
    expect(saved.isRead).toBe(false);
  });

  it("sets userReplySeen to true on creation", async () => {
    const saved = await createMessage(fakeUserId(), {
      name: "Bob",
      email: "bob@example.com",
      subject: "Q",
      message: "Question",
    });
    expect(saved.userReplySeen).toBe(true);
  });
});

// ─── getUserMessages ──────────────────────────────────────────────────────────

describe("getUserMessages", () => {
  it("returns messages for the given userId only", async () => {
    const userId1 = fakeUserId();
    const userId2 = fakeUserId();

    await createMessage(userId1, { name: "A", email: "a@a.com", subject: "S1", message: "M1" });
    await createMessage(userId1, { name: "A", email: "a@a.com", subject: "S2", message: "M2" });
    await createMessage(userId2, { name: "B", email: "b@b.com", subject: "S3", message: "M3" });

    const msgs = await getUserMessages(userId1);
    expect(msgs).toHaveLength(2);
    msgs.forEach((m) => expect(m.userId.toString()).toBe(userId1.toString()));
  });

  it("returns newest first", async () => {
    const userId = fakeUserId();
    await createMessage(userId, { name: "A", email: "a@a.com", subject: "First", message: "M" });
    await createMessage(userId, { name: "A", email: "a@a.com", subject: "Second", message: "M" });

    const msgs = await getUserMessages(userId);
    expect(msgs[0].subject).toBe("Second");
    expect(msgs[1].subject).toBe("First");
  });
});

// ─── markAsRead ───────────────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("sets isRead to true", async () => {
    const msg = await createMessage(fakeUserId(), {
      name: "C", email: "c@c.com", subject: "S", message: "M",
    });
    expect(msg.isRead).toBe(false);

    const updated = await markAsRead(msg._id.toString());
    expect(updated.isRead).toBe(true);
  });

  it("throws 404 for non-existent message id", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(markAsRead(fakeId)).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── replyToMessage ───────────────────────────────────────────────────────────

describe("replyToMessage", () => {
  it("sets adminReply, status='replied', isRead=true, userReplySeen=false", async () => {
    const msg = await createMessage(fakeUserId(), {
      name: "D", email: "d@d.com", subject: "S", message: "M",
    });

    const updated = await replyToMessage(msg._id.toString(), "We will help you!");

    expect(updated.adminReply).toBe("We will help you!");
    expect(updated.status).toBe("replied");
    expect(updated.isRead).toBe(true);
    expect(updated.userReplySeen).toBe(false);
    expect(updated.repliedAt).toBeDefined();
  });

  it("throws 404 for non-existent message", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(replyToMessage(fakeId, "reply")).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ─── getUnreadReplyCount ──────────────────────────────────────────────────────

describe("getUnreadReplyCount", () => {
  it("counts messages with status=replied, adminReply non-empty, userReplySeen=false", async () => {
    const userId = fakeUserId();
    const msg = await createMessage(userId, {
      name: "E", email: "e@e.com", subject: "S", message: "M",
    });
    await replyToMessage(msg._id.toString(), "Your reply");

    const count = await getUnreadReplyCount(userId);
    expect(count).toBe(1);
  });

  it("returns 0 when no unread replies exist", async () => {
    const userId = fakeUserId();
    const count = await getUnreadReplyCount(userId);
    expect(count).toBe(0);
  });
});

// ─── markRepliesSeen ──────────────────────────────────────────────────────────

describe("markRepliesSeen", () => {
  it("marks all unseen replies as seen", async () => {
    const userId = fakeUserId();
    const m1 = await createMessage(userId, { name: "F", email: "f@f.com", subject: "S", message: "M" });
    const m2 = await createMessage(userId, { name: "F", email: "f@f.com", subject: "S2", message: "M2" });

    await replyToMessage(m1._id.toString(), "Reply 1");
    await replyToMessage(m2._id.toString(), "Reply 2");

    let count = await getUnreadReplyCount(userId);
    expect(count).toBe(2);

    await markRepliesSeen(userId);

    count = await getUnreadReplyCount(userId);
    expect(count).toBe(0);
  });
});

// ─── deleteMessage ────────────────────────────────────────────────────────────

describe("deleteMessage", () => {
  it("removes the message from the database", async () => {
    const msg = await createMessage(fakeUserId(), {
      name: "G", email: "g@g.com", subject: "S", message: "M",
    });

    await deleteMessage(msg._id.toString());

    const msgs = await getUserMessages(msg.userId);
    expect(msgs).toHaveLength(0);
  });

  it("throws 404 when message does not exist", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(deleteMessage(fakeId)).rejects.toMatchObject({ statusCode: 404 });
  });
});
