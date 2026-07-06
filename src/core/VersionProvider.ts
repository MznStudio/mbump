import { readFileSync, writeFileSync } from 'node:fs'
import type { PackageInfo } from '@/types'

export interface IVersionProvider {
  type: ProjectType
  getPackageInfo(filePath: string): PackageInfo
  updateVersion(filePath: string, newVersion: string): void
  getDefaultTagFormat(packageName: string, version: string, isDefaultPackage: boolean): string
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
   * 使用正则精确替换 version 字段，保留原文件所有其他内容不变。
   * 避免 JSON.parse -> JSON.stringify 循环导致的非标准字段丢失、键顺序打乱等问题。
   */
  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')

    // 匹配 "version": "x.y.z" 格式（支持单引号和双引号）
    const updated = content.replace(
      /("version"\s*:\s*)"[^"]*"/,
      `$1"${newVersion}"`,
    )

    if (updated === content) {
      // 如果正则没匹配到，尝试单引号格式
      const updatedSingle = content.replace(
        /('version'\s*:\s*)'[^']*'/,
        `$1'${newVersion}'`,
      )
      if (updatedSingle === content) {
        throw new Error(`无法在 ${filePath} 中找到 version 字段`)
      }
      writeFileSync(filePath, updatedSingle, 'utf8')
    }
    else {
      writeFileSync(filePath, updated, 'utf8')
    }
  }

  getDefaultTagFormat(packageName: string, version: string, isDefaultPackage: boolean): string {
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

  getDefaultTagFormat(packageName: string, version: string, isDefaultPackage: boolean): string {
    return `${packageName}@${version}`
  }
}
