"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A select bound to one URL query param. */
export function FilterSelect({
  param,
  label,
  options,
  allLabel,
}: {
  param: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label={label}
      className="input w-auto min-w-[170px]"
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set(param, e.target.value);
        else next.delete(param);
        router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
      }}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
