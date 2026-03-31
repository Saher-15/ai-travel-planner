const LEVELS = [
  { maxScore: 1, label: "Weak",   bar: "bg-red-500",     text: "text-red-600"     },
  { maxScore: 2, label: "Fair",   bar: "bg-orange-400",  text: "text-orange-600"  },
  { maxScore: 4, label: "Good",   bar: "bg-blue-500",    text: "text-blue-600"    },
  { maxScore: 5, label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

const REQUIREMENTS = [
  { key: "minLength", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper",     label: "Uppercase letter",       test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower",     label: "Lowercase letter",       test: (pw) => /[a-z]/.test(pw) },
  { key: "number",    label: "Number",                 test: (pw) => /\d/.test(pw) },
  { key: "special",   label: "Special character (@$!%*?&)", test: (pw) => /[@$!%*?&]/.test(pw) },
];

function getLevel(score) {
  return LEVELS.find((l) => score <= l.maxScore) ?? LEVELS[LEVELS.length - 1];
}

/**
 * PasswordStrengthBar
 * @param {string}  password
 * @param {string}  [confirmPassword]  — pass to show a "passwords match" requirement
 */
export default function PasswordStrengthBar({ password, confirmPassword }) {
  if (!password) return null;

  const checks = REQUIREMENTS.map((r) => ({ ...r, ok: r.test(password) }));
  const score  = checks.filter((r) => r.ok).length;
  const level  = getLevel(score);
  const filled = Math.max(1, Math.round((score / 5) * 4));

  const showMatch = confirmPassword !== undefined && confirmPassword.length > 0;
  const isMatch   = password === confirmPassword;

  return (
    <div className="space-y-3 pt-1">
      {/* Strength bar */}
      <div className="space-y-1.5">
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
        <div className="flex items-center justify-between text-xs">
          <span className={`font-semibold ${level.text}`}>{level.label}</span>
          {showMatch && (
            <span className={isMatch ? "text-emerald-600" : "text-slate-400"}>
              {isMatch ? "✓ Passwords match" : "Passwords do not match"}
            </span>
          )}
        </div>
      </div>

      {/* Requirements */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {checks.map((r) => (
          <div key={r.key} className="flex items-center gap-2 text-xs">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black transition-all duration-200 ${
              r.ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-200"
            }`}>✓</span>
            <span className={r.ok ? "text-emerald-600" : "text-slate-400"}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
