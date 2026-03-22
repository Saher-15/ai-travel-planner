import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en/translation.json";

const savedLang = "en";
if (localStorage.getItem("lang") === "he") {
  localStorage.setItem("lang", "en");
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
