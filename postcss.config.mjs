const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';

/**
 * Next.js expects PostCSS plugins to be provided as either strings or
 * plugin functions. The object returned by invoking `@tailwindcss/postcss`
 * triggers a "Malformed PostCSS Configuration" error, so we reference the
 * plugin by name instead. This keeps Tailwind enabled during regular builds
 * while allowing tests to run without PostCSS.
 */
const config = {
  plugins: isTest ? {} : { '@tailwindcss/postcss': {} },
};

export default config;
