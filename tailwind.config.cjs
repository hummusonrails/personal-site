const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#ecfdf7',
                    100: '#d2f8e7',
                    200: '#a7f1d3',
                    300: '#6ee5b8',
                    400: '#36d19a',
                    500: '#10a37f',
                    600: '#0d8d6f',
                    700: '#0b705b',
                    800: '#0c5a4a',
                    900: '#0c483d',
                },
                dark: {
                    bg: '#343541',
                    surface: '#444654',
                    border: '#3f4050',
                    text: {
                        primary: '#f5f5f7',
                        secondary: '#c5c5d2',
                        muted: '#8e8ea0',
                    }
                }
            },
            fontFamily: {
                sans: ['Sohne', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', ...fontFamily.sans],
                mono: ['Sohne Mono', 'IBM Plex Mono', ...fontFamily.mono],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
        },
    },
    plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
