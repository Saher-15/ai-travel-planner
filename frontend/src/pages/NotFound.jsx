import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/UI.jsx";

export default function NotFound() {
  const nav = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-black tracking-tight text-slate-100 select-none">
        404
      </div>

      <div className="-mt-4">
        <div className="text-2xl font-black tracking-tight text-slate-900">
          {t("notFound.title")}
        </div>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          {t("notFound.description")}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => nav(-1)}
          variant="secondary"
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {t("common.back")}
        </Button>
        <Button
          onClick={() => nav("/")}
          className="inline-flex items-center gap-2"
        >
          <Home size={16} />
          {t("notFound.goHome")}
        </Button>
      </div>
    </div>
  );
}
