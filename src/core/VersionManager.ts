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
  private gitPush: boolean
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
    this.gitPush = this.gitConfig.push !== false
    this.gitManager = new GitManager(rootDir)
    this.changelogManager = new ChangelogManager(rootDir)
    this.versionProvider = projectType === 'rust' ? new RustVersionProvider() : new NodeVersionProvider()

    if (!this.packagePaths || typeof this.packagePaths !== 'object' || Object.keys(this.packagePaths).length === 0) {
      throw new Error('配置错误：未找到有效的包路径配置')
    }

    this._preloadPackageCache()
  }

  private _isDefaultPackage(pkgKey: string): boolean {
    const pkgPath = this.config.packagePaths[pkgKey]
    if (!pkgPath)
      return false

    const isDefaultKey = pkgKey === 'default'
    const resolvedPkgDir = resolve(dirname(pkgPath))
    const resolvedRootDir = resolve(this.rootDir)
    const isNodeRoot = pkgPath.endsWith('package.json') && resolvedPkgDir === resolvedRootDir
    const isRustRoot = pkgPath.includes('Cargo.toml')

    const isSinglePackageMode = Object.keys(this.config.packagePaths).length === 1
    const isPathModeRoot = isSinglePackageMode && isNodeRoot

    return isDefaultKey || (isNodeRoot && !isPathModeRoot) || isRustRoot
  }

  /**
   * 预加载所有包信息到缓存，避免后续重复读取文件
   */
  private _preloadPackageCache(): void {
    for (const pkgPath of Object.values(this.packagePaths)) {
      try {
        this.getPackageInfo(pkgPath)
      }
      catch (error) {
        // 忽略预加载失败，在实际使用时再处理
        log.debug(`预加载包信息失败 ${pkgPath}: ${(error as Error).message}`)
      }
    }
    log.debug(`已预加载 ${this.packageCache.size} 个包的信息到缓存`)
  }

  /**
   * 清除包信息缓存
   * @param pkgPath 可选，指定要清除的包路径，不传则清除所有缓存
   */
  clearPackageCache(pkgPath?: string): void {
    if (pkgPath) {
      this.packageCache.delete(pkgPath)
      log.debug(`已清除包缓存: ${pkgPath}`)
    }
    else {
      this.packageCache.clear()
      log.debug('已清除所有包缓存')
    }
  }

  /**
   * 刷新指定包的缓存（重新从文件读取）
   * @param pkgPath 包的路径
   */
  refreshPackageCache(pkgPath: string): PackageInfo {
    this.packageCache.delete(pkgPath)
    return this.getPackageInfo(pkgPath)
  }

  /**
   * 获取缓存统计信息
   */
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
            switch (selection.type) {
              case 'major':
              case 'minor':
              case 'patch':
                newVersion = incrementVersion(pkg.version, selection.type)
                break
              case 'next':
                newVersion = incrementVersion(pkg.version, 'patch')
                break
              case 'pre-patch':
                if (isPrerelease(pkg.version)) {
                  newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                }
                else {
                  newVersion = incrementVersion(pkg.version, 'prepatch', 'beta')
                }
                break
              case 'pre-minor':
                if (isPrerelease(pkg.version)) {
                  const currentMinor = getMinor(pkg.version) ?? 0
                  const potentialVersion = incrementVersion(pkg.version, 'preminor', 'beta')
                  if (potentialVersion && (getMinor(potentialVersion) ?? 0) > currentMinor) {
                    newVersion = potentialVersion
                  }
                  else {
                    newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                  }
                }
                else {
                  newVersion = incrementVersion(pkg.version, 'preminor', 'beta')
                }
                break
              case 'pre-major':
                if (isPrerelease(pkg.version)) {
                  const currentMajor = getMajor(pkg.version) ?? 0
                  const potentialVersion = incrementVersion(pkg.version, 'premajor', 'beta')
                  if (potentialVersion && (getMajor(potentialVersion) ?? 0) > currentMajor) {
                    newVersion = potentialVersion
                  }
                  else {
                    newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                  }
                }
                else {
                  newVersion = incrementVersion(pkg.version, 'premajor', 'beta')
                }
                break
              case 'as-is':
                newVersion = pkg.version
                break
              case 'conventional':
                newVersion = incrementVersion(pkg.version, 'patch')
                break
              default:
                throw new Error(`不支持的版本类型: ${selection.type}`)
            }
          }
          catch (error: any) {
            throw new Error(`版本计算失败: ${error.message}`)
          }
        }

        if (!newVersion) {
          throw new Error(`无法计算新版本号，当前版本: ${pkg.version}，类型: ${selection.type}`)
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
            switch (releaseType) {
              case 'major':
              case 'minor':
              case 'patch':
                newVersion = incrementVersion(pkg.version, releaseType)
                break
              case 'next':
                newVersion = incrementVersion(pkg.version, 'patch')
                break
              case 'pre-patch':
                if (isPrerelease(pkg.version)) {
                  newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                }
                else {
                  newVersion = incrementVersion(pkg.version, 'prepatch', 'beta')
                }
                break
              case 'pre-minor':
                if (isPrerelease(pkg.version)) {
                  const currentMinor = getMinor(pkg.version) ?? 0
                  const potentialVersion = incrementVersion(pkg.version, 'preminor', 'beta')
                  if (potentialVersion && (getMinor(potentialVersion) ?? 0) > currentMinor) {
                    newVersion = potentialVersion
                  }
                  else {
                    newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                  }
                }
                else {
                  newVersion = incrementVersion(pkg.version, 'preminor', 'beta')
                }
                break
              case 'pre-major':
                if (isPrerelease(pkg.version)) {
                  const currentMajor = getMajor(pkg.version) ?? 0
                  const potentialVersion = incrementVersion(pkg.version, 'premajor', 'beta')
                  if (potentialVersion && (getMajor(potentialVersion) ?? 0) > currentMajor) {
                    newVersion = potentialVersion
                  }
                  else {
                    newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                  }
                }
                else {
                  newVersion = incrementVersion(pkg.version, 'premajor', 'beta')
                }
                break
              case 'as-is':
                newVersion = pkg.version
                break
              case 'conventional':
                newVersion = incrementVersion(pkg.version, 'patch')
                break
              default:
                throw new Error(`不支持的版本类型: ${releaseType}`)
            }
          }
          catch (error: any) {
            throw new Error(`版本计算失败: ${error.message}`)
          }
        }

        if (!newVersion) {
          throw new Error(`无法计算新版本号，当前版本: ${pkg.version}，类型: ${releaseType}`)
        }

        const isDefaultPackage = this._isDefaultPackage(packageName)
        const tagName = this.versionProvider.getDefaultTagFormat(
          pkg.name,
          newVersion,
          isDefaultPackage,
        )

        packages.push({
          name: pkg.name,
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

    return log.withSpinner(
      `正在更新${pkgName === 'all' ? '所有包' : `包${pkgName}`}的版本...`,

      async () => {
        try {
          const targets = pkgName === 'all' ? Object.values(packagePaths) : [packagePaths[pkgName]]

          if (!targets.length || targets.some(path => !path)) {
            throw new Error(`无效的包名: ${pkgName}`)
          }

          // 检查版本是否存在
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
                switch (releaseType) {
                  case 'major':
                  case 'minor':
                  case 'patch':
                    newVersion = incrementVersion(pkg.version, releaseType)
                    break
                  case 'next':
                    newVersion = incrementVersion(pkg.version, 'patch')
                    break
                  case 'pre-patch':
                    if (isPrerelease(pkg.version)) {
                      newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                    }
                    else {
                      newVersion = incrementVersion(pkg.version, 'prepatch', 'beta')
                    }
                    break
                  case 'pre-minor':
                    if (isPrerelease(pkg.version)) {
                      const currentMinor = getMinor(pkg.version) ?? 0
                      const potentialVersion = incrementVersion(pkg.version, 'preminor', 'beta')
                      if (potentialVersion && (getMinor(potentialVersion) ?? 0) > currentMinor) {
                        newVersion = potentialVersion
                      }
                      else {
                        newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                      }
                    }
                    else {
                      newVersion = incrementVersion(pkg.version, 'preminor', 'beta')
                    }
                    break
                  case 'pre-major':
                    if (isPrerelease(pkg.version)) {
                      const currentMajor = getMajor(pkg.version) ?? 0
                      const potentialVersion = incrementVersion(pkg.version, 'premajor', 'beta')
                      if (potentialVersion && (getMajor(potentialVersion) ?? 0) > currentMajor) {
                        newVersion = potentialVersion
                      }
                      else {
                        newVersion = incrementVersion(pkg.version, 'prerelease', 'beta')
                      }
                    }
                    else {
                      newVersion = incrementVersion(pkg.version, 'premajor', 'beta')
                    }
                    break
                  case 'as-is':
                    newVersion = pkg.version
                    break
                  case 'conventional':
                    newVersion = incrementVersion(pkg.version, 'patch')
                    break
                  default:
                    throw new Error(`不支持的版本类型: ${releaseType}`)
                }
              }
              catch (error: any) {
                throw new Error(`版本计算失败: ${error.message}`)
              }
            }

            if (!newVersion) {
              throw new Error(`无法计算新版本号，当前版本: ${pkg.version}，类型: ${releaseType}`)
            }

            // 只在第一个包时检查版本
            if (!finalVersion) {
              finalVersion = newVersion
              const isDefaultPackage = pkgName === 'all'
                ? this._isDefaultPackage(Object.keys(packagePaths)[0])
                : this._isDefaultPackage(pkgName)
              const versionTag = this.versionProvider.getDefaultTagFormat(
                pkg.name,
                newVersion,
                isDefaultPackage,
              )
              if (!dryRun && this.gitManager.checkVersionExists(newVersion, tagPrefix, isDefaultPackage ? undefined : pkg.name)) {
                throw new Error(`版本 ${versionTag} 已存在，请使用其他版本`)
              }
            }

            if (dryRun) {
              log.dryRun(`将更新 ${pkg.name} 从 v${pkg.version} 到 v${newVersion}`)
            }
            else {
              const updatedPkg = { ...pkg, version: newVersion }
              this.savePackageInfo(pkgPath, updatedPkg)
              log.info(`已更新 ${pkg.name} 到 v${newVersion}`)
            }

            result.updatedPackages.push({
              name: pkg.name,
              oldVersion: pkg.version,
              newVersion,
              pkgKey: pkgName,
            })
          }

          // 生成CHANGELOG
          // 在批量更新模式时，只有主项目包（default）才生成 CHANGELOG
          const isDefaultPackage = pkgName === 'all'
            ? this._isDefaultPackage(Object.keys(packagePaths)[0])
            : this._isDefaultPackage(pkgName)

          if (!dryRun && changelog && finalVersion) {
            // 如果是批量模式且不是主项目包，跳过 CHANGELOG 生成
            if (isBatchMode && !isDefaultPackage) {
              log.info(`子包 ${pkgName} 跳过 CHANGELOG 生成`)
            }
            else {
              try {
                const commits = this.gitManager.getCommitsSinceLastTag()

                // 主项目包不传 packageName（使用 tagPrefix 格式），子包传 packageName（使用 {package-name}@{version} 格式）
                let packageName: string | undefined
                if (!isDefaultPackage) {
                  // 子包：获取 package.json 的 name 字段
                  const firstPkg = this.getPackageInfo(targets[0])
                  packageName = firstPkg.name
                }
                // 主项目包：packageName 为 undefined，ChangelogManager 会直接使用 version

                await this.changelogManager.updateChangelog(finalVersion, commits, packageName)
                log.success('已更新 CHANGELOG.md')
              }
              catch (changelogError) {
                log.warn(`CHANGELOG生成失败: ${(changelogError as Error).message}`)
              }
            }
          }

          if (!dryRun && publish) {
            for (const pkgPath of targets) {
              const pkg = this.getPackageInfo(pkgPath)
              const pkgDir = dirname(pkgPath)
              log.info(`\n发布 ${pkg.name}...`)

              try {
                let publishCmd: string
                if (this.versionProvider.type === 'rust') {
                  publishCmd = 'cargo publish'
                }
                else {
                  publishCmd = this.publishConfig.command || 'pnpm publish --access public --no-git-checks'
                }

                if (!validateCommand(publishCmd)) {
                  throw new Error(`不安全的发布命令: ${publishCmd}`)
                }

                if (verbose) {
                  log.debug(`执行命令: ${publishCmd} (在目录: ${pkgDir})`)
                }

                const { execSync } = await import('node:child_process')
                execSync(publishCmd, {
                  cwd: pkgDir,
                  stdio: 'inherit',
                })
                result.publishedPackages.push(pkg.name)
              }
              catch (e: any) {
                throw new Error(`发布失败 ${pkg.name}: ${e.message}`)
              }
            }
          }

          // Git提交和Tag
          if (!dryRun && autoCommit && result.updatedPackages.length > 0) {
            try {
              let commitMessage: string
              const updatedPackage = result.updatedPackages[0]
              const newVersion = updatedPackage.newVersion
              const isDefaultPackage = pkgName === 'all'
                ? this._isDefaultPackage(Object.keys(packagePaths)[0])
                : this._isDefaultPackage(pkgName)

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

              // 使用 versionProvider 获取 tag 格式，用户指定的 tagPrefix 优先
              let tagName: string
              if (tagPrefix !== 'v') {
                tagName = `${tagPrefix}${newVersion}`
              }
              else {
                tagName = this.versionProvider.getDefaultTagFormat(
                  updatedPackage.name,
                  newVersion,
                  isDefaultPackage,
                )
              }

              if (isDefaultPackage) {
                this.gitManager.commitAndPush(commitMessage, this.gitPush, tag, newVersion, tagPrefix, tagName)
              }
              else {
                const { execSync } = await import('node:child_process')

                this.gitManager.addFiles(['-u'])
                this.gitManager.commit(commitMessage)

                try {
                  execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
                    cwd: this.rootDir,
                    stdio: 'pipe',
                  })
                  log.success(`已创建 tag: ${tagName}`)
                }
                catch (tagError) {
                  log.warn(`创建 tag ${tagName} 失败: ${(tagError as Error).message}`)
                }

                if (this.gitPush) {
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
              log.warn(`Git操作失败: ${gitError.message}`)
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
        succeedText: pkgName === 'all' ? '所有包版本更新完成' : `包 ${pkgName} 版本更新完成`,
        failText: '版本更新失败',
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

      // 如果提供了更新的包列表且启用了 tag，则为每个包创建独立的 tag
      if (tag && updatedPackages && updatedPackages.length > 0) {
        // 先提交更改
        this.gitManager.addFiles(['-u'])
        this.gitManager.commit(commitMessage)

        // 为每个包创建独立的 tag
        const { execSync } = await import('node:child_process')
        for (const pkg of updatedPackages) {
          const isMainPackage = pkg.pkgKey === 'default'
          const tagName = this.versionProvider.getDefaultTagFormat(
            pkg.name,
            pkg.newVersion,
            isMainPackage,
          )

          try {
            execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
              cwd: this.rootDir,
              stdio: 'pipe',
            })
            log.success(`已创建 tag: ${tagName}`)
          }
          catch (error) {
            log.warn(`创建 tag ${tagName} 失败: ${(error as Error).message}`)
          }
        }

        // 推送 commits 和 tags
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
        // 原有逻辑：不创建 tag
        this.gitManager.commitAndPush(commitMessage, push, false)
      }
    }
    catch (error: any) {
      log.warn(`Git操作失败: ${error.message}`)
    }
  }

  /**
   * 获取包信息（带缓存）
   * @param pkgPath 包的路径
   * @returns 包信息对象
   */
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
      throw new Error(`读取文件失败 ${pkgPath}: ${error.message}`)
    }
  }

  private savePackageInfo(pkgPath: string, pkg: PackageInfo): void {
    if (!validatePath(pkgPath, this.rootDir)) {
      throw new Error(`不安全的文件路径: ${pkgPath}`)
    }

    try {
      this.versionProvider.updateVersion(pkgPath, pkg.version)
      this.packageCache.set(pkgPath, pkg)
    }
    catch (error: any) {
      throw new Error(`写入文件失败 ${pkgPath}: ${error.message}`)
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
