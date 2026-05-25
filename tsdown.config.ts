import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    cli: './src/cli/index.ts',
  },
  externals: ['consola', 'inquirer', 'ora', 'semver'],
  outDir: 'dist',
  dts: true,
})
