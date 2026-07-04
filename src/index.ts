import type { Config } from './types'

export function defineConfig(config?: Config): Config {
  return config || {} as Config
}

export default defineConfig

export { clearConfigCache, loadConfig, loadConfigAsync } from './config/loader'
export { BASE_CONFIG } from './config/schema'
export { ChangelogManager } from './core/ChangelogManager'
export { GitManager } from './core/GitManager'
export { RustManager } from './core/RustManager'
export { VersionManager } from './core/VersionManager'
export * from './types'

export { default as log } from './utils/logger'
export * as pathUtils from './utils/path'
export * as securityUtils from './utils/security'
export * as semverUtils from './utils/semver'
