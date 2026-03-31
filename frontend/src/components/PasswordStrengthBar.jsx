const LEVELS = [
  { maxScore: 1, label: "Weak",   bar: "bg-red-500",     text: "text-red-600"     },
  { maxScore: 2, label: "Fair",   bar: "bg-orange-400",  text: "text-orange-600"  },
  { maxScore: 4, label: "Good",   bar: "bg-blue-500",    text: "text-blue-600"    },
  { maxScore: 5, label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

function getLevel(score) {
  return LEVELS.find((l) => score <= l.maxScore) ?? LEVELS[LEVELS.length - 1];
}

function scorePassword(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[a-z]/.test(pw))        s++;
  if (/\d/.test(pw))           s++;
  if (/[@$!%*?&]/.test(pw))   s++;
  return s;
}

/**
 * PasswordStrengthBar
 * @param {string}  password
 * @param {string}  [confirmPassword]  — pass to show a "passwords match" hint
 */
export default function PasswordStrengthBar({ password, confirmPassword }) {
  if (!password) return null;

  const score  = scorePassword(password);
  const level  = getLevel(score);
  // segments filled = 1…4 mapped from score 1…5
  const filled = Math.max(1, Math.round((score / 5) * 4));

  const showMatch = confirmPassword !== undefined && confirmPassword.length > 0;
  const isMatch   = password === confirmPassword;

  return (
    <div className="space-y-2 pt-1">
      {/* Bar */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= filled ? level.bar : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold ${level.text}`}>{level.label}</span>
        {showMatch && (
          <span className={isMatch ? "text-emerald-600" : "text-slate-400"}>
            {isMatch ? "✓ Passwords match" : "Passwords do not match"}
          </span>
        )}
      </div>
    </div>
  );
}
