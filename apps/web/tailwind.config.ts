import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#08080F',
        surface: '#0F0F1A',
        elevated: '#16162A',
        card: '#1A1A2E',
        'border-dim': '#2A2A45',
        'border-bright': '#3D3D60',
        'text-1': '#E8E8F0',
        'text-2': '#9090B0',
        'text-3': '#55556A',
        accent: '#7C6CF8',
        'accent-2': '#9B8DFF',
        'accent-dim': 'rgba(124, 108, 248, 0.12)',
        upvote: '#FF6B35',
        downvote: '#6B8EF5',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        brand: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
    },
  },
  plugins: [],
} satisfies Config
