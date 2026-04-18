/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          heading: ["var(--font-heading)", "Poppins", "sans-serif"],
          body: ["var(--font-body)", "Inter", "sans-serif"],
        },
        colors: {
          accent: {
            DEFAULT: "var(--color-accent)",
            dark: "var(--color-accent-dark)",
            light: "var(--color-accent-light)",
          },
          text: {
            dark: "var(--color-text-dark)",
            light: "var(--color-text-light)",
          },
          bg: {
            light: "var(--color-bg-light)",
            dark: "var(--color-bg-dark)",
          },
        },
        spacing: {
          xs: "var(--space-xs)",
          sm: "var(--space-sm)",
          md: "var(--space-md)",
          lg: "var(--space-lg)",
          xl: "var(--space-xl)",
        },
        boxShadow: {
          card: "0 4px 10px rgba(0,0,0,0.08)",
          hover: "0 6px 16px rgba(0,0,0,0.12)",
        },
        borderRadius: {
          xl: "var(--radius-xl, 1rem)",
          "2xl": "var(--radius-2xl, 1.5rem)",
        },
        transitionTimingFunction: {
          smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        },
        keyframes: {
          fadeInUp: {
            "0%": { opacity: 0, transform: "translateY(40px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
          float: {
            "0%, 100%": { transform: "translateY(0)" },
            "50%": { transform: "translateY(-8px)" },
          },
        },
        animation: {
          fadeInUp: "fadeInUp 0.8s ease-out forwards",
          float: "float 3s ease-in-out infinite",
        },
        screens: {
          xs: "420px",
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1536px",
        },
      },
    },
    plugins: [
      require("@tailwindcss/forms"),
      require("@tailwindcss/typography"),
      require("@tailwindcss/aspect-ratio"),
    ],
  };
  