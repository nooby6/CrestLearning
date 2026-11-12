"use client";

import { createContext, useContext } from "react";

export type UploadMode = { blob: boolean; userId: string; limits: Record<string, number> | null };

const Ctx = createContext<UploadMode | null>(null);

/** The server already knows whether large-file storage is on — hand it down instead of asking over the network. */
export function UploadModeProvider({ value, children }: { value: UploadMode; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUploadMode = () => useContext(Ctx);
