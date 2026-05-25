/** @type {import('@mznjs/mbump').Config} */
export default defineConfig({
  packagePaths: {
    components: 'packages/components/package.json',
    cli: 'packages/cli/package.json',
    core: 'packages/core/package.json',
    default: 'package.json',
  },
})

function defineConfig(config) {
  return config
}
