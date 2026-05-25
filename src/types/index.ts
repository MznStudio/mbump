export type ReleaseType
  = | 'major'
    | 'minor'
    | 'patch'
    | 'next'
    | 'pre-patch'
    | 'pre-minor'
    | 'pre-major'
    | 'as-is'
    | 'conventional'
    | 'custom'

export interface PackageInfo {
  name: string
  version: string
  description?: string
  main?: string
  scripts?: Record<string, string>
  [key: string]: unknown
}

export interface PackagePaths {
  [key: string]: string
}

export interface DefaultsConfig {
  releaseType?: ReleaseType
  type?: ReleaseType
  dryRun?: boolean
  verbose?: boolean
  allowUncommitted?: boolean
  npm?: boolean
}

export interface GitConfig {
  commitMessage?: string
  push?: boolean
  autoCommit?: boolean
  tag?: boolean
  tagPrefix?: string
  changelog?: boolean
}

export interface PublishConfig {
  command?: string
  skipChecks?: boolean
}

export interface Config {
  packagePaths: PackagePaths
  defaults?: DefaultsConfig
  git?: GitConfig
  publish?: PublishConfig
  usedConfigPath?: string | null
}

export interface VersionManagerOptions {
  packagePaths?: PackagePaths
  configPath?: string
  config?: Config
  rootDir?: string
}

export interface UpdateOptions {
  dryRun?: boolean
  verbose?: boolean
  packagePaths?: PackagePaths
  customVersion?: string | null
  autoCommit?: boolean
  push?: boolean
  npm?: boolean
  changelog?: boolean
  tag?: boolean
  tagPrefix?: string
}

export interface UpdatedPackage {
  name: string
  oldVersion: string
  newVersion: string
}

export interface UpdateResult {
  success: boolean
  updatedPackages: UpdatedPackage[]
  publishedPackages: string[]
  error: string | null
}

export interface ParsedArgs {
  package: string | null
  type: ReleaseType
  dryRun: boolean
  help: boolean
  verbose: boolean
  autoCommit: boolean
  push: boolean
  allowUncommitted: boolean
  npm: boolean
}

export interface SpinnerOptions {
  succeedText?: string
  failText?: string
}

export interface PackageVersionSelection {
  type: ReleaseType
  customVersion: string | null
}

export interface PackageVersionSelections {
  [packageName: string]: PackageVersionSelection
}

export interface ChangelogCommit {
  message: string
  files: string[]
}

export interface ChangelogTypeConfig {
  title: string
  emoji: string
  color: string
}
