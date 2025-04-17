/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'drift-slow': 'drift-slow 20s ease-in-out infinite',
        'drift-medium': 'drift-medium 15s ease-in-out infinite',
        'drift-slow-reverse': 'drift-slow-reverse 25s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
      keyframes: {
        'drift-slow': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(3%, -3%) rotate(1deg)' },
          '50%': { transform: 'translate(-2%, 4%) rotate(0deg)' },
          '75%': { transform: 'translate(-3%, -2%) rotate(-1deg)' },
        },
        'drift-medium': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(-4%, 2%) rotate(-1deg)' },
          '50%': { transform: 'translate(3%, -2%) rotate(1deg)' },
          '75%': { transform: 'translate(2%, 3%) rotate(0deg)' },
        },
        'drift-slow-reverse': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(-2%, 2%) rotate(-1deg)' },
          '50%': { transform: 'translate(3%, -3%) rotate(1deg)' },
          '75%': { transform: 'translate(-1%, -2%) rotate(0deg)' },
        },
        'shimmer': {
          'from': { backgroundPosition: '-1000px 0' },
          'to': { backgroundPosition: '1000px 0' },
        },
        'fade-in-up': {
          'from': {
            opacity: '0',
            transform: 'translateY(10px) translateX(-50%)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) translateX(-50%)',
          },
        },
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '0',
          },
          '50%': {
            opacity: '0.5',
          },
          '100%': {
            transform: 'scale(1.6)',
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
};