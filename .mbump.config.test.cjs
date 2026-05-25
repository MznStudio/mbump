/** @type {import('@mznjs/mbump').Config} */
module.exports = defineConfig({
  packagePaths: {
    test: 'package.json',
  },
})

function defineConfig(config) {
  return config
}
