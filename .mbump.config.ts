/**
 * TypeScript 配置文件示例
 * 文件名: .mbump.config.ts.bak
 *
 * 注意: TypeScript 配置需要安装 tsx，并使用异步加载
 */
import type { Config } from './src/index'

export default {
  packagePaths: {
    theme: 'packages/theme/package.json',
    web: 'packages/web/package.json',
    utils: 'plugins/utils/package.json',
    core: 'plugins/core/package.json',
  },
  defaults: {
    releaseType: 'patch',
    dryRun: false,
    verbose: false,
    allowUncommitted: false,
    npm: false,
  },
  git: {
    commitMessage: 'chore: bump version to {{newVersion}}',
    push: true,
    autoCommit: true,
    tag: true,
    tagPrefix: 'v',
    changelog: true,
  },
  publish: {
    command: 'npm publish',
    skipChecks: false,
  },
} satisfies Config
