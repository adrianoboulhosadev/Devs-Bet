import type { Config } from 'tailwindcss'

// Retro-arcade design tokens — colors/fonts/shadows lifted 1:1 from the mockup
// the owner generated in a separate conversation ("Devs-Bet Arcade.html").
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: '#07040d',
          surface: '#150d26',
          header: '#0d0818',
          border: '#34215c',
          'border-strong': '#2a1b4a',
          magenta: '#ff3d81',
          cyan: '#22e6ff',
          lime: '#b6ff3d',
          amber: '#ffb020',
          purple: '#c77dff',
          text: '#e9e3ff',
          'text-soft': '#c9b8f0',
          'text-muted': '#8b7bb8',
          danger: '#ff4d4d',
          shadow: '#08040f',
        },
      },
      // The mockup's signature border weight — plain Tailwind only ships 0/2/4/8.
      borderWidth: {
        3: '3px',
      },
      fontFamily: {
        pixel: ['var(--font-pixel)'],
        arcade: ['var(--font-arcade)'],
      },
      boxShadow: {
        'pixel-sm': '3px 3px 0 #08040f',
        pixel: '6px 6px 0 #08040f',
        'pixel-lg': '8px 8px 0 #08040f',
        'pixel-hover': '10px 10px 0 #08040f',
      },
      keyframes: {
        scrIn: { from: { opacity: '0', transform: 'translateY(14px) scaleY(.98)' }, to: { opacity: '1', transform: 'none' } },
        flicker: { '0%,97%,100%': { opacity: '.14' }, '98%': { opacity: '.05' }, '99%': { opacity: '.2' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '.15' } },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,61,129,.55)' },
          '50%': { boxShadow: '0 0 0 10px rgba(255,61,129,0)' },
        },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        sweep: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
        coinSpin: { '0%,100%': { transform: 'rotateY(0)' }, '50%': { transform: 'rotateY(180deg)' } },
        confetti: { to: { transform: 'translateY(110vh) rotate(720deg)', opacity: '.1' } },
        popIn: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        scrIn: 'scrIn .3s ease-out',
        flicker: 'flicker 6s infinite',
        blink: 'blink 1.2s steps(1) infinite',
        pulseGlow: 'pulseGlow 2.4s infinite',
        bob: 'bob 3s ease-in-out infinite',
        sweep: 'sweep 4.5s linear infinite',
        coinSpin: 'coinSpin 2.6s linear infinite',
        confetti: 'confetti 1.6s linear forwards',
        popIn: 'popIn .4s cubic-bezier(.2,1.3,.4,1)',
      },
    },
  },
  plugins: [],
}

export default config
