import rateLimit from "express-rate-limit";

function make(windowMs, max, message) {
  return rateLimit({ windowMs, max, message: { message }, standardHeaders: true, legacyHeaders: false });
}

export const readLimiter    = make(15 * 60 * 1000, 1200, "Too many requests. Please try again shortly.");
export const authLimiter    = make(10 * 60 * 1000,   12, "Too many authentication attempts. Please try again in a few minutes.");
export const aiLimiter      = make(15 * 60 * 1000,   25, "Too many AI generation requests. Please wait a bit and try again.");
export const photoLimiter   = make(10 * 60 * 1000,  150, "Too many photo search requests. Please try again shortly.");
export const contactLimiter = make(10 * 60 * 1000,   20, "Too many contact form submissions. Please try again later.");
