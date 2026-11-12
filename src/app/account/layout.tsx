import { SignedInExtras } from "@/components/shell/SignedInExtras";
import { PortalBackdrop } from "@/components/shell/PortalBackdrop";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalBackdrop />
      {children}
      <SignedInExtras />
    </>
  );
}
