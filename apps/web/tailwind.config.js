/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "#05040A",
        bg1: "#0B0820",
        panel: "rgba(12, 10, 24, 0.65)",
        line: "rgba(167, 139, 250, 0.35)",

        neon: {
          purple: "#A78BFA",
          pink: "#FB7185",
          blue: "#60A5FA"
        },

        text: {
          main: "#E7E7EE",
          sub: "rgba(231, 231, 238, 0.72)",
          dim: "rgba(231, 231, 238, 0.55)"
        }
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(167,139,250,0.25), 0 0 30px rgba(167,139,250,0.18)",
        neonStrong: "0 0 0 1px rgba(251,113,133,0.35), 0 0 40px rgba(251,113,133,0.20)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
