"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { AlertCircle, Loader2, UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { FileChip, type FileInfo } from "./FileChip";

const MAX = 4 * 1024 * 1024;
const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"];

/** Large phone photos are resized in the browser (longest side 2000 px, JPEG) so they upload quickly and fit the limit. */
async function shrinkImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.includes(file.type) || file.size < 1.2 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function upload(file: File, purpose: string, onProgress: (p: number) => void): Promise<FileInfo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("purpose", purpose);
    body.append("file", file);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: { error?: string } & Partial<FileInfo> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON (e.g. platform error page) */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.id) resolve(data as FileInfo);
      else reject(new Error(data.error ?? (xhr.status === 413 ? `“${file.name}” is too large.` : "Upload failed. Please try again.")));
    };
    xhr.onerror = () => reject(new Error("No connection. Please check your internet and try again."));
    xhr.open("POST", "/api/uploads");
    xhr.send(body);
  });
}

type Pending = { key: string; name: string; progress: number; error?: string };

export function FileDrop({
  purpose,
  value,
  onChange,
  multiple = false,
  accept,
  hint = "PDF, Word, PowerPoint, Excel or photos · up to 4 MB each",
  onBusyChange,
}: {
  purpose: "resource" | "submission" | "avatar";
  value: FileInfo[];
  onChange: (files: FileInfo[]) => void;
  multiple?: boolean;
  accept?: string;
  hint?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const current = useRef(value);
  current.current = value;

  const handle = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = multiple ? Array.from(list) : [list[0]];
    const items = files.map((f, i) => ({
      key: `${Date.now()}-${i}`,
      name: f.name,
      progress: 0,
    }));
    setPending((p) => [...p, ...items]);
    onBusyChange?.(true);
    const done: FileInfo[] = [];
    await Promise.all(
      files.map(async (raw, i) => {
        const key = items[i].key;
        const set = (patch: Partial<Pending>) => setPending((p) => p.map((x) => (x.key === key ? { ...x, ...patch } : x)));
        try {
          const f = await shrinkImage(raw);
          if (f.size > MAX) throw new Error(`“${raw.name}” is ${formatBytes(f.size)} — the limit is 4 MB. Please upload a smaller copy.`);
          done.push(await upload(f, purpose, (progress) => set({ progress })));
          setPending((p) => p.filter((x) => x.key !== key));
        } catch (e) {
          set({ error: (e as Error).message });
        }
      }),
    );
    onChange(multiple ? [...current.current, ...done] : done.slice(0, 1).concat(done.length ? [] : current.current));
    onBusyChange?.(false);
    if (input.current) input.current.value = "";
  };

  const showDrop = multiple || value.length === 0;

  return (
    <div className="space-y-2">
      {value.map((f) => (
        <FileChip
          key={f.id}
          file={f}
          action={
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.id !== f.id))}
              className="rounded-md p-1.5 text-navy-300 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label={`Remove ${f.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          }
        />
      ))}
      {pending.map((p) => (
        <div
          key={p.key}
          className={clsx("rounded-lg border px-3 py-2.5 text-sm", p.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-line bg-white text-navy-700")}
        >
          <div className="flex items-center gap-2">
            {p.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold-500" />}
            <span className="min-w-0 flex-1 truncate">{p.error ?? p.name}</span>
            {p.error ? (
              <button
                type="button"
                onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))}
                className="rounded p-0.5 hover:bg-rose-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs tabular-nums text-navy-400">{p.progress}%</span>
            )}
          </div>
          {!p.error && (
            <div className="mt-2 h-1 overflow-hidden bg-navy-50">
              <div
                className="h-1 bg-navy-700 transition-[width] duration-200"
                style={{ width: `${p.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
      {showDrop && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handle(e.dataTransfer.files);
          }}
          className={clsx(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
            over ? "border-gold-400 bg-gold-50" : "border-line bg-ivory/50 hover:border-gold-300 hover:bg-gold-50/50",
          )}
        >
          <span
            className={clsx(
            "flex h-10 w-10 items-center justify-center transition",
              over ? "border-navy-700 bg-navy-700 text-white" : "border-line bg-white text-navy-600",
            )}
          >
            <UploadCloud className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-navy-800">
            {multiple && value.length ? "Add more files" : "Drop a file here or "}
            {!(multiple && value.length) && <span className="text-gold-700 underline decoration-gold-300 underline-offset-4">browse</span>}
          </span>
          <span className="text-[11px] text-navy-400">{hint}</span>
        </button>
      )}
      <input ref={input} type="file" className="hidden" multiple={multiple} accept={accept} onChange={(e) => handle(e.target.files)} />
    </div>
  );
}
