import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

// Self-hosted (no runtime call to Google Fonts). Montserrat matches the logo's geometric caps.
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const montserrat = localFont({
  src: "../../node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Crest Learning", template: "%s · Crest Learning" },
  description: "Crest Learning — Cambridge, Edexcel, CBE and IB tuition in Nairobi. Learn. Grow. Excel.",
};

// Everything is per-user; never pre-render at build time (also keeps the build independent of Clerk keys).
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const page = (
    <html lang="en-KE" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-sans">
        {children}
        <ToastContainer
          position="bottom-right"
          theme="light"
          hideProgressBar
          closeButton={false}
          toastClassName="!rounded-lg !border !border-line !shadow-lift !text-sm !text-navy-900 !font-sans"
        />
      </body>
    </html>
  );
  // Without Clerk keys the middleware sends every request to /setup, which needs no Clerk.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return page;
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0A1D4F",
          colorText: "#06143A",
          fontFamily: "var(--font-inter)",
          borderRadius: "0.5rem",
        },
      }}
    >
      {page}
    </ClerkProvider>
  );
}
