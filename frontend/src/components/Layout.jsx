import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client.js";
import { useTranslation } from "react-i18next";
import AccessibilityWidget from "./AccessibilityWidget.jsx";

const cx = (...c) => c.filter(Boolean).join(" ");
const DEVELOPER_LINKEDIN = "https://www.linkedin.com/in/saher-saadi-a637b11b5/";

// ─── Brand ────────────────────────────────────────────────────────────────────

function Brand() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="group flex shrink-0 items-center gap-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_24px_rgba(56,189,248,0.45)] ring-1 ring-white/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_32px_rgba(56,189,248,0.6)]">
        <span className="text-sm font-black tracking-tight">TP</span>
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 shadow-sm" />
      </div>
      <div className="hidden min-w-0 leading-tight sm:block">
        <div className="truncate text-base font-black tracking-tight text-white">{t("brand.name")}</div>
        <div className="truncate text-[10px] font-medium text-white/40">{t("brand.tagline")}</div>
      </div>
    </Link>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

function NavItem({ to, onClick, children, mobile = false, badgeCount = 0, danger = false }) {
  const baseDesktop = "relative flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold transition-all duration-150 rounded-xl";
  const baseMobile  = "flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150";

  const idleDesktop = danger
    ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
    : "text-white/70 hover:bg-white/10 hover:text-white";
  const idleMobile = danger
    ? "text-rose-600 hover:bg-rose-50"
    : "text-slate-700 hover:bg-sky-50 hover:text-sky-700";

  const activeDesktop = "bg-white/15 text-white shadow-inner";
  const activeMobile  = "bg-linear-to-r from-sky-500 to-blue-600 text-white shadow-sm";

  if (onClick) {
    return (
      <button type="button" onClick={onClick}
        className={cx(mobile ? baseMobile : baseDesktop, mobile ? idleMobile : idleDesktop)}>
        {children}
        {badgeCount > 0 && (
          <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <NavLink to={to}
      className={({ isActive }) =>
        cx(mobile ? baseMobile : baseDesktop, isActive
          ? (mobile ? activeMobile : activeDesktop)
          : (mobile ? idleMobile : idleDesktop))
      }>
      {({ isActive }) => (
        <>
          {children}
          {badgeCount > 0 && (
            <span className={cx(
              "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              mobile ? "bg-red-500 text-white" : isActive ? "bg-white/90 text-sky-700" : "bg-red-500 text-white"
            )}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── Booking tab ──────────────────────────────────────────────────────────────

function BookingTab({ to, icon, label }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        cx(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150",
          isActive
            ? "bg-white/15 text-white"
            : "text-white/50 hover:bg-white/10 hover:text-white/80"
        )
      }>
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

// ─── Hamburger ────────────────────────────────────────────────────────────────

function HamburgerButton({ open, onClick }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick}
      aria-label={open ? t("header.closeMenu") : t("header.openMenu")}
      aria-expanded={open}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 lg:hidden">
      <div className="relative h-4 w-5">
        <span className={cx("absolute left-0 top-0   h-0.5 w-5 rounded-full bg-current transition-all duration-300", open && "top-2 rotate-45")} />
        <span className={cx("absolute left-0 top-2   h-0.5 w-5 rounded-full bg-current transition-all duration-300", open && "opacity-0 scale-x-0")} />
        <span className={cx("absolute left-0 top-4   h-0.5 w-5 rounded-full bg-current transition-all duration-300", open && "top-2 -rotate-45")} />
      </div>
    </button>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterLink({ to, children }) {
  return (
    <Link to={to}
      className="group flex items-center gap-2 text-sm text-white/50 transition-all duration-150 hover:text-white">
      <span className="h-px w-0 rounded-full bg-sky-400 transition-all duration-200 group-hover:w-3" />
      {children}
    </Link>
  );
}

function FooterExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="group flex items-center gap-2 text-sm text-white/50 transition-all duration-150 hover:text-white">
      <span className="h-px w-0 rounded-full bg-sky-400 transition-all duration-200 group-hover:w-3" />
      {children}
    </a>
  );
}

function Footer({ isLoggedIn, isAdmin }) {
  const { t } = useTranslation();
  return (
    <footer role="contentinfo" className="relative overflow-hidden bg-slate-950 text-white">
      {/* Top glow */}
      <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-sky-500/8 blur-3xl" />
      <div className="absolute -right-16 top-16 h-64 w-64 rounded-full bg-indigo-500/8 blur-3xl" />

      {/* Divider line with gradient */}
      <div className="h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4">

          {/* Brand column */}
          <div className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_24px_rgba(56,189,248,0.35)] ring-1 ring-white/10 transition-all duration-300 group-hover:shadow-[0_0_32px_rgba(56,189,248,0.5)]">
                <span className="text-sm font-black tracking-tight">TP</span>
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-white">{t("brand.name")}</div>
                <div className="text-[11px] font-medium text-white/40">{t("brand.tagline")}</div>
              </div>
            </Link>

            <p className="max-w-xs text-sm leading-7 text-white/50">{t("footer.description")}</p>

            {/* Stats */}
            <div className="flex gap-5">
              {[
                { value: "100+", label: "Destinations" },
                { value: "AI",   label: "Powered" },
                { value: "Free", label: "Forever" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-lg font-black text-sky-400">{value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</div>
                </div>
              ))}
            </div>

            {/* Developer card */}
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">{t("footer.websiteDeveloper")}</div>
              <div className="mt-1 text-sm font-bold text-white">{t("footer.developedBy")}</div>
              <a href={DEVELOPER_LINKEDIN} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-900/40 transition hover:-translate-y-0.5 hover:shadow-sky-900/60">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                {t("footer.viewLinkedIn")}
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">{t("footer.navigation")}</h3>
            <div className="mt-5 flex flex-col gap-3">
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
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">{t("footer.support")}</h3>
            <div className="mt-5 flex flex-col gap-3">
              <FooterLink to="/contact">{t("footer.contactSupport")}</FooterLink>
              <FooterLink to="/faq">{t("footer.faq")}</FooterLink>
              <FooterLink to="/privacy">{t("footer.privacyPolicy")}</FooterLink>
              <FooterLink to="/terms">{t("footer.termsOfService")}</FooterLink>
              <FooterExternalLink href={DEVELOPER_LINKEDIN}>{t("footer.developerLinkedIn")}</FooterExternalLink>
            </div>
          </div>

          {/* CTA */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">{t("footer.startJourney")}</h3>
            <p className="mt-4 text-sm leading-7 text-white/50">{t("footer.journeyDescription")}</p>
            <div className="mt-5 space-y-3">
              <Link to="/create"
                className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:-translate-y-0.5 hover:shadow-sky-900/60">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t("footer.createTrip")}
              </Link>
              <div className="flex flex-wrap gap-2">
                {["✈️ AI-Powered", "🗺️ Itineraries", "🆓 Free"].map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/50">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} <span className="font-semibold text-white/50">{t("brand.name")}</span>. {t("footer.allRightsReserved")}
          </p>
          <p className="text-xs text-white/30">
            {t("footer.designedBy")}{" "}
            <a href={DEVELOPER_LINKEDIN} target="_blank" rel="noreferrer"
              className="font-bold text-sky-400 transition hover:text-sky-300">
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
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const { t } = useTranslation();

  const [mobileOpen, setMobileOpen]             = useState(false);
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);
  const [scrolled, setScrolled]                 = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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

  const bookingItems = useMemo(() => [
    { to: "/hotels",      icon: "🏨", label: t("nav.hotels") },
    { to: "/flights",     icon: "✈️", label: t("nav.flights") },
    { to: "/attractions", icon: "🗺️", label: t("nav.attractions") },
    { to: "/cars",        icon: "🚗", label: t("nav.cars") },
  ], [t]);

  const mainItems = useMemo(() => isLoggedIn ? [
    { to: "/",        label: t("nav.home") },
    { to: "/create",  label: t("nav.createTrip") },
    { to: "/trips",   label: t("nav.myTrips") },
    { to: "/profile", label: t("nav.profile"), badgeCount: unreadReplyCount },
  ] : [
    { to: "/",         label: t("nav.home") },
    { to: "/login",    label: t("nav.login") },
    { to: "/register", label: t("nav.register") },
  ], [isLoggedIn, t, unreadReplyCount]);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/80 via-white to-slate-100">

      {/* ── Skip navigation (WCAG 2.1 AA – 2.4.1) ── */}
      <a href="#main-content" className="skip-nav">Skip to main content</a>

      {/* ── Header ── */}
      <header role="banner" className={cx(
        "sticky top-0 z-50 bg-slate-950/95 backdrop-blur-2xl transition-all duration-300",
        scrolled ? "shadow-[0_4px_40px_-8px_rgba(0,0,0,0.5)]" : "shadow-none"
      )}>
        {/* Subtle top accent line */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-sky-500/60 to-transparent" />

        {/* Main nav row */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">

            <Brand />

            {/* Desktop nav */}
            <nav aria-label="Main navigation" className="hidden items-center gap-0.5 lg:flex">
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

            {/* Desktop right */}
            <div className="hidden items-center gap-3 lg:flex">
                {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-1.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-blue-600 text-xs font-bold text-white shadow-sm">
                      {String(user?.name || "T").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden max-w-28 truncate text-sm font-semibold text-white/80 xl:block">
                      {user?.name || "Traveler"}
                    </span>
                  </div>
                  <button onClick={onLogout} type="button"
                    className="rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/15 hover:text-white">
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <Link to="/create"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(56,189,248,0.55)]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t("nav.planTrip")}
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              <HamburgerButton open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
            </div>
          </div>
        </div>

        {/* Booking strip */}
        {bookingItems.length > 0 && (
          <div className="hidden border-t border-white/6 lg:block">
            <div className="mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-4 py-1 sm:px-6">
              <span className="mr-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                {t("nav.bookTravel")}
              </span>
              {bookingItems.map((item) => (
                <BookingTab key={item.to} to={item.to} icon={item.icon} label={item.label} />
              ))}
            </div>
          </div>
        )}

        {/* Mobile drawer */}
        <div className={cx(
          "overflow-hidden border-t border-white/8 bg-slate-950/98 backdrop-blur-2xl transition-all duration-300 lg:hidden",
          mobileOpen ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">

            {/* User card */}
            {isLoggedIn && (
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/5">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-sm">
                    {String(user?.name || "T").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {t("header.welcome", { name: user?.name || "Traveler" })}
                    </div>
                    {user?.email && <div className="truncate text-xs text-white/40">{user.email}</div>}
                  </div>
                  {isAdmin && (
                    <span className="shrink-0 rounded-full bg-indigo-500/20 px-2.5 py-1 text-[10px] font-bold text-indigo-300">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Booking grid */}
            {bookingItems.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/5">
                <div className="px-4 pb-3 pt-3.5">
                  <div className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                    {t("nav.bookTravel")}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {bookingItems.map((item) => (
                      <NavLink key={item.to} to={item.to}
                        className={({ isActive }) => cx(
                          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                          isActive ? "bg-sky-500/20 text-sky-300" : "text-white/60 hover:bg-white/8 hover:text-white"
                        )}>
                        {item.icon} {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Main nav */}
            <nav aria-label="Mobile navigation" className="overflow-hidden rounded-2xl border border-white/8 bg-white/5">
              <div className="grid divide-y divide-white/5">
                {mainItems.map((item) => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => cx(
                      "flex items-center justify-between px-4 py-3 text-sm font-semibold transition",
                      isActive ? "bg-sky-500/15 text-sky-300" : "text-white/70 hover:bg-white/8 hover:text-white"
                    )}>
                    {item.label}
                    {item.badgeCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.badgeCount > 99 ? "99+" : item.badgeCount}
                      </span>
                    )}
                  </NavLink>
                ))}
                {isLoggedIn && isAdmin && (
                  <>
                    <NavLink to="/admin/dashboard"
                      className={({ isActive }) => cx("px-4 py-3 text-sm font-semibold transition",
                        isActive ? "bg-sky-500/15 text-sky-300" : "text-white/70 hover:bg-white/8 hover:text-white")}>
                      Dashboard
                    </NavLink>
                    <NavLink to="/admin/contacts"
                      className={({ isActive }) => cx("px-4 py-3 text-sm font-semibold transition",
                        isActive ? "bg-sky-500/15 text-sky-300" : "text-white/70 hover:bg-white/8 hover:text-white")}>
                      {t("nav.adminContacts")}
                    </NavLink>
                  </>
                )}
              </div>
            </nav>

            {/* Bottom action */}
            {isLoggedIn ? (
              <button onClick={onLogout} type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                {t("nav.logout")}
              </button>
            ) : (
              <Link to="/create"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:shadow-sky-900/60">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t("nav.planTrip")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Email verification banner */}
      {isLoggedIn && user && !user.verified && (
        <div className="border-b border-amber-200 bg-linear-to-r from-amber-50 to-yellow-50">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-semibold text-amber-800 sm:px-6">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-white">!</span>
            <span>
              {t("header.emailNotVerified")}{" "}
              <Link to="/profile" className="font-bold underline underline-offset-2 hover:text-amber-900">
                {t("header.verifyNow")}
              </Link>
            </span>
          </div>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {children}
      </main>

      <Footer isLoggedIn={isLoggedIn} isAdmin={isAdmin} />

      <AccessibilityWidget />
    </div>
  );
}
