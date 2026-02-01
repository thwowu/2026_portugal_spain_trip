import type { Config } from 'tailwindcss'
import containerQueries from '@tailwindcss/container-queries'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  // This project already has a strong CSS baseline and design tokens in `src/index.css`.
  // Start by keeping Tailwind from resetting element styles; we can revisit later if desired.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      typography: () => ({
        DEFAULT: {
          css: {
            // Let our layout container control line length.
            maxWidth: 'none',

            // Use existing design tokens.
            '--tw-prose-body': 'var(--text)',
            '--tw-prose-headings': 'var(--text)',
            '--tw-prose-lead': 'var(--muted)',
            '--tw-prose-links': 'var(--accent)',
            '--tw-prose-bold': 'var(--text)',
            '--tw-prose-counters': 'var(--muted)',
            '--tw-prose-bullets': 'color-mix(in oklab, var(--accent) 34%, var(--hairline))',
            '--tw-prose-hr': 'var(--hairline)',
            '--tw-prose-quotes': 'var(--text)',
            '--tw-prose-quote-borders': 'color-mix(in oklab, var(--accent) 25%, var(--hairline))',
            '--tw-prose-captions': 'var(--muted)',
            '--tw-prose-code': 'var(--text)',
            '--tw-prose-pre-code': 'var(--text)',
            '--tw-prose-pre-bg': 'color-mix(in oklab, var(--surface-2) 70%, white)',
            '--tw-prose-th-borders': 'var(--hairline)',
            '--tw-prose-td-borders': 'var(--hairline)',

            // Keep the existing compact rhythm used throughout the app.
            p: { margin: 0 },
            'p + p': { marginTop: '10px' },

            ul: { margin: '8px 0 0 0', paddingLeft: '18px' },
            ol: { margin: '8px 0 0 0', paddingLeft: '18px' },
            li: { marginTop: '6px' },

            a: { textDecoration: 'none' },
            'a:hover': { textDecoration: 'underline' },

            code: {
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: '0.95em',
              padding: '2px 6px',
              borderRadius: '8px',
              border: '1px solid var(--hairline)',
              background: 'color-mix(in oklab, var(--surface-2) 70%, white)',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            },

            // Avoid auto backticks styling that may clash with our inline code tokens.
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
          },
        },
      }),
    },
  },
  plugins: [typography, containerQueries],
} satisfies Config

