import { useTranslation } from "react-i18next";
import { Card, CardBody, CardHeader, Badge } from "../components/UI.jsx";
import { useEffect } from "react";

export default function About() {
  const { t } = useTranslation();

    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t("about.title")}
          subtitle={t("about.subtitle")}
          right={<Badge>{t("about.badge")}</Badge>}
        />
        <CardBody className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            {t("about.p1")}
          </p>
          <p className="text-sm leading-6 text-slate-600">
            {t("about.p2")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 pt-2 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-extrabold text-slate-900">{t("about.frontendTitle")}</div>
              <div className="mt-1 text-slate-600">{t("about.frontendText")}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-extrabold text-slate-900">{t("about.backendTitle")}</div>
              <div className="mt-1 text-slate-600">{t("about.backendText")}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
