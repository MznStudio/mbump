import { GitManager } from './src/core/GitManager'

const gm = new GitManager('./rust-test')
const commits = gm.getCommitsSinceLastTag()
console.log('Commits:', JSON.stringify(commits, null, 2))
