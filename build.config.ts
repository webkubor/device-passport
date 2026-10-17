import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/geo/index',
    'src/storage/index',
    'src/adapters/index',
    'src/evaluator/index',
    'src/types/index',
  ],
  declaration: true,
  clean: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
    esbuild: {
      target: 'es2022',
    },
  },
})
