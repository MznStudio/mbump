import type { PackageInfo } from '@/types'
import { readFileSync, writeFileSync } from 'node:fs'

export interface IVersionProvider {
  type: ProjectType
  getPackageInfo: (filePath: string) => PackageInfo
  updateVersion: (filePath: string, newVersion: string) => void
  getDefaultTagFormat: (packageName: string, version: string, isDefaultPackage: boolean) => string
}

export type ProjectType = 'node' | 'rust'

export class NodeVersionProvider implements IVersionProvider {
  readonly type: ProjectType = 'node'

  getPackageInfo(filePath: string): PackageInfo {
    const content = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(content) as PackageInfo
    return parsed
  }

  /**
   * 更新包的版本号
   * 使用 JSON.parse → 修改 → JSON.stringify 方式（原始稳定实现）
   */
  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(content) as PackageInfo
    parsed.version = newVersion
    writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8')
  }

  getDefaultTagFormat(_packageName: string, version: string, _isDefaultPackage: boolean): string {
    return `v${version}`
  }
}

export class RustVersionProvider implements IVersionProvider {
  readonly type: ProjectType = 'rust'

  getPackageInfo(filePath: string): PackageInfo {
    const content = readFileSync(filePath, 'utf8')
    const versionMatch = content.match(/^version\s*=\s*"([^"]+)"/m)
    const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m)

    if (!versionMatch) {
      throw new Error(`无法在 ${filePath} 中解析版本号`)
    }

    return {
      name: nameMatch?.[1] || '',
      version: versionMatch[1],
    }
  }

  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')
    const updated = content.replace(
      /^version\s*=\s*"[^"]+"/m,
      `version = "${newVersion}"`,
    )
    writeFileSync(filePath, updated, 'utf8')
  }

  getDefaultTagFormat(packageName: string, version: string, _isDefaultPackage: boolean): string {
    return `${packageName}@${version}`
  }
}
