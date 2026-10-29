"use client";

import { useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Search, X } from "lucide-react";
import { Avatar } from "./primitives";

export type PickerOption = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  meta?: string;
};

/** Searchable multi-select of people, with selected chips. Keyboard friendly. */
export function PersonPicker({
  options,
  value,
  onChange,
  placeholder = "Search by name…",
  single = false,
  emptyText = "No matches",
}: {
  options: PickerOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  single?: boolean;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = value.map((id) => options.find((o) => o.id === id)).filter(Boolean) as PickerOption[];
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((o) => !value.includes(o.id))
      .filter((o) => !q || `${o.firstName} ${o.lastName} ${o.meta ?? ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [options, query, value]);

  const pick = (id: string) => {
    onChange(single ? [id] : [...value, id]);
    setQuery("");
    setCursor(0);
    if (single) setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-2 border border-line bg-white py-1 pl-1 pr-2 text-sm text-navy-800"
            >
              <Avatar person={o} size="sm" />
              <span>
                {o.firstName} {o.lastName}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== o.id))}
                className=" p-0.5 text-navy-300 hover:bg-navy-50 hover:text-navy-700"
                aria-label={`Remove ${o.firstName}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!(single && selected.length) && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setCursor(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter" && open && results[cursor]) {
                e.preventDefault();
                pick(results[cursor].id);
              } else if (e.key === "Escape") setOpen(false);
            }}
            placeholder={placeholder}
            className="input pl-9"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          {open && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lift"
            >
              {results.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-navy-400">{emptyText}</li>
              ) : (
                results.map((o, i) => (
                  <li key={o.id} role="option" aria-selected={i === cursor}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(o.id)}
                      onMouseEnter={() => setCursor(i)}
                      className={clsx(
                        "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                        i === cursor ? "bg-navy-50" : "hover:bg-ivory",
                      )}
                    >
                      <Avatar person={o} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-navy-900">
                          {o.firstName} {o.lastName}
                        </span>
                        {o.meta && <span className="block truncate text-xs text-navy-400">{o.meta}</span>}
                      </span>
                      {i === cursor && <Check className="h-4 w-4 text-gold-500" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
