import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as toml from '@iarna/toml'
import semver from 'semver'
import log from '@/utils/logger'

export interface RustUpdateOptions {
  dryRun?: boolean
  verbose?: boolean
  autoCommit?: boolean
  push?: boolean
  customVersion?: string | null
}

export class RustManager {
  private cargoTomlPath: string

  constructor(rootDir: string) {
    this.cargoTomlPath = join(rootDir, 'Cargo.toml')
  }

  exists(): boolean {
    return existsSync(this.cargoTomlPath)
  }

  getCurrentVersion(): string | null {
    try {
      const content = readFileSync(this.cargoTomlPath, 'utf8')
      const parsed = toml.parse(content) as Record<string, any>
      if (parsed.package && typeof parsed.package.version === 'string') {
        return parsed.package.version
      }
      return null
    }
    catch {
      return null
    }
  }

  updateVersion(releaseType: string, options: RustUpdateOptions = {}): { success: boolean, oldVersion: string, newVersion: string } {
    const { dryRun = false, verbose = false, customVersion = null } = options

    if (!this.exists()) {
      throw new Error(`Cargo.toml 文件不存在: ${this.cargoTomlPath}`)
    }

    const oldVersion = this.getCurrentVersion()
    if (!oldVersion) {
      throw new Error(`Cargo.toml 文件中未找到 [package] 部分的 version 字段`)
    }

    let newVersion: string | null = null

    if (customVersion) {
      if (!semver.valid(customVersion)) {
        throw new Error(`无效的自定义版本号: ${customVersion}`)
      }
      newVersion = customVersion
    }
    else {
      newVersion = semver.inc(oldVersion, releaseType as semver.ReleaseType)
      if (!newVersion) {
        throw new Error(`无法计算新版本，当前版本 "${oldVersion}"，版本类型 "${releaseType}"`)
      }
    }

    if (!semver.valid(newVersion)) {
      throw new Error(`计算出的新版本 "${newVersion}" 不是有效的 semver 版本号`)
    }

    if (verbose) {
      log.info(`读取 Cargo.toml: ${this.cargoTomlPath}`)
      log.info(`当前版本: ${oldVersion}`)
      log.info(`新版本: ${newVersion}`)
    }

    if (dryRun) {
      log.info(`\n🔍 Dry-run 模式 - Cargo.toml 版本更新预览:`)
      log.info(`   当前版本: ${oldVersion}`)
      log.info(`   新版本:   ${newVersion}`)
      log.info(`\n✅ 以上为预览，未执行任何实际操作`)
      return { success: true, oldVersion, newVersion }
    }

    this.writeVersion(newVersion)

    const verifiedVersion = this.getCurrentVersion()
    if (verifiedVersion !== newVersion) {
      throw new Error(`版本更新验证失败，期望版本 "${newVersion}"，实际版本 "${verifiedVersion}"`)
    }

    log.success(`Cargo.toml 版本更新完成: ${oldVersion} → ${newVersion}`)
    return { success: true, oldVersion, newVersion }
  }

  private writeVersion(newVersion: string): void {
    try {
      const content = readFileSync(this.cargoTomlPath, 'utf8')
      const lines = content.split('\n')
      let inPackageSection = false
      let versionUpdated = false

      const newLines = lines.map((line) => {
        const trimmedLine = line.trim()

        if (trimmedLine.startsWith('[package]')) {
          inPackageSection = true
          return line
        }

        if (trimmedLine.startsWith('[') && inPackageSection) {
          inPackageSection = false
          return line
        }

        if (inPackageSection) {
          const versionMatch = trimmedLine.match(/^version\s*=\s*["'](.+?)["']/)
          if (versionMatch) {
            versionUpdated = true
            const spaces = line.match(/^\s*/)?.[0] || ''
            const quote = versionMatch[0].includes('"') ? '"' : "'"
            return `${spaces}version = ${quote}${newVersion}${quote}`
          }
        }

        return line
      })

      if (!versionUpdated) {
        let packageSectionIndex = -1
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('[package]')) {
            packageSectionIndex = i
            break
          }
        }

        if (packageSectionIndex !== -1) {
          newLines.splice(packageSectionIndex + 1, 0, `version = "${newVersion}"`)
        }
        else {
          newLines.unshift('[package]', `version = "${newVersion}"`)
        }
      }

      writeFileSync(this.cargoTomlPath, newLines.join('\n'), { encoding: 'utf8' })
    }
    catch (error: any) {
      throw new Error(`写入 Cargo.toml 失败: ${error.message}`)
    }
  }
}
