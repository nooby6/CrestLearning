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
  title: { default: "Crest Learning & STEM Centre", template: "%s · Crest Learning & STEM Centre" },
  description: "One-to-one tuition and homeschooling in Nairobi across Cambridge, Pearson Edexcel, CBE and IB — at our centre, at home or live online.",
  metadataBase: new URL(process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
};

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
          toastClassName="!rounded-none !border !border-line !shadow-lift !text-sm !text-navy-900 !font-sans"
        />
      </body>
    </html>
  );
}
