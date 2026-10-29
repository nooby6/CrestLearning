import clsx from "clsx";
import { Download, File, FileImage, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { formatBytes } from "@/lib/format";

export type FileInfo = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export function fileIcon(mime: string) {
  if (mime === "application/pdf" || mime.includes("word") || mime === "text/plain") return FileText;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return Presentation;
  return File;
}

const tone = (mime: string) =>
  mime === "application/pdf"
    ? "bg-rose-50 text-rose-600"
    : mime.startsWith("image/")
      ? "bg-sky-50 text-sky-600"
      : mime.includes("sheet") || mime.includes("excel")
        ? "bg-emerald-50 text-emerald-600"
        : mime.includes("presentation") || mime.includes("powerpoint")
          ? "bg-orange-50 text-orange-600"
          : "bg-navy-50 text-navy-600";

/** A stored file: opens in a new tab (PDFs and photos preview in the browser). */
export function FileChip({ file, className, action }: { file: FileInfo; className?: string; action?: React.ReactNode }) {
  const Icon = fileIcon(file.mimeType);
  return (
    <div
      className={clsx(
        "group flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 transition-colors hover:border-navy-400",
        className,
      )}
    >
      <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone(file.mimeType))}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <a href={`/files/${file.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-navy-900 group-hover:underline group-hover:decoration-gold-400 group-hover:underline-offset-4">
          {file.name}
        </span>
        <span className="block text-[11px] text-navy-400">{formatBytes(file.sizeBytes)}</span>
      </a>
      {action ?? (
        <a
          href={`/files/${file.id}?download=1`}
          className="rounded-md p-1.5 text-navy-300 transition hover:bg-navy-50 hover:text-navy-700"
          aria-label={`Download ${file.name}`}
        >
          <Download className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
