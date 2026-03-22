import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, LogOut, MailCheck, MessageSquareText, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Input } from "../components/UI.jsx";
import { useTranslation } from "react-i18next";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function truncateText(text, max = 60) {
  const str = String(text || "");
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder, autoComplete = "current-password" }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete}
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
        <button type="button" onClick={onToggle} aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-sky-600">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ ok, text }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors duration-200 ${ok ? "text-emerald-600" : "text-slate-400"}`}>
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-black transition-all duration-200 ${
        ok ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200" : "bg-slate-200 text-slate-200"
      }`}>✓</span>
      <span>{text}</span>
    </div>
  );
}

const SUPPORT_PAGE_SIZE = 6;

export default function Profile() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const nav = useNavigate();
  const { user, logout } = useAuth();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const [supportItems, setSupportItems] = useState([]);
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportError, setSupportError] = useState("");
  const [selectedSupportId, setSelectedSupportId] = useState(null);

  const [supportQuery, setSupportQuery] = useState("");
  const [supportFilter, setSupportFilter] = useState("all");
  const [supportSort, setSupportSort] = useState("newest");
  const [supportPage, setSupportPage] = useState(1);

  const showMessage = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  function isStrongPassword(pw) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pw);
  }

  const passwordChecks = useMemo(() => ({
    minLength: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[@$!%*?&]/.test(newPassword),
    matches: newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword,
  }), [newPassword, confirmPassword]);

  const canChangePassword = useMemo(() => (
    !passwordLoading && oldPassword.trim().length > 0 && newPassword.trim().length > 0 && confirmPassword.trim().length > 0
  ), [oldPassword, newPassword, confirmPassword, passwordLoading]);

  async function loadMySupportMessages() {
    setSupportLoading(true);
    setSupportError("");
    try {
      const { data } = await api.get("/contact/my/messages");
      const items = Array.isArray(data) ? data : [];
      setSupportItems(items);

      if (items.length && !selectedSupportId) {
        setSelectedSupportId(items[0]._id);
      } else if (items.length && selectedSupportId) {
        const stillExists = items.some((item) => item._id === selectedSupportId);
        if (!stillExists) setSelectedSupportId(items[0]._id);
      }

      const hasUnreadReplies = items.some((item) => item.status === "replied" && item.adminReply && item.userReplySeen === false);
      if (hasUnreadReplies) {
        await api.patch("/contact/my/messages/mark-replies-seen");
        setSupportItems((prev) => prev.map((item) =>
          item.status === "replied" && item.adminReply ? { ...item, userReplySeen: true } : item
        ));
      }
    } catch (err) {
      setSupportError(err?.response?.data?.message || t("profile.supportInbox.errors.loadFailed"));
    } finally {
      setSupportLoading(false);
    }
  }

  useEffect(() => { loadMySupportMessages(); }, []);

  const onChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showMessage(t("profile.changePassword.errors.fillAll"), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage(t("profile.changePassword.errors.noMatch"), "error");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      showMessage(t("profile.changePassword.errors.weak"), "error");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", { oldPassword, newPassword });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setShowOldPassword(false); setShowNewPassword(false); setShowConfirmPassword(false);
      showMessage(t("profile.changePassword.errors.success"));
    } catch (err) {
      showMessage(err?.response?.data?.message || t("profile.changePassword.errors.failed"), "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const onResendVerification = async () => {
    try {
      const { data } = await api.post("/auth/resend-verification");
      showMessage(data.message || t("profile.accountOverview.resendVerification"));
    } catch (err) {
      showMessage(err?.response?.data?.message || t("profile.changePassword.errors.failed"), "error");
    }
  };

  const onLogout = async () => {
    await logout();
    nav("/login");
  };

  const repliedCount = supportItems.filter((item) => item.status === "replied").length;
  const pendingCount = supportItems.filter((item) => item.status === "pending").length;
  const unreadRepliesCount = supportItems.filter((item) => item.status === "replied" && item.adminReply && item.userReplySeen === false).length;

  const filteredSupportItems = useMemo(() => {
    const q = supportQuery.trim().toLowerCase();
    let items = [...supportItems];
    if (supportFilter === "replied") items = items.filter((item) => item.status === "replied");
    else if (supportFilter === "pending") items = items.filter((item) => item.status === "pending");
    else if (supportFilter === "unread") items = items.filter((item) => item.status === "replied" && !item.userReplySeen);
    if (q) {
      items = items.filter((item) => {
        const subject = String(item.subject || "").toLowerCase();
        const message = String(item.message || "").toLowerCase();
        const reply = String(item.adminReply || "").toLowerCase();
        return subject.includes(q) || message.includes(q) || reply.includes(q);
      });
    }
    items.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return supportSort === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return items;
  }, [supportItems, supportQuery, supportFilter, supportSort]);

  const totalSupportPages = Math.max(1, Math.ceil(filteredSupportItems.length / SUPPORT_PAGE_SIZE));

  const pagedSupportItems = useMemo(() => {
    const start = (supportPage - 1) * SUPPORT_PAGE_SIZE;
    return filteredSupportItems.slice(start, start + SUPPORT_PAGE_SIZE);
  }, [filteredSupportItems, supportPage]);

  useEffect(() => { setSupportPage(1); }, [supportQuery, supportFilter, supportSort]);

  useEffect(() => {
    if (supportPage > totalSupportPages) setSupportPage(totalSupportPages);
  }, [supportPage, totalSupportPages]);

  useEffect(() => {
    if (!filteredSupportItems.length) { setSelectedSupportId(null); return; }
    const exists = filteredSupportItems.some((item) => item._id === selectedSupportId);
    if (!exists) setSelectedSupportId(filteredSupportItems[0]._id);
  }, [filteredSupportItems, selectedSupportId]);

  const selectedSupport = useMemo(() => filteredSupportItems.find((item) => item._id === selectedSupportId) || null, [filteredSupportItems, selectedSupportId]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 px-6 py-8 text-white shadow-xl sm:px-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-8 left-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-sky-400 to-blue-600 text-2xl font-black text-white shadow-lg shadow-sky-900/40">
              {(user?.name || "T").trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">{user?.name || "Traveler"}</h1>
              <p className="mt-0.5 text-sm text-white/60">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${user?.verified ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-300" : "border-amber-400/30 bg-amber-500/20 text-amber-300"}`}>
              {user?.verified ? "✓ Verified" : "⚠ Unverified"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80">
              {supportItems.length} messages
            </span>
            {repliedCount > 0 && (
              <span className="rounded-full border border-sky-400/30 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-300">
                {repliedCount} replied
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("profile.accountOverview.title")} subtitle={t("profile.accountOverview.subtitle")} />
            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              {msg ? <Alert type={msg.type === "error" ? "error" : "success"}>{msg.text}</Alert> : null}

              {!user?.verified && (
                <div className="rounded-3xl border border-amber-200 bg-linear-to-r from-amber-50 to-yellow-50 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-base font-bold text-amber-900">{t("profile.accountOverview.emailNotVerified")}</div>
                      <div className="mt-1 text-sm leading-6 text-amber-800/80">{t("profile.accountOverview.verifyEmailText")}</div>
                    </div>
                    <Button onClick={onResendVerification}>{t("profile.accountOverview.resendVerification")}</Button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{t("profile.accountOverview.profileInfo")}</div>
                    <div className="text-sm text-slate-500">{t("profile.accountOverview.profileInfoSubtitle")}</div>
                  </div>
                  <Badge className={user?.verified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                    {user?.verified ? t("profile.accountOverview.verifiedBadge") : t("profile.accountOverview.unverifiedBadge")}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label={t("common.name")} value={user?.name || ""} readOnly className="bg-slate-50 text-slate-600" />
                  <Input label={t("common.email")} value={user?.email || ""} readOnly className="bg-slate-50 text-slate-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("profile.changePassword.title")} subtitle={t("profile.changePassword.subtitle")} />
            <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
              <div className="grid gap-4">
                <PasswordField label={t("profile.changePassword.currentPassword")} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} show={showOldPassword} onToggle={() => setShowOldPassword((p) => !p)} placeholder={t("profile.changePassword.currentPasswordPlaceholder")} autoComplete="current-password" />
                <PasswordField label={t("profile.changePassword.newPassword")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} show={showNewPassword} onToggle={() => setShowNewPassword((p) => !p)} placeholder={t("profile.changePassword.newPasswordPlaceholder")} autoComplete="new-password" />
                <PasswordField label={t("profile.changePassword.confirmNewPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirmPassword} onToggle={() => setShowConfirmPassword((p) => !p)} placeholder={t("profile.changePassword.confirmNewPasswordPlaceholder")} autoComplete="new-password" />
              </div>

              {(newPassword.length > 0 || confirmPassword.length > 0) && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3.5">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("passwordRequirements.title")}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Requirement ok={passwordChecks.minLength} text={t("passwordRequirements.minLength")} />
                    <Requirement ok={passwordChecks.upper}     text={t("passwordRequirements.uppercase")} />
                    <Requirement ok={passwordChecks.lower}     text={t("passwordRequirements.lowercase")} />
                    <Requirement ok={passwordChecks.number}    text={t("passwordRequirements.number")} />
                    <Requirement ok={passwordChecks.special}   text={t("passwordRequirements.special")} />
                    <Requirement ok={passwordChecks.matches}   text={t("passwordRequirements.match")} />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">{t("profile.changePassword.updateNote")}</div>
                <Button variant="primary" onClick={onChangePassword} disabled={!canChangePassword}>
                  {passwordLoading ? t("profile.changePassword.updating") : t("profile.changePassword.updateButton")}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("profile.supportInbox.title")} subtitle={t("profile.supportInbox.subtitle")}
              right={
                <Button variant="secondary" onClick={loadMySupportMessages} disabled={supportLoading} className="inline-flex items-center gap-2">
                  <RefreshCw size={16} />
                  {t("common.refresh")}
                </Button>
              }
            />
            <CardBody className="space-y-4 bg-linear-to-b from-white to-slate-50/60">
              {supportError ? <Alert type="error">{supportError}</Alert> : null}

              {supportLoading ? (
                <SkeletonTable />
              ) : supportItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="text-lg font-bold text-slate-900">{t("profile.supportInbox.noMessages")}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">{t("profile.supportInbox.noMessagesText")}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label={t("common.search")} placeholder={t("profile.supportInbox.searchPlaceholder")} value={supportQuery} onChange={(e) => setSupportQuery(e.target.value)} />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectBox label={t("common.filter")} value={supportFilter} onChange={(e) => setSupportFilter(e.target.value)}
                        options={[
                          { value: "all", label: t("profile.supportInbox.filterAll") },
                          { value: "replied", label: t("profile.supportInbox.filterReplied") },
                          { value: "pending", label: t("profile.supportInbox.filterPending") },
                          { value: "unread", label: t("profile.supportInbox.filterUnread") },
                        ]}
                      />
                      <SelectBox label={t("common.sort")} value={supportSort} onChange={(e) => setSupportSort(e.target.value)}
                        options={[
                          { value: "newest", label: t("profile.supportInbox.sortNewest") },
                          { value: "oldest", label: t("profile.supportInbox.sortOldest") },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <div className="text-slate-600">
                      {t("profile.supportInbox.showing")} <span className="font-bold text-slate-900">{pagedSupportItems.length}</span>{" "}
                      {t("profile.supportInbox.of")} <span className="font-bold text-slate-900">{filteredSupportItems.length}</span>{" "}
                      {t("profile.supportInbox.messages")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                        {t("profile.supportInbox.unreadReplies", { count: unreadRepliesCount })}
                      </Badge>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                        {t("profile.supportInbox.page", { current: supportPage, total: totalSupportPages })}
                      </Badge>
                      {supportFilter !== "all" || supportQuery || supportSort !== "newest" ? (
                        <Button variant="secondary" onClick={() => { setSupportQuery(""); setSupportFilter("all"); setSupportSort("newest"); }}>
                          {t("common.reset")}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="max-h-90 overflow-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <th className="px-4 py-3 text-left font-bold text-slate-600">{t("profile.supportInbox.subject")}</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">{t("profile.supportInbox.status")}</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">{t("profile.supportInbox.sent")}</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600">{t("profile.supportInbox.reply")}</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600">{t("profile.supportInbox.action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedSupportItems.map((item) => {
                            const active = selectedSupportId === item._id;
                            return (
                              <tr key={item._id} tabIndex={0} role="button" aria-pressed={active}
                                onClick={() => setSelectedSupportId(item._id)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSupportId(item._id); } }}
                                className={`cursor-pointer border-b border-slate-100 transition outline-none ${active ? "bg-sky-50/70" : "hover:bg-slate-50 focus:bg-slate-50"}`}
                              >
                                <td className="px-4 py-3 align-top">
                                  <div className="font-semibold text-slate-900">{truncateText(item.subject, 38)}</div>
                                  <div className="mt-1 text-xs text-slate-500">{truncateText(item.message, 50)}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  {item.status === "replied" ? (
                                    <div className="flex flex-wrap gap-2">
                                      <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("profile.supportInbox.replied")}</Badge>
                                      {!item.userReplySeen && <Badge className="border-red-200 bg-red-50 text-red-700">{t("profile.supportInbox.new")}</Badge>}
                                    </div>
                                  ) : (
                                    <Badge className="border-amber-200 bg-amber-50 text-amber-700">{t("profile.supportInbox.pending")}</Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 align-top text-slate-600">
                                  <div className="whitespace-nowrap">{formatDate(item.createdAt)}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  {item.adminReply ? <span className="font-medium text-emerald-700">{t("common.yes")}</span> : <span className="text-slate-400">{t("common.no")}</span>}
                                </td>
                                <td className="px-4 py-3 align-top text-right">
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Button variant={active ? "primary" : "secondary"} onClick={() => setSelectedSupportId(item._id)}>
                                      {active ? t("profile.supportInbox.opened") : t("profile.supportInbox.view")}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {totalSupportPages > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <Button variant="secondary" disabled={supportPage === 1} onClick={() => setSupportPage((p) => Math.max(1, p - 1))}>
                        {t("common.previous")}
                      </Button>
                      <div className="text-sm text-slate-500">
                        {t("common.page")} {supportPage} {t("common.of")} {totalSupportPages}
                      </div>
                      <Button variant="secondary" disabled={supportPage === totalSupportPages} onClick={() => setSupportPage((p) => Math.min(totalSupportPages, p + 1))}>
                        {t("common.next")}
                      </Button>
                    </div>
                  ) : null}

                  {selectedSupport ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-lg font-bold text-slate-900">{selectedSupport.subject}</div>
                          <div className="mt-1 text-xs text-slate-500">{t("profile.supportInbox.sentOn", { date: formatDate(selectedSupport.createdAt) })}</div>
                        </div>
                        {selectedSupport.status === "replied" ? (
                          <Badge className="border-sky-200 bg-sky-50 text-sky-700">{t("profile.supportInbox.replied")}</Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700">{t("profile.supportInbox.pending")}</Badge>
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{t("profile.supportInbox.yourMessage")}</div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedSupport.message}</div>
                      </div>

                      {selectedSupport.adminReply ? (
                        <div className="mt-4 rounded-2xl border border-sky-100 bg-linear-to-r from-sky-50 to-indigo-50 p-4">
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-600 text-xs font-bold text-white">A</div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">{t("profile.supportInbox.adminReply")}</div>
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedSupport.adminReply}</div>
                          {selectedSupport.repliedAt ? (
                            <div className="mt-3 text-xs text-slate-500">{t("profile.supportInbox.repliedOn", { date: formatDate(selectedSupport.repliedAt) })}</div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          {t("profile.supportInbox.noReplyYet")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                      {t("profile.supportInbox.selectMessage")}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader title={t("profile.session.title")} subtitle={t("profile.session.subtitle")} />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="rounded-3xl border border-rose-100 bg-linear-to-r from-rose-50 to-white p-5">
                <div className="text-base font-bold text-slate-900">{t("profile.session.logoutTitle")}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{t("profile.session.logoutDescription")}</div>
                <div className="mt-5">
                  <Button variant="danger" onClick={onLogout} className="inline-flex items-center gap-2">
                    <LogOut size={16} />
                    {t("profile.session.logout")}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon, title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">{icon}</div>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
    </div>
  );
}

function MiniInfo({ label, value, tone = "default" }) {
  const toneClasses = tone === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : tone === "warning" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses}`}>
      <div className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SelectBox({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-semibold text-slate-700">{label}</div>
      <select value={value} onChange={onChange} className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-3 px-4 py-4">
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
              <div className="ml-auto h-9 w-20 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}
