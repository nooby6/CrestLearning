import { SignedInExtras } from "@/components/shell/SignedInExtras";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SignedInExtras />
    </>
  );
}
