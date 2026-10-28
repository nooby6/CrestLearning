"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { setMyPhoto } from "@/lib/actions/profile";

/** Centre-crops to a square and scales to 512 px, so every photo looks tidy in a circle and uploads fast. */
async function squarePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.88));
  if (!blob) throw new Error("Couldn’t read that photo.");
  return blob;
}

export function PhotoForm({ current, initials }: { current: string | null; initials: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await squarePhoto(file);
      setPreview(URL.createObjectURL(blob));
      const body = new FormData();
      body.append("purpose", "avatar");
      body.append("file", new File([blob], "profile.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error ?? "Upload failed. Please try again.");
      const r = await setMyPhoto(data.id);
      if (!r.ok) throw new Error(r.error);
      toast.success(r.message);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message || "Use a JPG, PNG or WebP photo.");
      setPreview(current);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-navy-700 to-navy-900 shadow-lift ring-4 ring-white transition hover:ring-gold-200"
        aria-label="Choose a photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-3xl font-semibold text-gold-300">{initials}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-navy-950/45 text-white opacity-0 transition group-hover:opacity-100">
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
        </span>
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-navy-950/45 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
        )}
      </button>
      <div className="mt-5 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => input.current?.click()} disabled={busy}>
          <Camera className="h-4 w-4" /> {preview ? "Change photo" : "Upload a photo"}
        </button>
        {preview && (
          <button
            type="button"
            className="btn-ghost text-rose-700"
            disabled={busy || pending}
            onClick={() =>
              start(async () => {
                const r = await setMyPhoto(null);
                if (!r.ok) return void toast.error(r.error);
                setPreview(null);
                toast.success(r.message);
                router.refresh();
              })
            }
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-navy-400">A clear, friendly headshot works best. Students and parents see it next to your name.</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
