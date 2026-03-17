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
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        mobile ? "ml-auto bg-red-500 text-white" : active ? "bg-white/90 text-sky-700" : "bg-red-500 text-white"
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavItem({ to, onClick, children, mobile = false, badgeCount = 0, danger = false }) {
  const base = mobile
    ? "flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150"
    : "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150";

  const idle = danger
    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
    : "text-slate-600 hover:bg-sky-50 hover:text-sky-700";

  const active = mobile
    ? "bg-linear-to-r from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-200"
    : "bg-sky-600 text-white shadow-sm shadow-sky-200/60";

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
        "bg-linear-to-br from-sky-400 via-blue-500 to-indigo-600 text-white",
        "shadow-[0_6px_20px_-6px_rgba(37,99,235,0.6)] ring-1 ring-white/20",
        "transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_8px_24px_-4px_rgba(37,99,235,0.7)]"
      )}>
        <span className="text-sm font-black tracking-tight">TP</span>
      </div>
      <div className="hidden min-w-0 leading-tight sm:block">
        <div className="truncate text-base font-black tracking-tight text-slate-900">{t("brand.name")}</div>
        <div className="truncate text-[11px] font-medium text-slate-400">{t("brand.tagline")}</div>
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
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 hover:shadow-md"
    >
      <span className="text-sm">{i18n.language === "he" ? "🇮🇱" : "🇺🇸"}</span>
      <span>{t("language.current")}</span>
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 lg:hidden"
    >
      <div className="relative h-4.5 w-5">
        <span className={cx("absolute left-0 top-0    h-0.5 w-5 rounded-full bg-current transition-all duration-300", open && "top-2 rotate-45")} />
        <span className={cx("absolute left-0 top-2    h-0.5 w-5 rounded-full bg-current transition-all duration-300", open && "opacity-0 scale-x-0")} />
        <span className={cx("absolute left-0 top-4    h-0.5 w-5 rounded-full bg-current transition-all duration-300", open && "top-2 -rotate-45")} />
      </div>
    </button>
  );
}

function BookingTab({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 whitespace-nowrap",
          isActive
            ? "bg-sky-600 text-white shadow-sm shadow-sky-200/50"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        )
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function FooterLink({ to, children }) {
  return (
    <Link to={to} className="group flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-sky-600">
      <span className="h-px w-0 rounded-full bg-sky-500 transition-all duration-200 group-hover:w-3" />
      {children}
    </Link>
  );
}

function FooterExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      className="group flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-sky-600">
      <span className="h-px w-0 rounded-full bg-sky-500 transition-all duration-200 group-hover:w-3" />
      {children}
    </a>
  );
}

function Footer({ isLoggedIn, isAdmin }) {
  const { t } = useTranslation();
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-slate-200">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-linear-to-b from-white via-slate-50 to-slate-100" />
      <div className="absolute inset-0 bg-linear-to-br from-sky-50/40 via-transparent to-indigo-50/30" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">

          {/* Brand column */}
          <div className="space-y-5">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.55)]">
                <span className="text-sm font-black tracking-tight">TP</span>
              </div>
              <div>
                <div className="text-base font-black tracking-tight text-slate-900">{t("brand.name")}</div>
                <div className="text-[11px] font-medium text-slate-400">{t("brand.tagline")}</div>
              </div>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-slate-500">{t("footer.description")}</p>

            {/* Stats row */}
            <div className="flex gap-4">
              {[
                { value: "100+", label: "Destinations" },
                { value: "AI", label: "Powered" },
                { value: "Free", label: "Forever" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-base font-black text-sky-600">{value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Developer card */}
            <div className="rounded-3xl border border-sky-100 bg-linear-to-br from-sky-50 to-blue-50 p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">{t("footer.websiteDeveloper")}</div>
              <div className="mt-1.5 text-sm font-bold text-slate-800">{t("footer.developedBy")}</div>
              <a href={DEVELOPER_LINKEDIN} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-md">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                {t("footer.viewLinkedIn")}
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">{t("footer.navigation")}</h3>
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
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">{t("footer.support")}</h3>
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
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">{t("footer.startJourney")}</h3>
            <p className="mt-4 text-sm leading-6 text-slate-500">{t("footer.journeyDescription")}</p>
            <div className="mt-5 space-y-3">
              <Link to="/create"
                className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-200/50 transition hover:-translate-y-0.5 hover:shadow-lg">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t("footer.createTrip")}
              </Link>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {["✈️ AI-Powered", "🗺️ Itineraries", "🆓 Free"].map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} <span className="font-semibold text-slate-600">{t("brand.name")}</span>. {t("footer.allRightsReserved")}
          </p>
          <p className="text-xs text-slate-400">
            {t("footer.designedBy")}{" "}
            <a href={DEVELOPER_LINKEDIN} target="_blank" rel="noreferrer"
              className="font-bold text-sky-600 transition hover:text-sky-500">
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

  const [mobileOpen, setMobileOpen]             = useState(false);
  const [unreadReplyCount, setUnreadReplyCount] = useState(0);
  const [scrolled, setScrolled]                 = useState(false);

  const isAdmin = user?.role === "admin";

  // Track scroll for header shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    { to: "/contact", label: t("nav.contact") },
    { to: "/profile", label: t("nav.profile"), badgeCount: unreadReplyCount },
  ] : [
    { to: "/",         label: t("nav.home") },
    { to: "/contact",  label: t("nav.contact") },
    { to: "/login",    label: t("nav.login") },
    { to: "/register", label: t("nav.register") },
  ], [isLoggedIn, t, unreadReplyCount]);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/80 via-white to-slate-100">

      {/* ── Header ── */}
      <header className={cx(
        "sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-shadow duration-300",
        scrolled ? "shadow-[0_4px_24px_-8px_rgba(15,23,42,0.18)]" : "shadow-none"
      )}>

        {/* Main nav row */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">

            <Brand />

            {/* Desktop nav pill */}
            <nav className="hidden items-center gap-0.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1 shadow-inner lg:flex">
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
                  <div className="hidden items-center gap-2 rounded-2xl border border-sky-100 bg-linear-to-r from-sky-50 to-blue-50 px-3 py-1.5 text-sm font-semibold text-slate-700 xl:flex">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-blue-600 text-xs font-bold text-white shadow-sm">
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-200/60 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t("nav.planTrip")}
                </Link>
              )}
            </div>

            {/* Mobile right side */}
            <div className="flex items-center gap-2 lg:hidden">
              <LanguageSwitcher />
              <HamburgerButton open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
            </div>
          </div>
        </div>

        {/* Booking tab strip — desktop only */}
        <div className="hidden border-t border-slate-100/80 bg-white/70 lg:block">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
            <span className="mr-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {t("nav.bookTravel")}
            </span>
            {bookingItems.map((item) => (
              <BookingTab key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </div>
        </div>

        {/* Mobile menu drawer */}
        <div
          id="mobile-menu"
          className={cx(
            "overflow-hidden border-t border-slate-200/80 bg-white/98 backdrop-blur-xl transition-all duration-300 lg:hidden",
            mobileOpen ? "max-h-150 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4 sm:px-6">

            {/* User info card */}
            {isLoggedIn && (
              <div className="overflow-hidden rounded-3xl border border-sky-100 bg-linear-to-r from-sky-50 to-blue-50">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-sm">
                    {String(user?.name || "T").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {t("header.welcome", { name: user?.name || "Traveler" })}
                    </div>
                    {user?.email && <div className="truncate text-xs text-slate-500">{user.email}</div>}
                  </div>
                  {isAdmin && (
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                      {t("nav.admin")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Booking grid */}
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80">
              <div className="px-4 pb-3 pt-3.5">
                <div className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t("nav.bookTravel")}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {bookingItems.map((item) => (
                    <NavItem key={item.to} to={item.to} mobile>{item.icon} {item.label}</NavItem>
                  ))}
                </div>
              </div>
            </div>

            {/* Main nav */}
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

            {/* Bottom action */}
            {isLoggedIn ? (
              <NavItem onClick={onLogout} mobile danger>{t("nav.logout")}</NavItem>
            ) : (
              <Link to="/create"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg">
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
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-white shadow-sm">!</span>
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
