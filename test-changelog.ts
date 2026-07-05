import { ChangelogManager } from './src/core/ChangelogManager'

const cm = new ChangelogManager('./rust-test')
cm.updateChangelog('0.0.11', [
  { hash: 'test-hash-123', message: 'feat: test commit', files: ['Cargo.toml'] },
])
console.log('Changelog updated')
