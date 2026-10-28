import type { Metadata } from "next";
import localFont from "next/font/local";
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

// Everything is per-user; never pre-render at build time.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
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
}
