import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import log from '@/utils/logger'

export interface ChangelogCommit {
  hash: string
  shortHash: string
  hashLink: string | null
  message: string
  author: string
  type: string
  scope: string
  files: string[]
}

const TYPE_ORDER = ['🚀', '🩹', '🔥', '♻️', '📝', '💄', '🔧', '📦', '👷', '✅', '⏪', '💥']

export class ChangelogManager {
  private rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
  }

  detectChangelogFormat(content: string): 'keepachangelog' | 'conventional' | 'unknown' {
    if (/^## \[\d+\.\d+\.\d+\]/m.test(content)) {
      return 'keepachangelog'
    }
    if (/^# Changelog/m.test(content) || /^## [\d.]+/m.test(content)) {
      return 'conventional'
    }
    return 'unknown'
  }

  private parseCommitMessage(message: string): { type: string, scope: string } {
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?/)
    return {
      type: match?.[1] || 'other',
      scope: match?.[2] || '',
    }
  }

  getTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      feat: '🚀',
      fix: '🩹',
      perf: '🔥',
      refactor: '♻️',
      docs: '📝',
      style: '💄',
      chore: '🔧',
      build: '📦',
      ci: '👷',
      test: '✅',
      revert: '⏪',
      breaking: '💥',
    }
    return emojiMap[type] || '📝'
  }

  getTypeTitle(type: string): string {
    const titleMap: Record<string, string> = {
      feat: '新增功能',
      fix: '修复 Bug',
      perf: '性能优化',
      refactor: '代码重构',
      docs: '文档更新',
      style: '代码格式',
      chore: '工具变更',
      build: '构建系统',
      ci: 'CI/CD',
      test: '测试用例',
      revert: '回退变更',
      breaking: '破坏性变更',
    }
    return titleMap[type] || '其他'
  }

  async updateChangelog(
    newVersion: string,
    commits: { hash: string, message: string, files: string[] }[],
    packageName?: string,
    commitUrlFn?: (hash: string) => string | null,
  ): Promise<void> {
    const changelogPath = resolve(this.rootDir, 'CHANGELOG.md')

    try {
      let content = ''
      if (existsSync(changelogPath)) {
        content = readFileSync(changelogPath, 'utf8')
      }

      const format = this.detectChangelogFormat(content)
      const date = new Date().toISOString().split('T')[0]
      const versionTitle = packageName ? `${packageName} v${newVersion}` : `v${newVersion}`

      const groupedCommits: Record<string, ChangelogCommit[]> = {}

      for (const commit of commits) {
        const { type, scope } = this.parseCommitMessage(commit.message)
        const emoji = this.getTypeEmoji(type)
        const shortHash = commit.hash.slice(0, 7)
        const commitUrl = commitUrlFn ? commitUrlFn(commit.hash) : null
        const _hashLink = commitUrl ? `[${shortHash}](${commitUrl})` : shortHash
        const inferredScope = scope || this.inferScopeFromFiles(commit.files)
        const key = `${emoji}|${type}`

        if (!groupedCommits[key]) {
          groupedCommits[key] = []
        }
        groupedCommits[key].push({
          hash: commit.hash,
          shortHash,
          hashLink: commitUrl,
          message: commit.message,
          author: '',
          type,
          scope: inferredScope,
          files: commit.files,
        })
      }

      const sortedKeys = Object.keys(groupedCommits).sort((a, b) => {
        const emojiA = a.split('|')[0]
        const emojiB = b.split('|')[0]
        const indexA = TYPE_ORDER.indexOf(emojiA)
        const indexB = TYPE_ORDER.indexOf(emojiB)
        return (indexA === -1 ? TYPE_ORDER.length : indexA) - (indexB === -1 ? TYPE_ORDER.length : indexB)
      })

      let newContent = ''
      for (const key of sortedKeys) {
        const [, type] = key.split('|')
        const groupCommits = groupedCommits[key]
        const title = this.getTypeTitle(type)
        newContent += `\n### ${this.getTypeEmoji(type)} ${title}\n\n`
        for (const commit of groupCommits) {
          const scopePart = commit.scope ? `(${commit.scope})` : ''
          const messageWithoutType = commit.message.replace(/^(\w+)(?:\([^)]+\))?:\s*/, '')
          const filesPart = commit.files.length > 0 ? ` (${commit.files.join(', ')})` : ''
          const hashLink = commit.hashLink ? `[${commit.shortHash}](${commit.hashLink})` : commit.shortHash
          newContent += `- ${hashLink} ${commit.type}${scopePart}: ${messageWithoutType}${filesPart}\n`
        }
      }

      let entry: string
      if (format === 'keepachangelog') {
        entry = `\n## [${newVersion}] - ${date}${newContent}\n`
      }
      else if (format === 'conventional') {
        entry = `\n## ${versionTitle} (${date})${newContent}\n`
      }
      else {
        entry = `\n# Changelog\n\n## [${newVersion}] - ${date}${newContent}\n`
      }

      if (!content) {
        writeFileSync(changelogPath, entry.trimStart(), 'utf8')
      }
      else {
        const insertIndex = content.search(/^#{1,3}\s+/m)
        if (insertIndex !== -1) {
          content = content.slice(0, insertIndex) + entry + content.slice(insertIndex)
        }
        else {
          content += entry
        }
        writeFileSync(changelogPath, content, 'utf8')
      }
      log.success(`CHANGELOG updated: ${changelogPath}`)
    }
    catch (error) {
      throw new Error(`CHANGELOG update failed: ${(error as Error).message}`)
    }
  }

  private inferScopeFromFiles(files: string[]): string {
    if (files.length === 0)
      return ''
    const dirMap: Record<string, string> = {
      'src': 'core',
      'lib': 'core',
      'dist': 'build',
      'docs': 'docs',
      'test': 'tests',
      'tests': 'tests',
      '__tests__': 'tests',
      'examples': 'examples',
      '.github': 'ci',
      'scripts': 'scripts',
    }
    const dirs = files.map(file => file.split('/')[0])
    const dirCount: Record<string, number> = {}
    for (const dir of dirs) {
      dirCount[dir] = (dirCount[dir] || 0) + 1
    }
    const mostCommonDir = Object.entries(dirCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0]
    return dirMap[mostCommonDir] || mostCommonDir || ''
  }
}
