const cx = (...classes) => classes.filter(Boolean).join(" ");

export function Card({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-4px_rgba(15,23,42,0.08),0_8px_24px_-8px_rgba(15,23,42,0.06)]",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-6px_rgba(15,23,42,0.13),0_16px_40px_-12px_rgba(15,23,42,0.09)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right, className = "" }) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={cx("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const variants = {
    primary:
      "bg-linear-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-200/60 " +
      "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-300/50 hover:from-sky-400 hover:to-blue-500 " +
      "active:translate-y-0 active:shadow-md",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm " +
      "hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md hover:text-slate-900 " +
      "active:translate-y-0",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger:
      "bg-linear-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-200/60 " +
      "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-300/50 hover:from-rose-400 hover:to-rose-500 " +
      "active:translate-y-0",
  };

  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold",
        "transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-md",
        variants[variant] || variants.primary,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1.5 text-sm font-semibold text-slate-700">{label}</div>
      ) : null}

      <input
        className={cx(
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800",
          "shadow-sm transition-all duration-200 placeholder:text-slate-400",
          "focus:border-sky-400 focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)] focus:outline-none",
          "hover:border-slate-300",
          className
        )}
        {...props}
      />

      {hint ? <div className="mt-1.5 text-xs text-slate-500">{hint}</div> : null}
    </label>
  );
}

export function Select({ label, className = "", children, ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="mb-1.5 text-sm font-semibold text-slate-700">{label}</div>
      ) : null}

      <select
        className={cx(
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800",
          "shadow-sm transition-all duration-200",
          "focus:border-sky-400 focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)] focus:outline-none",
          "hover:border-slate-300",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({ children, className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1",
        "text-xs font-semibold text-sky-700 shadow-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Alert({ type = "info", children, className = "" }) {
  const variants = {
    info:    "border-blue-200   bg-blue-50   text-blue-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error:   "border-rose-200   bg-rose-50   text-rose-800",
    warning: "border-amber-200  bg-amber-50  text-amber-800",
  };

  return (
    <div
      className={cx(
        "rounded-2xl border px-4 py-3.5 text-sm leading-relaxed shadow-sm",
        variants[type] || variants.info,
        className
      )}
    >
      {children}
    </div>
  );
}
