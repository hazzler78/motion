import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sd-blue': '#322667',
        'sd-yellow': '#FFD700',
        'sd-red': '#E30613',
        'sd-gray': '#4A4A4A',
      },
      fontFamily: {
        sans: ['Ibiza22', 'sans-serif'],
        light: ['Ibiza22', 'sans-serif'],
        normal: ['Ibiza22', 'sans-serif'],
        medium: ['Ibiza22', 'sans-serif'],
        semibold: ['Ibiza22', 'sans-serif'],
        bold: ['Ibiza22', 'sans-serif'],
        extrabold: ['Ibiza22', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config 