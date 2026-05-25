import type { Config, GitConfig, PackageInfo, PackagePaths, PublishConfig, ReleaseType, UpdateOptions, UpdateResult, VersionManagerOptions } from '@/types'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import semver from 'semver'
import { loadConfig } from '@/config/loader'
import log from '@/utils/logger'
import { validateCommand, validatePath } from '@/utils/security'
import { ChangelogManager } from './ChangelogManager'
import { GitManager } from './GitManager'

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

  constructor(options: VersionManagerOptions = {}) {
    const { packagePaths, configPath, config, rootDir = process.cwd() } = options

    this.config = config || (configPath ? loadConfig(dirname(configPath)) : loadConfig(rootDir))
    this.rootDir = rootDir
    this.packagePaths = packagePaths || this.config.packagePaths
    this.publishConfig = this.config.publish || {}
    this.gitConfig = this.config.git || {}
    this.gitPush = this.gitConfig.push !== false
    this.gitManager = new GitManager(rootDir)
    this.changelogManager = new ChangelogManager(rootDir)

    if (!this.packagePaths || typeof this.packagePaths !== 'object' || Object.keys(this.packagePaths).length === 0) {
      throw new Error('配置错误：未找到有效的包路径配置')
    }

    this._resolvePackagePaths(rootDir)
  }

  private _resolvePackagePaths(rootDir: string): void {
    for (const [name, path] of Object.entries(this.packagePaths)) {
      if (path && typeof path === 'string' && !path.startsWith('/') && !/^[a-z]:\\/i.test(path)) {
        this.packagePaths[name] = `${rootDir}/${path}`
      }
    }
  }

  async updateVersion(pkgName: string, releaseType: ReleaseType = 'patch', options: UpdateOptions = {}): Promise<UpdateResult> {
    const {
      dryRun = false,
      verbose = false,
      packagePaths = this.packagePaths,
      customVersion = null,
      autoCommit = this.gitConfig.autoCommit !== false,
      npm = false,
      changelog = this.gitConfig.changelog !== false,
      tag = this.gitConfig.tag !== false,
      tagPrefix = this.gitConfig.tagPrefix || 'v',
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
              if (!semver.valid(customVersion)) {
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
                    newVersion = semver.inc(pkg.version, releaseType)
                    break
                  case 'next':
                    newVersion = semver.inc(pkg.version, 'patch')
                    break
                  case 'pre-patch':
                    if (semver.prerelease(pkg.version)) {
                      newVersion = semver.inc(pkg.version, 'prerelease')
                    }
                    else {
                      newVersion = semver.inc(pkg.version, 'prepatch', 'beta')
                    }
                    break
                  case 'pre-minor':
                    if (semver.prerelease(pkg.version)) {
                      const currentMinor = semver.minor(pkg.version)
                      const potentialVersion = semver.inc(pkg.version, 'preminor', 'beta')
                      if (potentialVersion && semver.minor(potentialVersion) > currentMinor) {
                        newVersion = potentialVersion
                      }
                      else {
                        newVersion = semver.inc(pkg.version, 'prerelease')
                      }
                    }
                    else {
                      newVersion = semver.inc(pkg.version, 'preminor', 'beta')
                    }
                    break
                  case 'pre-major':
                    if (semver.prerelease(pkg.version)) {
                      const currentMajor = semver.major(pkg.version)
                      const potentialVersion = semver.inc(pkg.version, 'premajor', 'beta')
                      if (potentialVersion && semver.major(potentialVersion) > currentMajor) {
                        newVersion = potentialVersion
                      }
                      else {
                        newVersion = semver.inc(pkg.version, 'prerelease')
                      }
                    }
                    else {
                      newVersion = semver.inc(pkg.version, 'premajor', 'beta')
                    }
                    break
                  case 'as-is':
                    newVersion = pkg.version
                    break
                  case 'conventional':
                    newVersion = semver.inc(pkg.version, 'patch')
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
              if (!dryRun && this.gitManager.checkVersionExists(newVersion, tagPrefix)) {
                throw new Error(`版本 ${tagPrefix}${newVersion} 已存在，请使用其他版本`)
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
            })
          }

          // 生成CHANGELOG
          if (!dryRun && changelog && finalVersion) {
            try {
              const commits = this.gitManager.getCommitsSinceLastTag()
              await this.changelogManager.updateChangelog(finalVersion, commits)
              log.success('已更新 CHANGELOG.md')
            }
            catch (changelogError) {
              log.warn(`CHANGELOG生成失败: ${(changelogError as Error).message}`)
            }
          }

          if (!dryRun && npm) {
            for (const pkgPath of targets) {
              const pkg = this.getPackageInfo(pkgPath)
              const pkgDir = dirname(pkgPath)
              log.info(`\n发布 ${pkg.name}...`)

              try {
                const publishCmd = this.publishConfig.command || 'pnpm publish --access public --no-git-checks'

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
              const isDefaultPackage = pkgName === 'default' || this.config.packagePaths[pkgName] === 'package.json'

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

              // 主项目包使用 tagPrefix，子包使用 {package-name}@{version} 格式
              if (isDefaultPackage) {
                // 主项目包：使用配置的 tagPrefix
                this.gitManager.commitAndPush(commitMessage, this.gitPush, tag, newVersion, tagPrefix)
              }
              else {
                // 子包：先提交，然后创建 {package-name}@{version} 格式的 tag
                const { execSync } = await import('node:child_process')

                this.gitManager.addFiles(['-u'])
                this.gitManager.commit(commitMessage)

                // 创建 {package-name}@{version} 格式的 tag
                const tagName = `${updatedPackage.name}@${newVersion}`
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

                // 推送
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
    updatedPackages?: Array<{ name: string, newVersion: string }>,
    tag: boolean = this.gitConfig.tag !== false,
    _tagPrefix: string = this.gitConfig.tagPrefix || 'v',
  ): Promise<void> {
    try {
      const commitMessage = 'chore: bump versions for multiple packages'

      // 如果提供了更新的包列表且启用了 tag，则为每个包创建独立的 tag
      if (tag && updatedPackages && updatedPackages.length > 0) {
        // 先提交更改
        this.gitManager.addFiles(['-u'])
        this.gitManager.commit(commitMessage)

        // 为每个包创建独立的 tag，格式：package-name@version
        const { execSync } = await import('node:child_process')
        for (const pkg of updatedPackages) {
          const tagName = `${pkg.name}@${pkg.newVersion}`
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

  private getPackageInfo(pkgPath: string): PackageInfo {
    const cached = this.packageCache.get(pkgPath)
    if (cached) {
      return cached
    }
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageInfo
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
      writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
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
    return semver.valid(version) !== null
  }

  getVersionDiff(oldVersion: string, newVersion: string): string | null {
    if (!semver.valid(oldVersion) || !semver.valid(newVersion)) {
      return null
    }

    if (semver.major(newVersion) > semver.major(oldVersion))
      return 'major'
    if (semver.minor(newVersion) > semver.minor(oldVersion))
      return 'minor'
    if (semver.patch(newVersion) > semver.patch(oldVersion))
      return 'patch'
    return null
  }
}

export default VersionManager
