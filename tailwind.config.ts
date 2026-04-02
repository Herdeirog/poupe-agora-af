import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        user: {
          accent: "hsl(var(--user-accent))",
          "accent-strong": "hsl(var(--user-accent-strong))",
          danger: "hsl(var(--user-danger))",
          warning: "hsl(var(--user-warning))",
          info: "hsl(var(--user-info))",
          success: "hsl(var(--user-success))",
          "bg-primary": "hsl(var(--user-bg-primary))",
          "bg-secondary": "hsl(var(--user-bg-secondary))",
          "bg-glass": "hsl(var(--user-bg-glass))",
          "text-primary": "hsl(var(--user-text-primary))",
          "text-secondary": "hsl(var(--user-text-secondary))",
          "border-glass": "hsl(var(--user-border-glass))",
        },
        admin: {
          bg: "hsl(var(--admin-bg))",
          surface: "hsl(var(--admin-surface))",
          card: "hsl(var(--admin-card))",
          sidebar: "hsl(var(--admin-sidebar))",
          border: "hsl(var(--admin-border))",
          text: "hsl(var(--admin-text))",
          "text-secondary": "hsl(var(--admin-text-secondary))",
          "text-tertiary": "hsl(var(--admin-text-tertiary))",
          green: {
            DEFAULT: "hsl(var(--admin-green))",
            secondary: "hsl(var(--admin-green-secondary))",
            glow: "hsl(var(--admin-green-glow))",
          },
          red: "hsl(var(--admin-red))",
          "blue-mist": "hsl(var(--admin-blue-mist))",
          success: "hsl(var(--admin-success))",
          "success-foreground": "hsl(var(--admin-success-foreground))",
          warning: "hsl(var(--admin-warning))",
          "warning-foreground": "hsl(var(--admin-warning-foreground))",
          info: "hsl(var(--admin-info))",
          "info-foreground": "hsl(var(--admin-info-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glass: "0 4px 24px rgba(0, 0, 0, 0.35)",
        "glass-hover": "0 8px 32px rgba(0, 0, 0, 0.45)",
        "green-glow": "0 0 20px rgba(46, 245, 152, 0.28)",
        "green-glow-sm": "0 0 12px rgba(46, 245, 152, 0.2)",
        "green-glow-lg": "0 0 32px rgba(46, 245, 152, 0.4)",
        premium: "0 8px 24px rgba(0, 0, 0, 0.3)",
        "premium-hover": "0 12px 32px rgba(0, 0, 0, 0.4)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(8px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in-up": {
          from: {
            opacity: "0",
            transform: "translateY(16px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          from: {
            opacity: "0",
            transform: "scale(0.95)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        glow: {
          "0%, 100%": {
            boxShadow: "0 0 12px rgba(46, 245, 152, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 24px rgba(46, 245, 152, 0.5)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        glow: "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
