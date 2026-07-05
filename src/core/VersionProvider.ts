import type { PackageInfo } from '@/types'

import { readFileSync, writeFileSync } from 'node:fs'
import * as toml from 'toml'

export type ProjectType = 'node' | 'rust'

export interface IVersionProvider {
  type: ProjectType
  getVersionFilePaths: (rootDir: string) => string[]
  getPackageInfo: (filePath: string) => PackageInfo
  updateVersion: (filePath: string, newVersion: string) => void
  getDefaultTagFormat: (packageName: string, version: string) => string
}

export class NodeVersionProvider implements IVersionProvider {
  type: ProjectType = 'node'

  getVersionFilePaths(rootDir: string): string[] {
    return [`${rootDir}/package.json`]
  }

  getPackageInfo(filePath: string): PackageInfo {
    const content = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(content) as PackageInfo
    return parsed
  }

  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(content) as PackageInfo
    parsed.version = newVersion
    writeFileSync(filePath, JSON.stringify(parsed, null, 2))
  }

  getDefaultTagFormat(packageName: string, version: string): string {
    return packageName === 'default'
      || packageName === 'mbump'
      || packageName === '@mznjs/mbump'
      || packageName.startsWith('@mznjs/')
      ? `v${version}`
      : `${packageName}@${version}`
  }
}

export class RustVersionProvider implements IVersionProvider {
  type: ProjectType = 'rust'

  getVersionFilePaths(rootDir: string): string[] {
    return [`${rootDir}/Cargo.toml`]
  }

  getPackageInfo(filePath: string): PackageInfo {
    const content = readFileSync(filePath, 'utf8')
    const parsed = toml.parse(content) as Record<string, any>
    return {
      name: parsed.package?.name || 'rust',
      version: parsed.package?.version || '0.0.0',
      description: parsed.package?.description || '',
    }
  }

  updateVersion(filePath: string, newVersion: string): void {
    const content = readFileSync(filePath, 'utf8')
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

    writeFileSync(filePath, newLines.join('\n'), { encoding: 'utf8' })
  }

  getDefaultTagFormat(packageName: string, version: string): string {
    return `${packageName}@${version}`
  }
}
