import type { Config } from '@/types'

export const BASE_CONFIG: Config = {
  packagePaths: {
    default: 'package.json',
  },
  defaults: {
    releaseType: 'patch',
    dryRun: false,
    verbose: false,
    allowUncommitted: false,
    publish: false,
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
    command: 'pnpm publish --access public --no-git-checks',
    skipChecks: true,
  },
}

export function validateConfig(config: Config): void {
  const errors: string[] = []

  if (config.git?.commitMessage && typeof config.git.commitMessage !== 'string') {
    errors.push('git.commitMessage 必须是字符串')
  }

  if (config.git?.tagPrefix && typeof config.git.tagPrefix !== 'string') {
    errors.push('git.tagPrefix 必须是字符串')
  }

  if (errors.length > 0) {
    throw new Error(`配置错误:\n${errors.join('\n')}`)
  }
}

export function isValidConfig(config: Config): boolean {
  return (
    config
    && config.packagePaths
    && typeof config.packagePaths === 'object'
    && Object.keys(config.packagePaths).length > 0
  )
}
