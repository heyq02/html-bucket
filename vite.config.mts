import {liangmi} from '@liangmi/vp-config'
import swc from 'unplugin-swc'

export default liangmi({
  // Let SWC own TS/TSX transform so Nest decorator metadata and React JSX both work.
  esbuild: false,
  publicDir: false,
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          react: {
            runtime: 'automatic',
          },
        },
        keepClassNames: true,
      },
      module: {
        type: 'es6',
      },
    }),
  ],
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  lint: [
    {
      ignores: ['.agents/**', 'skills-lock.json', 'dist/**'],
    },
    {
      files: ['test/**', 'src/**/*.test.ts'],
      rules: {
        // Supertest uses `.expect(...)` assertions, not vitest `expect()`.
        'vitest/expect-expect': 'off',
      },
    },
    {
      files: ['web/**'],
      rules: {
        // Small admin UI — event handlers and inline props are fine.
        'react-perf/jsx-no-new-function-as-prop': 'off',
        'react-perf/jsx-no-new-object-as-prop': 'off',
        'react-perf/jsx-no-new-array-as-prop': 'off',
        'typescript/no-misused-promises': 'off',
        'typescript/strict-void-return': 'off',
        'react/set-state-in-effect': 'off',
        'eslint/no-alert': 'off',
      },
    },
  ],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    setupFiles: ['reflect-metadata'],
  },
  run: {
    tasks: {
      // Everyday surface — keep this list short on purpose
      dev: {
        command: ['vp build', 'nest start --watch'],
        cache: false,
      },
      build: {
        command: ['nest build', 'vp build'],
      },
      start: {
        command: 'node dist/api/main.js',
        cache: false,
        dependsOn: ['build'],
      },
      check: {
        command: 'vp check',
      },
      test: {
        command: ['vp build', 'vp test'],
      },
    },
  },
})
  // Drop preset run tasks (cbuild/ccheck/…) so `vp run` only shows product tasks above
  .exclude(['pack', 'run'])
  .overrideRules({
    // Nest is class + decorator based.
    'max-classes-per-file': 'off',
    'class-methods-use-this': 'off',
    'typescript/parameter-properties': 'off',
    'typescript/no-extraneous-class': 'off',
    // Nest DI needs injectable classes as runtime values (not type-only imports).
    'typescript/consistent-type-imports': 'off',
  })
