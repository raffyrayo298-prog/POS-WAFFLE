// Tailwind CDN theme config — loaded as a plain script, must run before
// Tailwind scans the page. Keep this framework-free (no imports).
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#FBF8F3",
          100: "#F4EEE3",
          200: "#E9DFCC",
        },
        espresso: {
          50: "#F3EDE7",
          100: "#E2D3C4",
          300: "#B08F6F",
          500: "#7A5439",
          700: "#4A3324",
          800: "#3A2819",
          900: "#2A1B10",
          950: "#1B110A",
        },
        sage: {
          50: "#EEF3EC",
          100: "#D9E5D4",
          400: "#7DA173",
          500: "#5E8754",
          600: "#4A6E42",
          700: "#3A5634",
        },
        rust: {
          50: "#FBEAE4",
          100: "#F3CBBD",
          500: "#B5502D",
          600: "#9C4025",
          700: "#7C331F",
        },
        amber: {
          400: "#E0A94A",
          500: "#CC9636",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(42,27,16,0.06), 0 6px 16px rgba(42,27,16,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
};
