/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand (黛瓦墨蓝) — main slate blue family ───────────────
        // Used as the primary action, sidebar accent, focus rings.
        // We re-map Tailwind's `indigo` palette so every existing
        // `indigo-*` className picks up the new SaaS slate blue
        // without a full codebase refactor.
        indigo: {
          50:  '#EEF1F5',
          100: '#DCE2EB',
          200: '#B5C0CF',
          300: '#8E9DB3',
          400: '#677B97',
          500: '#475C77',  // hover
          600: '#3A4D65',  // primary button bg
          700: '#2F3E4E',  // 黛瓦墨蓝 — main primary
          800: '#252F3C',
          900: '#1A2129',
        },
        // Semantic alias for `indigo`
        brand: {
          50:  '#EEF1F5',
          100: '#DCE2EB',
          200: '#B5C0CF',
          300: '#8E9DB3',
          400: '#677B97',
          500: '#475C77',
          600: '#3A4D65',
          700: '#2F3E4E',
          800: '#252F3C',
          900: '#1A2129',
        },
        // ── Secondary (沉稳灰蓝) ─────────────────────────────────
        steel: {
          50:  '#F1F4F8',
          100: '#DDE4EC',
          200: '#BCC8D6',
          300: '#9AABBE',
          400: '#7B8FA7',
          500: '#61748A',  // 沉稳灰蓝
          600: '#4F6075',
          700: '#3E4C5E',
        },
        // ── Accent (暖铜) — premium highlight ────────────────────
        accent: {
          50:  '#FAF4EE',
          100: '#F2E4D2',
          200: '#E4C9A8',
          300: '#D2AB7E',
          400: '#C19463',
          500: '#B3865B',  // 暖铜
          600: '#9C7048',
          700: '#7E5938',
        },
        // ── Surface / background (浅雾灰) ────────────────────────
        // Override gray-50 so every existing `bg-gray-50` becomes
        // the new sophisticated background.
        gray: {
          50:  '#F2F4F7',  // 浅雾灰 — main bg
          100: '#E6E9EE',
          200: '#D2D7DF',
          300: '#B0B7C2',
          400: '#7C8593',
          500: '#5A6371',
          600: '#3F4754',
          700: '#2B323D',
          800: '#1F242C',
          900: '#1A1F24',  // 深墨黑
        },
        // ── Ink (深墨黑) — primary text ──────────────────────────
        ink: {
          DEFAULT: '#1A1F24',
          soft:    '#3F4754',
          muted:   '#5A6371',
          subtle:  '#7C8593',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: {
        // Body 14–16px, line-height 22–24px
        sm:   ['14px', { lineHeight: '22px' }],
        base: ['15px', { lineHeight: '24px' }],
        lg:   ['16px', { lineHeight: '24px' }],
        // Title 18–24px, line-height 28–32px
        xl:   ['18px', { lineHeight: '28px' }],
        '2xl':['20px', { lineHeight: '30px' }],
        '3xl':['24px', { lineHeight: '32px' }],
      },

      boxShadow: {
        card:    '0 1px 2px 0 rgba(47, 62, 78, 0.04), 0 1px 3px 0 rgba(47, 62, 78, 0.06)',
        'card-hover': '0 4px 12px -2px rgba(47, 62, 78, 0.08), 0 2px 6px -1px rgba(47, 62, 78, 0.06)',
        elevated:'0 8px 24px -4px rgba(47, 62, 78, 0.12), 0 4px 10px -2px rgba(47, 62, 78, 0.06)',
        focus:   '0 0 0 3px rgba(47, 62, 78, 0.12)',
      },

      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
