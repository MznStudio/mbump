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

  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')
    const pattern = /("version"\s*:\s*)"[^"]*"/
    const updated = content.replace(pattern, `$1"${newVersion}"`)
    if (updated === content) {
      const pattern2 = /('version'\s*:\s*)'[^']*'/
      const updated2 = content.replace(pattern2, `$1'${newVersion}'`)
      if (updated2 === content) {
        throw new Error(`Cannot find version field in ${filePath}`)
      }
      writeFileSync(filePath, updated2, 'utf8')
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
      throw new Error(`Cannot parse version from ${filePath}`)
    }
    return { name: nameMatch?.[1] || '', version: versionMatch[1] }
  }

  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')
    const pattern = /^version\s*=\s*"[^"]+"/m
    const updated = content.replace(pattern, `version = "${newVersion}"`)
    writeFileSync(filePath, updated, 'utf8')
  }

  getDefaultTagFormat(packageName: string, version: string, isDefaultPackage: boolean): string {
    return `${packageName}@${version}`
  }
}
