// tailwind.config.js OR tailwind.config.ts

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"], // Or "media" if you prefer
	content: [
	  // Make sure these paths cover where you use Tailwind classes
	  './pages/**/*.{ts,tsx}',
	  './components/**/*.{ts,tsx}',
	  './app/**/*.{ts,tsx}',
	  './src/**/*.{ts,tsx}',
	],
	prefix: "", // Often empty for Shadcn UI projects
	theme: {
	  // Your theme customizations (colors, fonts, etc.) go here
	  container: {
		center: true,
		padding: "2rem",
		screens: {
		  "2xl": "1400px",
		},
	  },
	  extend: {
		colors: {
		  // Example Shadcn UI color setup using CSS variables
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
		},
		borderRadius: {
		  lg: "var(--radius)",
		  md: "calc(var(--radius) - 2px)",
		  sm: "calc(var(--radius) - 4px)",
		},
		keyframes: {
		  "accordion-down": {
			from: { height: "0" },
			to: { height: "var(--radix-accordion-content-height)" },
		  },
		  "accordion-up": {
			from: { height: "var(--radix-accordion-content-height)" },
			to: { height: "0" },
		  },
		},
		animation: {
		  "accordion-down": "accordion-down 0.2s ease-out",
		  "accordion-up": "accordion-up 0.2s ease-out",
		},
		// Add the 'prose' styles to the theme extend if you want to customize them
		// (Optional, the plugin provides defaults)
		// typography: (theme) => ({
		//   DEFAULT: {
		//     css: {
		//       // Customize base prose styles here
		//     }
		//   },
		//   // Add customizations for dark, sm, lg, etc. if needed
		//   dark: { // This requires you name the theme 'dark' or use prose-invert
		//      css: {
		//        // Dark mode prose overrides
		//      }
		//   }
		// }),
	  },
	},
	// ----> THIS IS THE SECTION TO MODIFY <----
	plugins: [
	  require("tailwindcss-animate"),     // Likely already here for Shadcn UI
	  require('@tailwindcss/typography'), // ** ADD THIS LINE HERE **
	  // Add any other plugins you might be using
	],
	// ----> END SECTION TO MODIFY <----
  }
  