import type { IVersionProvider, ProjectType } from './VersionProvider'
import type { Config, GitConfig, PackageInfo, PackagePaths, PreviewPackage, PreviewResult, PublishConfig, ReleaseType, UpdateOptions, UpdateResult, VersionManagerOptions } from '@/types'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { loadConfig } from '@/config/loader'
import log from '@/utils/logger'
import { validateCommand, validatePath } from '@/utils/security'
import { getMajor, getMinor, getPatch, incrementVersion, isPrerelease, isValidVersion } from '@/utils/semver'
import { ChangelogManager } from './ChangelogManager'
import { GitManager } from './GitManager'
import { NodeVersionProvider, RustVersionProvider } from './VersionProvider'

export class VersionManager {
  private config: Config
  private rootDir: string
  private packagePaths: PackagePaths
  private publishConfig: PublishConfig
  private gitConfig: GitConfig
  private packageCache: Map<string, PackageInfo> = new Map()
  private gitManager: GitManager
  private changelogManager: ChangelogManager
  private versionProvider: IVersionProvider

  constructor(options: VersionManagerOptions & { projectType?: ProjectType } = {}) {
    const { packagePaths, configPath, config, rootDir = process.cwd(), projectType = 'node' } = options

    this.config = config || (configPath ? loadConfig(dirname(configPath)) : loadConfig(rootDir))
    this.rootDir = rootDir
    this.packagePaths = packagePaths || this.config.packagePaths
    this.publishConfig = this.config.publish || {}
    this.gitConfig = this.config.git || {}
    this.gitManager = new GitManager(rootDir)
    this.changelogManager = new ChangelogManager(rootDir)
    this.versionProvider = projectType === 'rust' ? new RustVersionProvider() : new NodeVersionProvider()

    if (!this.packagePaths || typeof this.packagePaths !== 'object' || Object.keys(this.packagePaths).length === 0) {
      throw new Error('Invalid config: no valid package paths')
    }

    this._preloadPackageCache()
  }

  // P0: Unified version calculation (eliminates 3 copies of switch block)
  private calculateNewVersion(currentVersion: string, releaseType: ReleaseType): string | null {
    switch (releaseType) {
      case 'major':
      case 'minor':
      case 'patch':
        return incrementVersion(currentVersion, releaseType)

      case 'next':
        return incrementVersion(currentVersion, 'patch')

      case 'pre-patch':
        if (isPrerelease(currentVersion)) {
          return incrementVersion(currentVersion, 'prerelease', 'beta')
        }
        else {
          return incrementVersion(currentVersion, 'prepatch', 'beta')
        }

      case 'pre-minor':
        if (isPrerelease(currentVersion)) {
          const currentMinor = getMinor(currentVersion) ?? 0
          const potentialVersion = incrementVersion(currentVersion, 'preminor', 'beta')
          if (potentialVersion && (getMinor(potentialVersion) ?? 0) > currentMinor) {
            return potentialVersion
          }
          else {
            return incrementVersion(currentVersion, 'prerelease', 'beta')
          }
        }
        else {
          return incrementVersion(currentVersion, 'preminor', 'beta')
        }

      case 'pre-major':
        if (isPrerelease(currentVersion)) {
          const currentMajor = getMajor(currentVersion) ?? 0
          const potentialVersion = incrementVersion(currentVersion, 'premajor', 'beta')
          if (potentialVersion && (getMajor(potentialVersion) ?? 0) > currentMajor) {
            return potentialVersion
          }
          else {
            return incrementVersion(currentVersion, 'prerelease', 'beta')
          }
        }
        else {
          return incrementVersion(currentVersion, 'premajor', 'beta')
        }

      case 'as-is':
        return currentVersion

      case 'conventional':
        return incrementVersion(currentVersion, 'patch')

      default:
        throw new Error(`Unsupported release type: ${releaseType}`)
    }
  }

  private _isDefaultPackage(pkgKey: string): boolean {
    const pkgPath = this.config.packagePaths[pkgKey]
    if (!pkgPath)
      return false

    const isDefaultKey = pkgKey === 'default'
    const resolvedPkgPath = resolve(this.rootDir, pkgPath)
    const resolvedPkgDir = dirname(resolvedPkgPath)
    const resolvedRootDir = resolve(this.rootDir)
    const isNodeRoot = pkgPath.endsWith('package.json') && resolvedPkgDir === resolvedRootDir
    const isRustRoot = pkgPath.includes('Cargo.toml')

    const isSinglePackageMode = Object.keys(this.config.packagePaths).length === 1
    const isPathModeRoot = isSinglePackageMode && isNodeRoot

    return isDefaultKey || (isNodeRoot && !isPathModeRoot) || isRustRoot
  }

  private _preloadPackageCache(): void {
    for (const pkgPath of Object.values(this.packagePaths)) {
      try {
        this.getPackageInfo(pkgPath)
      }
      catch (error) {
        log.debug(`Preload package info failed ${pkgPath}: ${(error as Error).message}`)
      }
    }
    log.debug(`Preloaded ${this.packageCache.size} package infos into cache`)
  }

  clearPackageCache(pkgPath?: string): void {
    if (pkgPath) {
      this.packageCache.delete(pkgPath)
      log.debug(`Cleared package cache: ${pkgPath}`)
    }
    else {
      this.packageCache.clear()
      log.debug('Cleared all package cache')
    }
  }

  refreshPackageCache(pkgPath: string): PackageInfo {
    this.packageCache.delete(pkgPath)
    return this.getPackageInfo(pkgPath)
  }

  getCacheStats(): { size: number, packages: string[] } {
    return {
      size: this.packageCache.size,
      packages: Array.from(this.packageCache.keys()),
    }
  }

  async previewUpdate(pkgName: string, releaseType: ReleaseType = 'patch', options: UpdateOptions = {}): Promise<PreviewResult> {
    const {
      packagePaths = this.packagePaths,
      customVersion = null,
      autoCommit = this.gitConfig.autoCommit !== false,
      push = this.gitConfig.push !== false,
      publish = false,
      changelog = this.gitConfig.changelog !== false,
      packageVersionSelections,
    } = options

    const packages: PreviewPackage[] = []

    if (pkgName === 'all' && packageVersionSelections) {
      for (const [packageName, selection] of Object.entries(packageVersionSelections)) {
        const pkgPath = packagePaths[packageName]
        if (!pkgPath) {
          throw new Error(`无效的包名: ${packageName}`)
        }

        const pkg = this.getPackageInfo(pkgPath)
        let newVersion: string | null = null

        if (selection.customVersion) {
          if (!isValidVersion(selection.customVersion)) {
            throw new Error(`无效的自定义版本号: ${selection.customVersion}`)
          }
          newVersion = selection.customVersion
        }
        else {
          try {
            newVersion = this.calculateNewVersion(pkg.version, selection.type)
          }
          catch (error: any) {
            throw new Error(`Version calculation failed: ${error.message}`)
          }
        }

        if (!newVersion) {
          throw new Error(`Cannot calculate new version, current: ${pkg.version}, type: ${selection.type}`)
        }

        const isDefaultPackage = this._isDefaultPackage(packageName)
        const tagName = this.versionProvider.getDefaultTagFormat(
          pkg.name,
          newVersion,
          isDefaultPackage,
        )

        packages.push({
          name: packageName,
          oldVersion: pkg.version,
          newVersion,
          tagName,
          changelogEnabled: changelog && isDefaultPackage,
          isDefaultPackage,
        })
      }
    }
    else {
      const targets = pkgName === 'all' ? Object.entries(packagePaths) : [[pkgName, packagePaths[pkgName]]]

      if (!targets.length || targets.some(([, path]) => !path)) {
        throw new Error(`无效的包名: ${pkgName}`)
      }

      for (const [packageName, pkgPath] of targets) {
        const pkg = this.getPackageInfo(pkgPath)
        let newVersion: string | null = null

        if (customVersion) {
          if (!isValidVersion(customVersion)) {
            throw new Error(`无效的自定义版本号: ${customVersion}`)
          }
          newVersion = customVersion
        }
        else {
          try {
            newVersion = this.calculateNewVersion(pkg.version, releaseType)
          }
          catch (error: any) {
            throw new Error(`Version calculation failed: ${error.message}`)
          }
        }

        if (!newVersion) {
          throw new Error(`Cannot calculate new version, current: ${pkg.version}, type: ${releaseType}`)
        }

        const isDefaultPackage = this._isDefaultPackage(packageName)
        const tagName = this.versionProvider.getDefaultTagFormat(
          pkg.name,
          newVersion,
          isDefaultPackage,
        )

        packages.push({
          name: packageName,
          oldVersion: pkg.version,
          newVersion,
          tagName,
          changelogEnabled: changelog && isDefaultPackage,
          isDefaultPackage,
        })
      }
    }

    return {
      packages,
      autoCommit,
      push,
      publish,
    }
  }

  async updateVersion(pkgName: string, releaseType: ReleaseType = 'patch', options: UpdateOptions = {}): Promise<UpdateResult> {
    const {
      dryRun = false,
      verbose = false,
      packagePaths = this.packagePaths,
      customVersion = null,
      autoCommit = this.gitConfig.autoCommit !== false,
      publish = false,
      changelog = this.gitConfig.changelog !== false,
      tag = this.gitConfig.tag !== false,
      tagPrefix = this.gitConfig.tagPrefix || 'v',
      isBatchMode = false,
    } = options

    const result: UpdateResult = {
      success: false,
      updatedPackages: [],
      publishedPackages: [],
      error: null,
    }

    // P1: Cache _isDefaultPackage result (was called 4x with same params)
    const cachedIsDefaultPackage = pkgName === 'all'
      ? this._isDefaultPackage(Object.keys(packagePaths)[0])
      : this._isDefaultPackage(pkgName)

    return log.withSpinner(
      `Updating ${pkgName === 'all' ? 'all packages' : `package ${pkgName}`}...`,

      async () => {
        try {
          const targets = pkgName === 'all' ? Object.values(packagePaths) : [packagePaths[pkgName]]

          if (!targets.length || targets.some(path => !path)) {
            throw new Error(`无效的包名: ${pkgName}`)
          }

          let finalVersion: string | null = null
          for (const pkgPath of targets) {
            const pkg = this.getPackageInfo(pkgPath)
            let newVersion: string | null = null

            if (customVersion) {
              if (!isValidVersion(customVersion)) {
                throw new Error(`无效的自定义版本号: ${customVersion}`)
              }
              newVersion = customVersion
            }
            else {
              try {
                newVersion = this.calculateNewVersion(pkg.version, releaseType)
              }
              catch (error: any) {
                throw new Error(`Version calculation failed: ${error.message}`)
              }
            }

            if (!newVersion) {
              throw new Error(`Cannot calculate new version, current: ${pkg.version}, type: ${releaseType}`)
            }

            if (!finalVersion) {
              finalVersion = newVersion
              const versionTag = this.versionProvider.getDefaultTagFormat(
                pkg.name,
                newVersion,
                cachedIsDefaultPackage,
              )
              if (!dryRun && this.gitManager.checkVersionExists(newVersion, tagPrefix, cachedIsDefaultPackage ? undefined : pkg.name)) {
                throw new Error(`版本 ${versionTag} 已存在`)
              }
            }

            if (dryRun) {
              log.dryRun(`Would update ${pkg.name} from v${pkg.version} to v${newVersion}`)
            }
            else {
              const updatedPkg = { ...pkg, version: newVersion }
              this.savePackageInfo(pkgPath, updatedPkg)
              log.info(`Updated ${pkg.name} to v${newVersion}`)
            }

            result.updatedPackages.push({
              name: pkg.name,
              oldVersion: pkg.version,
              newVersion,
              pkgKey: pkgName,
            })
          }

          // Generate CHANGELOG — use cached isDefaultPackage
          if (!dryRun && changelog && finalVersion) {
            if (isBatchMode && !cachedIsDefaultPackage) {
              log.info(`Sub-package ${pkgName} skipping CHANGELOG generation`)
            }
            else {
              try {
                const commits = this.gitManager.getCommitsSinceLastTag()

                let packageName: string | undefined
                if (!cachedIsDefaultPackage) {
                  const firstPkg = this.getPackageInfo(targets[0])
                  packageName = firstPkg.name
                }

                const customCommitPath = this.gitConfig.commitPath
                const commitUrlFn = (hash: string) => this.gitManager.getCommitRelativePath(hash, customCommitPath)
                await this.changelogManager.updateChangelog(finalVersion, commits, packageName, commitUrlFn)
                log.success('CHANGELOG updated')
              }
              catch (changelogError) {
                log.warn(`CHANGELOG generation failed: ${(changelogError as Error).message}`)
              }
            }
          }

          if (!dryRun && publish) {
            for (const pkgPath of targets) {
              const pkg = this.getPackageInfo(pkgPath)
              const pkgDir = dirname(pkgPath)
              log.info(`\nPublishing ${pkg.name}...`)

              try {
                let publishCmd: string
                if (this.versionProvider.type === 'rust') {
                  publishCmd = 'cargo publish'
                }
                else {
                  publishCmd = this.publishConfig.command || 'pnpm publish --access public --no-git-checks'
                }

                if (!validateCommand(publishCmd)) {
                  throw new Error(`Unsafe publish command: ${publishCmd}`)
                }

                if (verbose) {
                  log.debug(`Executing: ${publishCmd} (in: ${pkgDir})`)
                }

                const { execSync } = await import('node:child_process')
                execSync(publishCmd, {
                  cwd: pkgDir,
                  stdio: 'inherit',
                })
                result.publishedPackages.push(pkg.name)
              }
              catch (e: any) {
                throw new Error(`Publish failed ${pkg.name}: ${e.message}`)
              }
            }
          }

          // Git commit and tag — use cached isDefaultPackage and gitConfig.push
          if (!dryRun && autoCommit && result.updatedPackages.length > 0) {
            try {
              let commitMessage: string
              const updatedPackage = result.updatedPackages[0]
              const newVersion = updatedPackage.newVersion

              if (this.gitConfig.commitMessage && this.gitConfig.commitMessage !== 'chore: bump version to {{newVersion}}') {
                commitMessage = this.gitConfig.commitMessage.replace(/\{\{newVersion\}\}/g, newVersion)
              }
              else if (pkgName === 'all') {
                const versionInfo = result.updatedPackages.map(pkg => `${pkg.name}@${pkg.newVersion}`).join(', ')
                commitMessage = `chore: bump version for all packages\n\n${versionInfo}`
              }
              else {
                commitMessage = `chore: bump version for ${pkgName} to v${newVersion}`
              }

              let tagName: string
              if (tagPrefix !== 'v') {
                tagName = `${tagPrefix}${newVersion}`
              }
              else {
                tagName = this.versionProvider.getDefaultTagFormat(
                  updatedPackage.name,
                  newVersion,
                  cachedIsDefaultPackage,
                )
              }

              if (cachedIsDefaultPackage) {
                this.gitManager.commitAndPush(commitMessage, this.gitConfig.push !== false, tag, newVersion, tagPrefix, tagName)
              }
              else {
                this.gitManager.addFiles(['-u'])
                this.gitManager.commit(commitMessage)

                try {
                  this.gitManager.createTag(newVersion, tagPrefix, tagName)
                }
                catch (tagError) {
                  log.warn(`Create tag ${tagName} failed: ${(tagError as Error).message}`)
                }

                if (this.gitConfig.push !== false) {
                  try {
                    this.gitManager.push(true)
                  }
                  catch (pushError) {
                    log.warn(`Git push failed: ${(pushError as Error).message}`)
                  }
                }
              }
            }
            catch (gitError: any) {
              log.warn(`Git operation failed: ${gitError.message}`)
            }
          }

          result.success = true
          return result
        }
        catch (error: any) {
          result.error = error.message
          return result
        }
      },
      {
        succeedText: pkgName === 'all' ? 'All packages version updated' : `Package ${pkgName} version updated`,
        failText: 'Version update failed',
      },
    )
  }

  async gitCommitAndPush(
    push: boolean = true,
    updatedPackages?: Array<{ name: string, newVersion: string, pkgKey?: string }>,
    tag: boolean = this.gitConfig.tag !== false,
  ): Promise<void> {
    try {
      const commitMessage = 'chore: bump versions for multiple packages'

      if (tag && updatedPackages && updatedPackages.length > 0) {
        this.gitManager.addFiles(['-u'])
        this.gitManager.commit(commitMessage)

        for (const pkg of updatedPackages) {
          const isMainPackage = pkg.pkgKey === 'default'

          try {
            this.gitManager.createTag(pkg.newVersion, this.gitConfig.tagPrefix || 'v')
            log.success(`Created tag for ${pkg.name}@${pkg.newVersion}`)
          }
          catch (error) {
            log.warn(`Create tag for ${pkg.name} failed: ${(error as Error).message}`)
          }
        }

        if (push) {
          try {
            this.gitManager.push(true)
          }
          catch (error) {
            log.warn(`Git push failed: ${(error as Error).message}`)
          }
        }
      }
      else {
        this.gitManager.commitAndPush(commitMessage, push, false)
      }
    }
    catch (error: any) {
      log.warn(`Git operation failed: ${error.message}`)
    }
  }

  getPackageInfo(pkgPath: string): PackageInfo {
    const cached = this.packageCache.get(pkgPath)
    if (cached) {
      return cached
    }

    try {
      const pkg = this.versionProvider.getPackageInfo(pkgPath)
      this.packageCache.set(pkgPath, pkg)
      return pkg
    }
    catch (error: any) {
      throw new Error(`Read file failed ${pkgPath}: ${error.message}`)
    }
  }

  private savePackageInfo(pkgPath: string, pkg: PackageInfo): void {
    if (!validatePath(pkgPath, this.rootDir)) {
      throw new Error(`Unsafe file path: ${pkgPath}`)
    }

    try {
      this.versionProvider.updateVersion(pkgPath, pkg.version)
      this.packageCache.set(pkgPath, pkg)
    }
    catch (error: any) {
      throw new Error(`Write file failed ${pkgPath}: ${error.message}`)
    }
  }

  getPackageVersion(pkgName: string): string | null {
    const pkgPath = this.packagePaths[pkgName]
    if (!pkgPath)
      return null

    try {
      const pkg = this.getPackageInfo(pkgPath)
      return pkg.version
    }
    catch {
      return null
    }
  }

  isValidVersion(version: string): boolean {
    return isValidVersion(version)
  }

  getVersionDiff(oldVersion: string, newVersion: string): string | null {
    if (!isValidVersion(oldVersion) || !isValidVersion(newVersion)) {
      return null
    }

    if ((getMajor(newVersion) ?? 0) > (getMajor(oldVersion) ?? 0))
      return 'major'
    if ((getMinor(newVersion) ?? 0) > (getMinor(oldVersion) ?? 0))
      return 'minor'
    if ((getPatch(newVersion) ?? 0) > (getPatch(oldVersion) ?? 0))
      return 'patch'
    return null
  }
}

export default VersionManager
