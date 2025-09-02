/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        // Base colors
        blue: "var(--blue)",
        indigo: "var(--indigo)",
        purple: "var(--purple)",
        pink: "var(--pink)",
        red: "var(--red)",
        orange: "var(--orange)",
        yellow: "var(--yellow)",
        green: "var(--green)",
        teal: "var(--teal)",
        cyan: "var(--cyan)",
        white: "var(--white)",
        gray: "var(--gray)",
        "gray-dark": "var(--gray-dark)",

        // Theme colors
        primary: {
          DEFAULT: "var(--primary)",
          1: "var(--primary1)",
          2: "var(--primary2)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          1: "var(--secondary1)",
          2: "var(--secondary2)",
        },

        // State colors
        success: "var(--success)",
        info: "var(--info)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        light: "var(--light)",
        dark: "var(--dark)",
      },
      screens: {
        xs: "var(--breakpoint-xs)",
        sm: "var(--breakpoint-sm)",
        md: "var(--breakpoint-md)",
        lg: "var(--breakpoint-lg)",
        xl: "var(--breakpoint-xl)",
        xxl: "var(--breakpoint-xxl)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/line-clamp")],
};
