const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'terminal-green': '#00ff00',
                'terminal-black': '#000000',
                'terminal-dim': '#00cc00',
                'terminal-bright': '#00ff33',
            },
            fontFamily: {
                mono: ['VT323', ...fontFamily.mono],
                sans: ['VT323', ...fontFamily.sans],
            },
            animation: {
                'terminal-blink': 'blink 1s step-end infinite',
                'scan': 'scan 0.5s linear infinite',
            },
            keyframes: {
                blink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                scan: {
                    'from': { transform: 'translateY(0)' },
                    'to': { transform: 'translateY(2px)' },
                },
            },
        },
    },
    plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};