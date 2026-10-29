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
      // Frontend (cbuild from @liangmi/vp-config is also `vp build`)
      'build:web': {
        command: 'vp build',
        cache: {
          output: ['dist/web/**'],
        },
      },
      'dev:web': {
        command: 'vp dev',
        cache: false,
      },

      // Backend
      'build:api': {
        command: 'nest build',
        cache: {
          input: [
            {auto: true},
            'src/**',
            'tsconfig.json',
            'tsconfig.build.json',
            'nest-cli.json',
          ],
          output: ['dist/**', '!dist/web/**'],
        },
      },

      // Full product build: Vite UI + Nest
      build: {
        command: ['vp build', 'nest build'],
      },

      // Runtime
      start: {
        command: 'nest start',
        cache: false,
        dependsOn: ['build'],
      },
      'start:dev': {
        command: 'nest start --watch',
        cache: false,
        dependsOn: ['build:web'],
      },
      'start:debug': {
        command: 'nest start --debug --watch',
        cache: false,
        dependsOn: ['build:web'],
      },
      'start:prod': {
        command: 'node dist/main.js',
        cache: false,
        dependsOn: ['build'],
      },

      // Quality — prefer these aliases; ccheck/ctest/cfmt/clint remain from the preset
      check: {
        command: 'vp check',
      },
      lint: {
        command: 'vp lint',
      },
      format: {
        command: 'vp fmt',
      },
      test: {
        command: 'vp test',
        dependsOn: ['build:web'],
      },
      'test:e2e': {
        command: 'vp test run test/pages.e2e.test.ts',
        dependsOn: ['build:web'],
      },
      'test:watch': {
        command: 'vp test watch',
        cache: false,
      },
    },
  },
})
  .exclude(['pack'])
  .overrideRules({
    // Nest is class + decorator based.
    'max-classes-per-file': 'off',
    'class-methods-use-this': 'off',
    'typescript/parameter-properties': 'off',
    'typescript/no-extraneous-class': 'off',
    // Nest DI needs injectable classes as runtime values (not type-only imports).
    'typescript/consistent-type-imports': 'off',
  })
