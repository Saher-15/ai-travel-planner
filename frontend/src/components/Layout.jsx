import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const cx = (...c) => c.filter(Boolean).join(" ");

function NavItem({ to, onClick, children, mobile = false }) {
  const base = mobile
    ? "flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold transition"
    : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition";

  const idle = "text-slate-700 hover:bg-slate-100";
  const active = mobile
    ? "bg-slate-900 text-white shadow-sm"
    : "bg-slate-900 text-white shadow-sm hover:bg-slate-900";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(base, idle)}>
        {children}
      </button>
    );
  }

  return (
    <NavLink to={to} className={({ isActive }) => cx(base, isActive ? active : idle)}>
      {children}
    </NavLink>
  );
}

function Brand() {
  return (
    <Link to="/" className="group flex items-center gap-3">
      <div
        className={cx(
          "grid h-11 w-11 place-items-center rounded-2xl",
          "bg-linear-to-br from-slate-950 via-slate-800 to-slate-700 text-white",
          "shadow-[0_10px_30px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10",
          "transition duration-300 group-hover:scale-[1.03]"
        )}
      >
        <span className="text-sm font-extrabold tracking-tight">TP</span>
      </div>

      <div className="leading-tight">
        <div className="text-base font-black tracking-tight text-slate-900">
          Travel Planner
        </div>
        <div className="text-xs text-slate-500">AI-powered trip generation</div>
      </div>
    </Link>
  );
}

function MobileMenuButton({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
    >
      <div className="relative h-5 w-5">
        <span
          className={cx(
            "absolute left-0 top-1 h-0.5 w-5 rounded-full bg-current transition",
            open && "top-2.5 rotate-45"
          )}
        />
        <span
          className={cx(
            "absolute left-0 top-2.5 h-0.5 w-5 rounded-full bg-current transition",
            open && "opacity-0"
          )}
        />
        <span
          className={cx(
            "absolute left-0 top-4 h-0.5 w-5 rounded-full bg-current transition",
            open && "top-2.5 -rotate-45"
          )}
        />
      </div>
    </button>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => setMobileOpen(false);

  const onLogout = async () => {
    closeMobileMenu();
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Brand />

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-sm">
              {isLoggedIn ? (
                <>
                  <NavItem to="/">Home</NavItem>
                  <NavItem to="/contact">Contact</NavItem>
                  <NavItem to="/create">Create</NavItem>
                  <NavItem to="/trips">My Trips</NavItem>
                  <NavItem to="/profile">Profile</NavItem>
                </>
              ) : (
                <>
                  <NavItem to="/">Home</NavItem>
                  <NavItem to="/contact">Contact</NavItem>
                  <NavItem to="/login">Login</NavItem>
                  <NavItem to="/register">Register</NavItem>
                </>
              )}
            </nav>

            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  Welcome, {user?.name || "Traveler"} 👋
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <MobileMenuButton open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
        </div>

        {/* MOBILE DROPDOWN */}
        <div
          className={cx(
            "overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl transition-all duration-300 md:hidden",
            mobileOpen ? "max-h-130 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="space-y-3 px-4 py-4">
            {isLoggedIn && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Signed in
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  Welcome, {user?.name || "Traveler"} 👋
                </div>
              </div>
            )}

            <nav className="grid gap-2">
              {isLoggedIn ? (
                <>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/" mobile>
                      Home
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/contact" mobile>
                      Contact
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/create" mobile>
                      Create
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/trips" mobile>
                      My Trips
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/profile" mobile>
                      Profile
                    </NavItem>
                  </div>
                  <NavItem onClick={onLogout} mobile>
                    Logout
                  </NavItem>
                </>
              ) : (
                <>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/" mobile>
                      Home
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/contact" mobile>
                      Contact
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/login" mobile>
                      Login
                    </NavItem>
                  </div>
                  <div onClick={closeMobileMenu}>
                    <NavItem to="/register" mobile>
                      Register
                    </NavItem>
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* EMAIL VERIFICATION BANNER */}
      {isLoggedIn && user && !user.verified && (
        <div className="border-b border-amber-300 bg-linear-to-r from-amber-50 to-yellow-50">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-3 text-center text-sm font-semibold text-amber-800">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs">
              !
            </span>
            <span>
              Your email is not verified.{" "}
              <Link to="/profile" className="font-bold underline underline-offset-2">
                Verify now →
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}