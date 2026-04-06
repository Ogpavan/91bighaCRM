/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        atlassian: {
          50: "#E9F2FF",
          100: "#CCE0FF",
          200: "#A5C8FF",
          300: "#85B8FF",
          400: "#579DFF",
          500: "#388BFF",
          600: "#0C66E4",
          700: "#0055CC",
          800: "#09326C",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: {
          DEFAULT: "#0C66E4",
          foreground: "#FFFFFF",
          50: "#E9F2FF",
          100: "#CCE0FF",
          600: "#0C66E4",
          700: "#0055CC",
        },
        "primary-foreground": "#FFFFFF",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "0.2rem",
        md: "0.125rem",
        sm: "0.125rem",
      },
    },
  },
  plugins: [],
};
