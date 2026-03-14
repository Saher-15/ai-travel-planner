import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
} from "../components/UI.jsx";

export default function AdminContacts() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingId, setReplyingId] = useState("");

  async function loadMessages() {
    setLoading(true);
    setMsg(null);

    try {
      const { data } = await api.get("/contact/admin/messages");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.response?.data?.message ||
          t("adminContacts.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await api.patch(`/contact/admin/messages/${id}/read`);
      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.response?.data?.message ||
          t("adminContacts.markReadFailed"),
      });
    }
  }

  async function sendReply(id) {
    const adminReply = String(replyDrafts[id] || "").trim();

    if (!adminReply) {
      setMsg({ type: "error", text: t("adminContacts.writeReply") });
      return;
    }

    try {
      setReplyingId(id);

      const { data } = await api.patch(`/contact/admin/messages/${id}/reply`, {
        adminReply,
      });

      setItems((prev) =>
        prev.map((item) =>
          item._id === id
            ? {
                ...item,
                adminReply: data?.item?.adminReply || adminReply,
                status: data?.item?.status || "replied",
                repliedAt: data?.item?.repliedAt || new Date().toISOString(),
                isRead: true,
              }
            : item
        )
      );

      setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
      setMsg({ type: "success", text: t("adminContacts.replySaved") });
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.response?.data?.message ||
          t("adminContacts.replyFailed"),
      });
    } finally {
      setReplyingId("");
    }
  }

  async function deleteMessage(id) {
    try {
      await api.delete(`/contact/admin/messages/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.response?.data?.message ||
          t("adminContacts.deleteFailed"),
      });
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("adminContacts.title")}
          subtitle={t("adminContacts.subtitle")}
          right={
            <Button variant="secondary" onClick={loadMessages} disabled={loading}>
              {t("adminContacts.refresh")}
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {msg ? <Alert type={msg.type}>{msg.text}</Alert> : null}

          {loading ? (
            <div className="text-sm text-slate-500">{t("adminContacts.loading")}</div>
          ) : items.length === 0 ? (
            <Alert type="info">{t("adminContacts.noMessages")}</Alert>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item._id} className="border border-slate-200">
                  <CardBody className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-base font-bold text-slate-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-slate-500">{item.email}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-700">
                          {item.subject}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {item.isRead ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {t("adminContacts.read")}
                          </Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                            {t("adminContacts.new")}
                          </Badge>
                        )}

                        {item.status === "replied" ? (
                          <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                            {t("adminContacts.replied")}
                          </Badge>
                        ) : (
                          <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                            {t("adminContacts.pending")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {item.message}
                    </div>

                    {item.adminReply ? (
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                          {t("adminContacts.adminReply")}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-700">
                          {item.adminReply}
                        </div>
                        {item.repliedAt ? (
                          <div className="mt-2 text-xs text-slate-500">
                            {t("adminContacts.repliedAt", { date: new Date(item.repliedAt).toLocaleString() })}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <label className="block">
                      <div className="mb-1.5 text-sm font-semibold text-slate-700">
                        {item.adminReply ? t("adminContacts.updateReply") : t("adminContacts.writeAReply")}
                      </div>
                      <textarea
                        rows={4}
                        value={replyDrafts[item._id] ?? item.adminReply ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({
                            ...prev,
                            [item._id]: e.target.value,
                          }))
                        }
                        placeholder={t("adminContacts.replyPlaceholder")}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      {!item.isRead ? (
                        <Button
                          variant="secondary"
                          onClick={() => markAsRead(item._id)}
                        >
                          {t("adminContacts.markAsRead")}
                        </Button>
                      ) : null}

                      <Button
                        onClick={() => sendReply(item._id)}
                        disabled={replyingId === item._id}
                      >
                        {replyingId === item._id
                          ? t("adminContacts.savingReply")
                          : item.adminReply
                          ? t("adminContacts.updateReplyBtn")
                          : t("adminContacts.sendReply")}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => deleteMessage(item._id)}
                      >
                        {t("adminContacts.delete")}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
