import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/UI.jsx";
import { api } from "../api/client.js";
import { useTranslation } from "react-i18next";

const cx = (...c) => c.filter(Boolean).join(" ");

const DEVELOPER_LINKEDIN = "https://www.linkedin.com/in/saher-saadi-a637b11b5/";

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavBadge({ count, mobile = false, active = false }) {
  if (!count || count < 1) return null;
  return (
    <span
      className={cx(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold",
        mobile ? "ml-auto bg-red-500 text-white" : active ? "bg-white text-sky-700" : "bg-red-500 text-white"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavItem({ to, onClick, children, mobile = false, badgeCount = 0, danger = false }) {
  const base = mobile
    ? "flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-150"
    : "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150";

  const idle = danger
    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
    : "text-slate-600 hover:bg-sky-50 hover:text-sky-700";

  const active = mobile
    ? "bg-sky-600 text-white"
    : "bg-sky-600 text-white hover:bg-sky-600 hover:text-white";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(base, idle)}>
        <span>{children}</span>
        <NavBadge count={badgeCount} mobile={mobile} />
      </button>
    );
  }

  return (
    <NavLink to={to} className={({ isActive }) => cx(base, isActive ? active : idle)}>
      {({ isActive }) => (
        <>
          <span>{children}</span>
          <NavBadge count={badgeCount} mobile={mobile} active={isActive} />
        </>
      )}
    </NavLink>
  );
}

function Brand() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-3">
      <div className={cx(
        "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
        "bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white",
        "shadow-[0_8px_24px_-8px_rgba(37,99,235,0.5)] ring-1 ring-sky-900/10",
        "transition-transform duration-300 group-hover:scale-105"
      )}>
        <span className="text-sm font-extrabold tracking-tight">TP</span>
      </div>
      <div className="hidden min-w-0 leading-tight sm:block">
        <div className="truncate text-base font-black tracking-tight text-slate-900">{t("brand.name")}</div>
        <div className="truncate text-xs text-slate-500">{t("brand.tagline")}</div>
      </div>
    </Link>
  );
}

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const toggle = () => {
    const next = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "he" ? "rtl" : "ltr";
  };
  return (
    <button
      type="button"
      onClick={toggle}
      title={t("language.switchTo")}
      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
    >
      <span>{t("language.current")}</span>
      <span className="text-slate-300">|</span>
      <span className="text-slate-400">{t("language.switchTo")}</span>
    </button>
  );
}

function HamburgerButton({ open, onClick }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
      aria-expanded={open}
      aria-controls="mobile-menu"
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
    >
      <div className="relative h-5 w-5">
        <span className={cx("absolute left-0 top-1   h-0.5 w-5 rounded-full bg-current transition-all", open && "top-2.5 rotate-45")} />
        <span className={cx("absolute left-0 top-2.5 h-0.5 w-5 rounded-full bg-current transition-all", open && "opacity-0")} />
        <span className={cx("absolute left-0 top-4   h-0.5 w-5 rounded-full bg-current transition-all", open && "top-2.5 -rotate-45")} />
      </div>
    </button>
  );
}

function FooterLink({ to, children }) {
  return <Link to={to} className="text-sm text-slate-500 transition hover:text-sky-700">{children}</Link>;
}

function FooterExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-slate-500 transition hover:text-sky-700">
      {children}
    </a>
  );
}

function Footer({ isLoggedIn, isAdmin }) {
  const { t } = useTranslation();
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">

          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.45)]">
                <span className="text-sm font-extrabold tracking-tight">TP</span>
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-slate-900">{t("brand.name")}</div>
                <div className="text-xs text-slate-500">{t("brand.tagline")}</div>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-600">{t("footer.description")}</p>
            <div className="rounded-3xl border border-sky-100 bg-sky-50/70 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">{t("footer.websiteDeveloper")}</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-800">{t("footer.developedBy")}</div>
              <a href={DEVELOPER_LINKEDIN} target="_blank" rel="noreferrer"
                className="mt-2.5 inline-flex items-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-500">
                {t("footer.viewLinkedIn")}
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">{t("footer.navigation")}</h3>
            <div className="mt-4 flex flex-col gap-3">
              <FooterLink to="/">{t("nav.home")}</FooterLink>
              <FooterLink to="/create">{t("nav.createTrip")}</FooterLink>
              {isLoggedIn && <FooterLink to="/trips">{t("nav.myTrips")}</FooterLink>}
              <FooterLink to="/hotels">{t("nav.hotels")}</FooterLink>
              <FooterLink to="/flights">{t("nav.flights")}</FooterLink>
              <FooterLink to="/attractions">{t("nav.attractions")}</FooterLink>
              <FooterLink to="/cars">{t("nav.cars")}</FooterLink>
              <FooterLink to="/contact">{t("nav.contact")}</FooterLink>
              {isLoggedIn && <FooterLink to="/profile">{t("nav.profile")}</FooterLink>}
              {isAdmin && <FooterLink to="/admin/dashboard">Dashboard</FooterLink>}
              {isAdmin && <FooterLink to="/admin/contacts">{t("nav.admin")}</FooterLink>}
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">{t("footer.support")}</h3>
            <div className="mt-4 flex flex-col gap-3">
              <FooterLink to="/contact">{t("footer.contactSupport")}</FooterLink>
              <FooterLink to="/faq">{t("footer.faq")}</FooterLink>
              <FooterLink to="/privacy">{t("footer.privacyPolicy")}</FooterLink>
              <FooterLink to="/terms">{t("footer.termsOfService")}</FooterLink>
              <FooterExternalLink href={DEVELOPER_LINKEDIN}>{t("footer.developerLinkedIn")}</FooterExternalLink>
            </div>
          </div>

          {/* CTA */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">{t("footer.startJourney")}</h3>
            <p className="mt-4 text-sm leading-6 text-slate-600">{t("footer.journeyDescription")}</p>
            <div className="mt-5 flex flex-col gap-3">
              <Link to="/create"
                className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-lg">
                {t("footer.createTrip")}
              </Link>
              <FooterExternalLink href={DEVELOPER_LINKEDIN}>{t("footer.developerLinkedIn")}</FooterExternalLink>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {t("brand.name")}. {t("footer.allRightsReserved")}</p>
          <p>
            {t("footer.designedBy")}{" "}
            <a href={DEVELOPER_LINKEDIN} target="_blank" rel="noreferrer" className="font-semibold text-sky-600 hover:text-sky-500">
              Saher Saadi
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function Layout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const { t } = useTranslation();

  const [mobileOpen, setMobileOpen]         = useState(false);
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);

  const isAdmin = user?.role === "admin";

  // Close mobile menu on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Poll unread reply count
  const loadUnreadCount = useCallback(async () => {
    if (!isLoggedIn) { setUnreadReplyCount(0); return; }
    try {
      const { data } = await api.get("/contact/my/messages/unread-count");
      setUnreadReplyCount(Number(data?.count || 0));
    } catch { setUnreadReplyCount(0); }
  }, [isLoggedIn]);

  useEffect(() => {
    loadUnreadCount();
    if (!isLoggedIn) return;
    const timer = setInterval(loadUnreadCount, 20_000);
    return () => clearInterval(timer);
  }, [loadUnreadCount, isLoggedIn]);

  const onLogout = async () => {
    await logout();
    setUnreadReplyCount(0);
    navigate("/login");
  };

  // Nav item arrays — memoized so they don't rebuild on every render
  const bookingItems = useMemo(() => [
    { to: "/hotels",      label: t("nav.hotels") },
    { to: "/flights",     label: t("nav.flights") },
    { to: "/attractions", label: t("nav.attractions") },
    { to: "/cars",        label: t("nav.cars") },
  ], [t]);

  const mainItems = useMemo(() => isLoggedIn ? [
    { to: "/",        label: t("nav.home") },
    { to: "/create",  label: t("nav.createTrip") },
    { to: "/trips",   label: t("nav.myTrips") },
    { to: "/contact", label: t("nav.contact") },
    { to: "/profile", label: t("nav.profile"), badgeCount: unreadReplyCount },
  ] : [
    { to: "/",         label: t("nav.home") },
    { to: "/contact",  label: t("nav.contact") },
    { to: "/login",    label: t("nav.login") },
    { to: "/register", label: t("nav.register") },
  ], [isLoggedIn, t, unreadReplyCount]);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-white to-slate-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.2)] backdrop-blur-xl">

        {/* Main nav row */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">

            <Brand />

            {/* Desktop nav — visible at lg+ */}
            <nav className="hidden items-center gap-0.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm lg:flex">
              {mainItems.map((item) => (
                <NavItem key={item.to} to={item.to} badgeCount={item.badgeCount || 0}>
                  {item.label}
                </NavItem>
              ))}
              {isLoggedIn && isAdmin && (
                <>
                  <NavItem to="/admin/dashboard">Dashboard</NavItem>
                  <NavItem to="/admin/contacts">{t("nav.admin")}</NavItem>
                </>
              )}
            </nav>

            {/* Desktop right side */}
            <div className="hidden items-center gap-2 lg:flex">
              <LanguageSwitcher />
              {isLoggedIn ? (
                <>
                  {/* User avatar pill */}
                  <div className="hidden items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-slate-700 xl:flex">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                      {String(user?.name || "T").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-32 truncate">{user?.name || "Traveler"}</span>
                  </div>
                  <Button variant="secondary" onClick={onLogout} className="py-2">
                    {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <Link to="/create"
                  className="inline-flex items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-lg">
                  {t("nav.planTrip")}
                </Link>
              )}
            </div>

            {/* Mobile right side — hamburger + lang */}
            <div className="flex items-center gap-2 lg:hidden">
              <LanguageSwitcher />
              <HamburgerButton open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
            </div>
          </div>
        </div>

        {/* Booking tab strip — desktop only */}
        <div className="hidden border-t border-slate-100 bg-white/60 lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-4 py-1 sm:px-6">
            {bookingItems.map((item) => (
              <NavItem key={item.to} to={item.to}>{item.label}</NavItem>
            ))}
          </div>
        </div>

        {/* Mobile menu drawer */}
        <div
          id="mobile-menu"
          className={cx(
            "overflow-hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl transition-all duration-300 lg:hidden",
            mobileOpen ? "max-h-175 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">

            {/* User info card */}
            {isLoggedIn && (
              <div className="rounded-3xl border border-sky-100 bg-sky-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                    {String(user?.name || "T").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {t("header.welcome", { name: user?.name || "Traveler" })}
                    </div>
                    {user?.email && <div className="truncate text-xs text-slate-500">{user.email}</div>}
                  </div>
                  {isAdmin && (
                    <span className="ml-auto shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                      {t("nav.admin")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Booking links */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {t("nav.bookTravel")}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {bookingItems.map((item) => (
                  <NavItem key={item.to} to={item.to} mobile>{item.label}</NavItem>
                ))}
              </div>
            </div>

            {/* Main nav links */}
            <nav className="grid gap-1.5">
              {mainItems.map((item) => (
                <NavItem key={item.to} to={item.to} mobile badgeCount={item.badgeCount || 0}>
                  {item.label}
                </NavItem>
              ))}
              {isLoggedIn && isAdmin && (
                <>
                  <NavItem to="/admin/dashboard" mobile>Dashboard</NavItem>
                  <NavItem to="/admin/contacts" mobile>{t("nav.adminContacts")}</NavItem>
                </>
              )}
            </nav>

            {/* Bottom actions */}
            {isLoggedIn ? (
              <NavItem onClick={onLogout} mobile danger>{t("nav.logout")}</NavItem>
            ) : (
              <Link to="/create"
                className="flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg">
                {t("nav.planTrip")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Email verification banner */}
      {isLoggedIn && user && !user.verified && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-semibold text-amber-800 sm:px-6">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-300 text-xs font-black">!</span>
            <span>
              {t("header.emailNotVerified")}{" "}
              <Link to="/profile" className="font-bold underline underline-offset-2 hover:text-amber-900">
                {t("header.verifyNow")}
              </Link>
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>

      <Footer isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
    </div>
  );
}
