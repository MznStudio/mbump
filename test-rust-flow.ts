import { RustManager } from './src/core/RustManager'

const rm = new RustManager('./rust-test')

console.log('=== RustManager Flow Test ===')
console.log('exists:', rm.exists())
console.log('currentVersion:', rm.getCurrentVersion())
console.log('packageName:', rm.getPackageName())

const commits = rm.gitManager.getCommitsSinceLastTag()
console.log('commitsSinceLastTag:', JSON.stringify(commits, null, 2))

console.log('=== Manual changelog update ===')
rm.changelogManager.updateChangelog('0.0.12', commits)
console.log('Changelog updated manually')
