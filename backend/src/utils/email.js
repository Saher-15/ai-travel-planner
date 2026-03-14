import Mailjet from "node-mailjet";
import {
  MJ_API_KEY,
  MJ_API_SECRET,
  EMAIL_FROM,
} from "../config.js";

const mailjet = Mailjet.apiConnect(
  MJ_API_KEY,
  MJ_API_SECRET
);

export const sendEmail = async (to, subject, html) => {
  try {
    if (!MJ_API_KEY || !MJ_API_SECRET || !EMAIL_FROM) {
      throw new Error("Missing Mailjet environment variables");
    }

    const request = await mailjet
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: EMAIL_FROM,
              Name: "AI Travel Planner",
            },
            To: [
              {
                Email: to,
              },
            ],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      });

    console.log("Email sent:", request.body.Messages[0].To[0].Email);
    return { success: true, info: request.body };
  } catch (err) {
    console.error("Email send error:", err);
    return {
      success: false,
      error: err?.message || "Failed to send email",
    };
  }
};
