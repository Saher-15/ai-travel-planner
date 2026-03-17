import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  FilePenLine,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { api } from "../api/client.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from "../components/UI.jsx";

const BLOCKS = ["morning", "afternoon", "evening"];

const BLOCK_ICONS = {
  morning: "☀️",
  afternoon: "🌤️",
  evening: "🌙",
};

const textareaClassName =
  "min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

function makeEmptyActivity() {
  return {
    title: "",
    location: "",
    notes: "",
    durationHours: "",
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapActivityForForm(activity) {
  return {
    title: activity?.title || "",
    location: activity?.location || "",
    notes: activity?.notes || "",
    durationHours:
      activity?.durationHours === null || activity?.durationHours === undefined
        ? ""
        : String(activity.durationHours),
  };
}

function mapActivityForSave(activity) {
  return {
    title: (activity?.title || "").trim(),
    location: (activity?.location || "").trim(),
    notes: (activity?.notes || "").trim(),
    durationHours:
      activity?.durationHours === "" ||
      activity?.durationHours === null ||
      activity?.durationHours === undefined
        ? null
        : Number(activity.durationHours),
  };
}

function normalizeTripForForm(trip) {
  return {
    tripMode: trip?.tripMode || "single",
    destination: trip?.destination || "",
    destinations: safeArray(trip?.destinations),
    startDate: trip?.startDate || "",
    endDate: trip?.endDate || "",
    preferences: {
      pace: trip?.preferences?.pace || "moderate",
      budget: trip?.preferences?.budget || "mid",
      interests: safeArray(trip?.preferences?.interests),
      notes: trip?.preferences?.notes || "",
      travelers: trip?.preferences?.travelers || "",
      sourceTab: trip?.preferences?.sourceTab || "",
      tripType: trip?.preferences?.tripType || "",
      from: trip?.preferences?.from || "",
      includeEvents:
        trip?.preferences?.includeEvents === undefined
          ? true
          : Boolean(trip?.preferences?.includeEvents),
      eventTypes: safeArray(trip?.preferences?.eventTypes),
    },
    itinerary: {
      tripSummary: trip?.itinerary?.tripSummary || {},
      tips: safeArray(trip?.itinerary?.tips),
      recommendedPlaces: safeArray(trip?.itinerary?.recommendedPlaces).map((place) => ({
        name: place?.name || "",
        reason: place?.reason || "",
        category: place?.category || "",
        location: place?.location || "",
      })),
      days: safeArray(trip?.itinerary?.days).map((day, index) => ({
        day: day?.day ?? index + 1,
        title: day?.title || "",
        date: day?.date || "",
        morning: safeArray(day?.morning).map(mapActivityForForm),
        afternoon: safeArray(day?.afternoon).map(mapActivityForForm),
        evening: safeArray(day?.evening).map(mapActivityForForm),
        foodSuggestion: day?.foodSuggestion || "",
        backupPlan: day?.backupPlan || "",
      })),
    },
    events: safeArray(trip?.events),
  };
}

function normalizeDayNumbers(days) {
  return safeArray(days).map((day, index) => ({
    ...day,
    day: index + 1,
  }));
}

function countDayActivities(day) {
  return BLOCKS.reduce((sum, block) => sum + safeArray(day?.[block]).length, 0);
}

function getDayEstimatedHours(day) {
  const activities = BLOCKS.flatMap((block) => safeArray(day?.[block]));
  return activities.reduce((sum, activity) => {
    const n = Number(activity?.durationHours);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
}

function formatHours(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (Number.isInteger(value)) return `${value}h`;
  return `${value.toFixed(1)}h`;
}

function isActivityEmpty(activity) {
  return !(
    (activity?.title || "").trim() ||
    (activity?.location || "").trim() ||
    (activity?.notes || "").trim() ||
    String(activity?.durationHours || "").trim()
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${textareaClassName} ${className}`}
      />
    </label>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function HeroStat({ icon, title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">
        {icon}
      </div>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
    </div>
  );
}

function SideInfo({ title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{text}</div>
    </div>
  );
}

export default function EditTrip() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const nav = useNavigate();
  const { id } = useParams();

  const BLOCK_META = {
    morning: { icon: BLOCK_ICONS.morning, title: t("editTrip.morning"), desc: t("editTrip.morningDesc") },
    afternoon: { icon: BLOCK_ICONS.afternoon, title: t("editTrip.afternoon"), desc: t("editTrip.afternoonDesc") },
    evening: { icon: BLOCK_ICONS.evening, title: t("editTrip.evening"), desc: t("editTrip.eveningDesc") },
  };

  const [form, setForm] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      setSuccess("");

      try {
        const { data } = await api.get(`/trips/${id}`);
        if (!alive) return;

        const normalized = normalizeTripForForm(data);
        setForm(normalized);
        setInitialSnapshot(JSON.stringify(normalized));
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || t("editTrip.errors.loadFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const hasUnsavedChanges = useMemo(() => {
    if (!form) return false;
    return JSON.stringify(form) !== initialSnapshot;
  }, [form, initialSnapshot]);

  useEffect(() => {
    const handler = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const daysCount = useMemo(() => {
    if (!form?.startDate || !form?.endDate) return null;

    const s = new Date(form.startDate);
    const e = new Date(form.endDate);

    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
      return null;
    }

    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  }, [form?.startDate, form?.endDate]);

  const totalActivities = useMemo(() => {
    if (!form?.itinerary?.days?.length) return 0;
    return form.itinerary.days.reduce((sum, day) => sum + countDayActivities(day), 0);
  }, [form]);

  const totalEstimatedHours = useMemo(() => {
    if (!form?.itinerary?.days?.length) return 0;
    return form.itinerary.days.reduce((sum, day) => sum + getDayEstimatedHours(day), 0);
  }, [form]);

  function updateForm(updater) {
    setForm((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
  }

  function updateDay(dayIndex, field, value) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      days[dayIndex] = { ...days[dayIndex], [field]: value };

      return {
        ...prev,
        itinerary: { ...prev.itinerary, days },
      };
    });
  }

  function updateActivity(dayIndex, block, activityIndex, field, value) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const day = { ...days[dayIndex] };
      const activities = [...safeArray(day[block])];

      activities[activityIndex] = {
        ...activities[activityIndex],
        [field]: value,
      };

      day[block] = activities;
      days[dayIndex] = day;

      return {
        ...prev,
        itinerary: { ...prev.itinerary, days },
      };
    });
  }

  function addActivity(dayIndex, block) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const day = { ...days[dayIndex] };

      day[block] = [...safeArray(day[block]), makeEmptyActivity()];
      days[dayIndex] = day;

      return {
        ...prev,
        itinerary: { ...prev.itinerary, days },
      };
    });
  }

  function removeActivity(dayIndex, block, activityIndex) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const day = { ...days[dayIndex] };

      day[block] = safeArray(day[block]).filter((_, i) => i !== activityIndex);
      days[dayIndex] = day;

      return {
        ...prev,
        itinerary: { ...prev.itinerary, days },
      };
    });
  }

  function moveActivityWithinBlock(dayIndex, block, activityIndex, direction) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const day = { ...days[dayIndex] };
      const activities = [...safeArray(day[block])];
      const targetIndex = direction === "up" ? activityIndex - 1 : activityIndex + 1;

      if (targetIndex < 0 || targetIndex >= activities.length) return prev;

      [activities[activityIndex], activities[targetIndex]] = [
        activities[targetIndex],
        activities[activityIndex],
      ];

      day[block] = activities;
      days[dayIndex] = day;

      return {
        ...prev,
        itinerary: { ...prev.itinerary, days },
      };
    });
  }

  function moveActivityToAnotherBlock(dayIndex, block, activityIndex, direction) {
    const currentBlockIndex = BLOCKS.indexOf(block);
    const targetBlockIndex =
      direction === "prev" ? currentBlockIndex - 1 : currentBlockIndex + 1;

    if (targetBlockIndex < 0 || targetBlockIndex >= BLOCKS.length) return;

    const targetBlock = BLOCKS[targetBlockIndex];

    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const day = { ...days[dayIndex] };

      const fromActivities = [...safeArray(day[block])];
      const toActivities = [...safeArray(day[targetBlock])];
      const [movedActivity] = fromActivities.splice(activityIndex, 1);

      if (!movedActivity) return prev;

      toActivities.push(movedActivity);

      day[block] = fromActivities;
      day[targetBlock] = toActivities;
      days[dayIndex] = day;

      return {
        ...prev,
        itinerary: { ...prev.itinerary, days },
      };
    });
  }

  function moveDay(dayIndex, direction) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const targetIndex = direction === "up" ? dayIndex - 1 : dayIndex + 1;

      if (targetIndex < 0 || targetIndex >= days.length) return prev;

      [days[dayIndex], days[targetIndex]] = [days[targetIndex], days[dayIndex]];

      return {
        ...prev,
        itinerary: {
          ...prev.itinerary,
          days: normalizeDayNumbers(days),
        },
      };
    });
  }

  function removeEmptyActivitiesFromDay(dayIndex) {
    updateForm((prev) => {
      const days = [...prev.itinerary.days];
      const day = { ...days[dayIndex] };

      for (const block of BLOCKS) {
        day[block] = safeArray(day[block]).filter((activity) => !isActivityEmpty(activity));
      }

      days[dayIndex] = day;

      return {
        ...prev,
        itinerary: {
          ...prev.itinerary,
          days,
        },
      };
    });
  }

  async function saveTrip(e) {
    e.preventDefault();
    setErr("");
    setSuccess("");

    if (!form?.destination.trim()) {
      setErr(t("editTrip.errors.enterDestination"));
      return;
    }

    if (!daysCount) {
      setErr(t("editTrip.errors.enterValidDates"));
      return;
    }

    setSaving(true);

    try {
      const normalizedDays = normalizeDayNumbers(
        safeArray(form.itinerary.days).map((day) => ({
          ...day,
          title: (day.title || "").trim(),
          date: day.date || "",
          morning: safeArray(day.morning).map(mapActivityForSave),
          afternoon: safeArray(day.afternoon).map(mapActivityForSave),
          evening: safeArray(day.evening).map(mapActivityForSave),
          foodSuggestion: (day.foodSuggestion || "").trim(),
          backupPlan: (day.backupPlan || "").trim(),
        }))
      );

      const payload = {
        tripMode: form.tripMode,
        destination: form.destination.trim(),
        destinations: safeArray(form.destinations).length
          ? safeArray(form.destinations)
          : [form.destination.trim()],
        startDate: form.startDate,
        endDate: form.endDate,
        preferences: {
          ...form.preferences,
          notes: (form.preferences.notes || "").trim(),
        },
        itinerary: {
          ...form.itinerary,
          tripSummary: form.itinerary.tripSummary || {},
          tips: safeArray(form.itinerary.tips),
          recommendedPlaces: safeArray(form.itinerary.recommendedPlaces),
          days: normalizedDays,
        },
        events: safeArray(form.events),
      };

      await api.put(`/trips/${id}`, payload);

      const normalizedSavedForm = {
        ...form,
        destination: payload.destination,
        destinations: payload.destinations,
        preferences: payload.preferences,
        itinerary: payload.itinerary,
        events: payload.events,
      };

      setForm(normalizedSavedForm);
      setInitialSnapshot(JSON.stringify(normalizedSavedForm));
      setSuccess(t("editTrip.errors.tripUpdated"));

      setTimeout(() => {
        nav(`/trip/${id}`);
      }, 700);
    } catch (e2) {
      setErr(e2?.response?.data?.message || t("editTrip.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50" />
          <div className="relative p-6 lg:p-8">
            <div className="h-7 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-10 w-72 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-20 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        </section>

        <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
          <CardBody className="space-y-4">
            <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
          </CardBody>
        </Card>
      </div>
    );
  }

  if (err && !form) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert type="error">{err}</Alert>
        <Button onClick={() => nav("/trips")} variant="secondary">
          {t("editTrip.backToMyTrips")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-4xl border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-indigo-50" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-8">
            <Badge className="border-sky-200 bg-sky-50 text-sky-700">
              {t("editTrip.badge")}
            </Badge>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {form?.destination || t("editTrip.editTripTitle")}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              {t("editTrip.description")}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <HeroStat
                icon={<CalendarDays size={18} />}
                title={t("editTrip.days")}
                value={daysCount || safeArray(form?.itinerary?.days).length}
                subtitle={t("editTrip.daysSubtitle")}
              />
              <HeroStat
                icon={<MapPinned size={18} />}
                title={t("editTrip.activities")}
                value={totalActivities}
                subtitle={t("editTrip.activitiesSubtitle")}
              />
              <HeroStat
                icon={<Clock3 size={18} />}
                title={t("editTrip.estimated")}
                value={formatHours(totalEstimatedHours)}
                subtitle={t("editTrip.estimatedSubtitle")}
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-bold text-slate-900">
                {t("editTrip.editingStatus")}
              </div>

              <div className="mt-4 grid gap-3">
                <SideInfo
                  title={t("editTrip.currentState")}
                  text={hasUnsavedChanges ? t("editTrip.unsavedChanges") : t("editTrip.allChangesSaved")}
                />
                <SideInfo
                  title={t("editTrip.protectedContent")}
                  text={t("editTrip.protectedContentText")}
                />
                <SideInfo
                  title={t("editTrip.flexibleEditing")}
                  text={t("editTrip.flexibleEditingText")}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {err ? <Alert type="error">{err}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-4">
          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader
              title={t("editTrip.actionsTitle")}
              subtitle={t("editTrip.actionsSubtitle")}
            />
            <CardBody className="space-y-4 bg-linear-to-b from-white to-slate-50/60">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
                  <div className="text-lg font-bold text-slate-900">
                    {t("editTrip.tripActions")}
                  </div>
                  <div className="text-sm text-slate-500">
                    {t("editTrip.tripActionsSubtitle")}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button type="button" disabled={saving} className="w-full" onClick={saveTrip}>
                    {saving ? t("editTrip.savingChanges") : t("editTrip.saveChanges")}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => nav(`/trip/${id}`)}
                  >
                    {t("editTrip.cancel")}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => nav("/trips")}
                  >
                    {t("editTrip.backToMyTrips")}
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {t("editTrip.editNote")}
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader
              title={t("editTrip.editorSummary")}
              subtitle={t("editTrip.editorSummarySubtitle")}
            />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <MiniInfo label={t("editTrip.daysLabel")} value={safeArray(form?.itinerary?.days).length} />
                <MiniInfo label={t("editTrip.activitiesLabel")} value={totalActivities} />
                <MiniInfo label={t("editTrip.estimatedHours")} value={formatHours(totalEstimatedHours)} />
                <MiniInfo
                  label={t("editTrip.statusLabel")}
                  value={hasUnsavedChanges ? t("editTrip.editing") : t("editTrip.saved")}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
            <CardHeader
              title={t("editTrip.protectedContentTitle")}
              subtitle={t("editTrip.protectedContentSubtitle")}
            />
            <CardBody className="bg-linear-to-b from-white to-slate-50/60">
              <div className="space-y-4">
                <MiniInfo
                  label={t("editTrip.recommendedPlaces")}
                  value={safeArray(form?.itinerary?.recommendedPlaces).length}
                />
                <MiniInfo label={t("editTrip.tips")} value={safeArray(form?.itinerary?.tips).length} />
                <MiniInfo label={t("editTrip.eventsLabel")} value={safeArray(form?.events).length} />
              </div>
            </CardBody>
          </Card>
        </div>

        <form onSubmit={saveTrip} className="space-y-6 xl:col-span-8">
          {safeArray(form?.itinerary?.days).map((day, dayIndex) => {
            const dayActivities = countDayActivities(day);
            const dayHours = getDayEstimatedHours(day);

            return (
              <Card
                key={dayIndex}
                className="overflow-hidden border border-slate-200/80 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]"
              >
                <div className="relative overflow-hidden border-b border-slate-200 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-white">
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

                  <div className="relative flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                          {t("editTrip.dayLabel", { number: day.day })}
                        </div>
                        <div className="mt-1 text-2xl font-black tracking-tight">
                          {t("editTrip.editDayPlan")}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-white/75">
                          {t("editTrip.editDayPlanSubtitle")}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge className="border-white/20 bg-white/10 text-white">
                          {t("editTrip.activitiesCount", { count: dayActivities })}
                        </Badge>
                        <Badge className="border-white/20 bg-white/10 text-white">
                          {formatHours(dayHours)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-2 text-xs"
                        onClick={() => moveDay(dayIndex, "up")}
                        disabled={dayIndex === 0}
                      >
                        {t("editTrip.moveDayUp")}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-2 text-xs"
                        onClick={() => moveDay(dayIndex, "down")}
                        disabled={dayIndex === form.itinerary.days.length - 1}
                      >
                        {t("editTrip.moveDayDown")}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                        onClick={() => removeEmptyActivitiesFromDay(dayIndex)}
                      >
                        {t("editTrip.cleanEmptyActivities")}
                      </Button>
                    </div>
                  </div>
                </div>

                <CardBody className="space-y-6 bg-linear-to-b from-white to-slate-50/60">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5">
                      <div className="text-lg font-bold text-slate-900">
                        {t("editTrip.dayDetails")}
                      </div>
                      <div className="text-sm text-slate-500">
                        {t("editTrip.dayDetailsSubtitle")}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label={t("editTrip.dayTitle")}
                        placeholder={t("editTrip.dayTitlePlaceholder")}
                        value={day.title}
                        onChange={(e) => updateDay(dayIndex, "title", e.target.value)}
                      />
                      <Input
                        label={t("editTrip.dayDate")}
                        type="date"
                        value={day.date}
                        onChange={(e) => updateDay(dayIndex, "date", e.target.value)}
                      />
                    </div>
                  </div>

                  {BLOCKS.map((block) => {
                    const meta = BLOCK_META[block];
                    const activities = safeArray(day[block]);

                    return (
                      <div
                        key={block}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                              <span>{meta.icon}</span>
                              {meta.title}
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                {activities.length}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-500">{meta.desc}</div>
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            className="px-3 py-2 text-xs"
                            onClick={() => addActivity(dayIndex, block)}
                          >
                            {t("editTrip.addActivity")}
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {activities.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                              {t("editTrip.noActivitiesYet")}
                            </div>
                          ) : (
                            activities.map((activity, activityIndex) => (
                              <div
                                key={`${block}-${activityIndex}`}
                                className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4"
                              >
                                <div className="mb-4 flex flex-col gap-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                                      {t("editTrip.activityLabel", { number: activityIndex + 1 })}
                                    </div>

                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="px-3 py-2 text-xs"
                                      onClick={() =>
                                        removeActivity(dayIndex, block, activityIndex)
                                      }
                                    >
                                      {t("editTrip.remove")}
                                    </Button>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="px-3 py-2 text-xs"
                                      onClick={() =>
                                        moveActivityWithinBlock(
                                          dayIndex,
                                          block,
                                          activityIndex,
                                          "up"
                                        )
                                      }
                                      disabled={activityIndex === 0}
                                    >
                                      {t("editTrip.up")}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="px-3 py-2 text-xs"
                                      onClick={() =>
                                        moveActivityWithinBlock(
                                          dayIndex,
                                          block,
                                          activityIndex,
                                          "down"
                                        )
                                      }
                                      disabled={activityIndex === activities.length - 1}
                                    >
                                      {t("editTrip.down")}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="px-3 py-2 text-xs"
                                      onClick={() =>
                                        moveActivityToAnotherBlock(
                                          dayIndex,
                                          block,
                                          activityIndex,
                                          "prev"
                                        )
                                      }
                                      disabled={BLOCKS.indexOf(block) === 0}
                                    >
                                      {t("editTrip.prevPlan")}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="px-3 py-2 text-xs"
                                      onClick={() =>
                                        moveActivityToAnotherBlock(
                                          dayIndex,
                                          block,
                                          activityIndex,
                                          "next"
                                        )
                                      }
                                      disabled={BLOCKS.indexOf(block) === BLOCKS.length - 1}
                                    >
                                      {t("editTrip.nextPlan")}
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <Input
                                    label={t("editTrip.titleLabel")}
                                    placeholder={t("editTrip.titlePlaceholder")}
                                    value={activity.title}
                                    onChange={(e) =>
                                      updateActivity(
                                        dayIndex,
                                        block,
                                        activityIndex,
                                        "title",
                                        e.target.value
                                      )
                                    }
                                  />
                                  <Input
                                    label={t("editTrip.locationLabel")}
                                    placeholder={t("editTrip.locationPlaceholder")}
                                    value={activity.location}
                                    onChange={(e) =>
                                      updateActivity(
                                        dayIndex,
                                        block,
                                        activityIndex,
                                        "location",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <Input
                                    label={t("editTrip.durationLabel")}
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder={t("editTrip.durationPlaceholder")}
                                    value={activity.durationHours}
                                    onChange={(e) =>
                                      updateActivity(
                                        dayIndex,
                                        block,
                                        activityIndex,
                                        "durationHours",
                                        e.target.value
                                      )
                                    }
                                  />

                                  <TextareaField
                                    label={t("editTrip.notesLabel")}
                                    value={activity.notes}
                                    onChange={(e) =>
                                      updateActivity(
                                        dayIndex,
                                        block,
                                        activityIndex,
                                        "notes",
                                        e.target.value
                                      )
                                    }
                                    placeholder={t("editTrip.notesPlaceholder")}
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <TextareaField
                        label={t("editTrip.foodSuggestion")}
                        value={day.foodSuggestion}
                        onChange={(e) => updateDay(dayIndex, "foodSuggestion", e.target.value)}
                        placeholder={t("editTrip.foodSuggestionPlaceholder")}
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <TextareaField
                        label={t("editTrip.backupPlan")}
                        value={day.backupPlan}
                        onChange={(e) => updateDay(dayIndex, "backupPlan", e.target.value)}
                        placeholder={t("editTrip.backupPlanPlaceholder")}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-40">
              {saving ? t("editTrip.savingChanges") : t("editTrip.saveChanges")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}