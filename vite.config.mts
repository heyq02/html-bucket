import { liangmi } from '@liangmi/vp-config'
import swc from 'unplugin-swc'

// oxlint-disable-next-line import/no-default-export -- Vite+ loads this as the default config export
export default liangmi({
  // Let SWC own TS transform so Nest decorator metadata is emitted.
  esbuild: false,
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2022',
        parser: {
          syntax: 'typescript',
          decorators: true
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true
        },
        keepClassNames: true
      },
      module: {
        type: 'es6'
      }
    })
  ],
  lint: [
    {
      ignores: ['.agents/**', 'skills-lock.json']
    },
    {
      files: ['test/**', 'src/**/*.test.ts'],
      rules: {
        // Supertest uses `.expect(...)` assertions, not vitest `expect()`.
        'vitest/expect-expect': 'off'
      }
    }
  ],
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    setupFiles: ['reflect-metadata']
  }
  // NestJS ships as a Node service via `nest build`, not `vp pack`/`vp build`.
})
  .exclude(['pack'])
  .overrideRules({
    // Nest is class + decorator based.
    'max-classes-per-file': 'off',
    'class-methods-use-this': 'off',
    'typescript/parameter-properties': 'off',
    'typescript/no-extraneous-class': 'off',
    // Nest DI needs injectable classes as runtime values (not type-only imports).
    'typescript/consistent-type-imports': 'off'
  })
