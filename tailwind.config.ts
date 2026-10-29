import type { Config } from "tailwindcss";

/**
 * Crest Learning brand tokens — sampled from the official logo.
 *   navy  #0A1D4F  (CREST wordmark, mountain, ring)
 *   gold  #C69A3A  (LEARNING, cap, book page)
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    // Square corners everywhere. `full` stays for avatars, toggles and status dots.
    borderRadius: {
      none: "0",
      sm: "0",
      DEFAULT: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "9999px",
    },
    extend: {
      colors: {
        navy: {
          50: "#EEF1F8",
          100: "#DCE2F0",
          200: "#B6C2E0",
          300: "#8396C6",
          400: "#4F68A6",
          500: "#2A4585",
          600: "#183168",
          700: "#11255A",
          800: "#0A1D4F", // brand
          900: "#06143A",
          950: "#030B24",
        },
        gold: {
          50: "#FBF7EC",
          100: "#F5EBD0",
          200: "#EBD7A2",
          300: "#DFBF70",
          400: "#D3AA4F",
          500: "#C69A3A", // brand
          600: "#A67D2B",
          700: "#835F22",
          800: "#5F451A",
          900: "#3E2D12",
        },
        // Neutral, cool surfaces and a visible hairline — crisp rather than warm.
        ivory: "#F4F6F9", // page background / table headers
        line: "#D5DBE5", // 1px borders
        "line-strong": "#B9C2D3",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        crest: "0.22em", // the wide tracking of "LEARNING" in the logo
      },
      boxShadow: {
        card: "none",
        lift: "0 6px 16px -6px rgba(10,29,79,0.22)", // menus and dialogs only
      },
    },
  },
  plugins: [],
};

export default config;
