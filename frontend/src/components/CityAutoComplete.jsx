import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getCountryCodeFromContext(context = []) {
  const countryItem = context.find((item) => item.id?.startsWith("country"));
  return (
    countryItem?.short_code?.toUpperCase?.() ||
    countryItem?.properties?.short_code?.toUpperCase?.() ||
    ""
  );
}

function countryCodeToFlag(code = "") {
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(
    ...[...code].map((char) => 127397 + char.charCodeAt(0))
  );
}

export default function CityAutoComplete({
  label = "Destination",
  placeholder = "Search city or country...",
  value = "",
  onChange,
  onSelect,
  onEnter,
  error = "",
  disabled = false,
}) {
  const { i18n } = useTranslation();
  const apiKey = import.meta.env.VITE_MAPTILER_KEY;

  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [fetchError, setFetchError] = useState("");

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!apiKey || disabled) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setHighlightedIndex(-1);
      setFetchError("");
      return;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setFetchError("");

      try {
        const lang = i18n.language?.split("-")[0] || "en";
        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
          trimmed
        )}.json?key=${apiKey}&autocomplete=true&limit=8&language=${lang}`;

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const data = await res.json();

        if (currentRequestId !== requestIdRef.current) return;

        const items = Array.isArray(data?.features)
          ? data.features.map((item, index) => {
              const placeName =
                item[`place_name_${lang}`] ||
                item.place_name ||
                item.place_name_en ||
                item.properties?.full_name ||
                item.properties?.name ||
                item.text ||
                "";

              const country =
                item.context?.find((c) => c.id?.startsWith("country"))?.text ||
                item.properties?.country ||
                "";

              const countryCode = getCountryCodeFromContext(item.context || []);

              return {
                id:
                  item.id ||
                  `${placeName}-${item.center?.[0] || 0}-${item.center?.[1] || 0}-${index}`,
                name:
                  item[`text_${lang}`] ||
                  item.text ||
                  item.text_en ||
                  item.properties?.name ||
                  placeName,
                placeName,
                center: Array.isArray(item.center) ? item.center : [],
                country,
                countryCode,
                flag: countryCodeToFlag(countryCode),
                type:
                  item.place_type?.[0] ||
                  item.properties?.feature_type ||
                  item.properties?.type ||
                  "place",
                region:
                  item.context?.find(
                    (c) =>
                      c.id?.startsWith("region") ||
                      c.id?.startsWith("province") ||
                      c.id?.startsWith("state")
                  )?.text || "",
              };
            })
          : [];

        setResults(items);
        setOpen(true);
        setHighlightedIndex(items.length ? 0 : -1);
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;
        setResults([]);
        setOpen(true);
        setHighlightedIndex(-1);
        setFetchError(err?.message || "Failed to fetch cities");
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, apiKey, disabled, i18n.language]);

  const showEmpty = useMemo(
    () =>
      open &&
      !loading &&
      !fetchError &&
      query.trim().length >= 2 &&
      results.length === 0,
    [open, loading, fetchError, query, results.length]
  );

  function handleInputChange(e) {
    const next = e.target.value;
    setQuery(next);
    setHighlightedIndex(-1);
    onChange?.(next);

    if (next.trim().length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  function handleSelect(item) {
    setQuery(item.placeName);
    onChange?.(item.placeName);
    onSelect?.(item);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (results.length) {
        setOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (open && e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        results.length ? (prev + 1) % results.length : -1
      );
      return;
    }

    if (open && e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        results.length ? (prev <= 0 ? results.length - 1 : prev - 1) : -1
      );
      return;
    }

    if (e.key === "Enter") {
      if (open && highlightedIndex >= 0 && results[highlightedIndex]) {
        e.preventDefault();
        handleSelect(results[highlightedIndex]);
        return;
      }

      if (onEnter) {
        e.preventDefault();
        onEnter();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label ? (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={cx(
            "w-full rounded-[1.25rem] border bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200",
            "placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100",
            error ? "border-red-300" : "border-slate-200",
            disabled ? "cursor-not-allowed opacity-60" : ""
          )}
        />

        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          {loading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
          ) : (
            <span className="text-slate-400">⌕</span>
          )}
        </div>
      </div>

      {error ? <div className="mt-2 text-xs text-red-500">{error}</div> : null}

      {!apiKey ? (
        <div className="mt-2 text-xs text-amber-600">
          Missing VITE_MAPTILER_KEY in your .env file
        </div>
      ) : null}

      {fetchError ? (
        <div className="mt-2 text-xs text-red-500">{fetchError}</div>
      ) : null}

      {open && results.length > 0 ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-[1.25rem] border border-slate-200 bg-white p-2 shadow-xl">
          {results.map((item, index) => {
            const active = index === highlightedIndex;

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                className={cx(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                  active ? "bg-sky-50" : "hover:bg-sky-50"
                )}
              >
                <div className="mt-0.5 text-lg">{item.flag}</div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {item.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {item.type}
                    </span>
                  </div>

                  <div className="mt-1 truncate text-xs text-slate-500">
                    {item.placeName}
                  </div>

                  {(item.region || item.country) && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      {[item.region, item.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {showEmpty ? (
        <div className="absolute z-30 mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-xl">
          {i18n.language?.startsWith("he") ? "לא נמצאו ערים תואמות." : "No matching cities found."}
        </div>
      ) : null}
    </div>
  );
}