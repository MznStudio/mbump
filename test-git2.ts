import { GitManager } from './src/core/GitManager'

const gm = new GitManager('./rust-test')
const lastTag = gm.getLastTag()
console.log('Last tag:', lastTag)
