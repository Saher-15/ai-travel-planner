import rateLimit from "express-rate-limit";

const aiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 AI generations per day
  message: {
    message: "Daily AI generation limit reached (10 per day). Try again tomorrow."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default aiLimiter;