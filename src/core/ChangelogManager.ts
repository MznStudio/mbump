import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import log from '@/utils/logger'

export interface ChangelogCommit {
  hash: string
  shortHash: string
  message: string
  author: string
  type: string
  scope: string
}

/**
 * CHANGELOG 类型排序顺序（emoji 排序）
 */
const TYPE_ORDER = ['🚀', '🩹', '🔥', '♻️', '📝', '💄', '🔧', '📦', '👷', '✅', '⏪', '💥']

export class ChangelogManager {
  private rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
  }

  /**
   * 检测 CHANGELOG 文件格式
   */
  detectChangelogFormat(content: string): 'keepachangelog' | 'conventional' | 'unknown' {
    // Keep a Changelog 格式特征
    if (/^## \[\d+\.\d+\.\d+\]/m.test(content)) {
      return 'keepachangelog'
    }

    // Conventional Changelog 格式特征
    if (/^# Changelog/m.test(content) || /^## [\d.]+/m.test(content)) {
      return 'conventional'
    }

    return 'unknown'
  }

  /**
   * 解析 commit message 提取类型和范围
   */
  private parseCommitMessage(message: string): { type: string; scope: string } {
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?/)
    return {
      type: match?.[1] || 'other',
      scope: match?.[2] || '',
    }
  }

  /**
   * 获取 emoji 类型映射
   */
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

  /**
   * 获取类型标题
   */
  getTypeTitle(type: string): string {
    const titleMap: Record<string, string> = {
      feat: '新功能',
      fix: 'Bug 修复',
      perf: '性能优化',
      refactor: '重构',
      docs: '文档',
      style: '样式',
      chore: '构建/工具',
      build: '构建系统',
      ci: '持续集成',
      test: '测试',
      revert: '回退',
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

      // 构建新的 CHANGELOG 条目
      const date = new Date().toISOString().split('T')[0]
      const versionTitle = packageName ? `${packageName} v${newVersion}` : `v${newVersion}`

      // 按类型分组 commits
      const groupedCommits: Record<string, ChangelogCommit[]> = {}

      for (const commit of commits) {
        const { type, scope } = this.parseCommitMessage(commit.message)
        const emoji = this.getTypeEmoji(type)
        const shortHash = commit.hash.slice(0, 7)
        const commitUrl = commitUrlFn ? commitUrlFn(commit.hash) : null
        const hashLink = commitUrl ? `[${shortHash}](${commitUrl})` : shortHash

        // 从文件列表推断范围
        const inferredScope = scope || this.inferScopeFromFiles(commit.files)

        const key = `${emoji}|${type}`

        if (!groupedCommits[key]) {
          groupedCommits[key] = []
        }

        groupedCommits[key].push({
          hash: commit.hash,
          shortHash,
          message: commit.message,
          author: '', // git log 不包含作者信息
          type,
          scope: inferredScope,
        })
      }

      // 按排序规则排列分组键
      const sortedKeys = Object.keys(groupedCommits).sort((a, b) => {
        const emojiA = a.split('|')[0]
        const emojiB = b.split('|')[0]
        const indexA = TYPE_ORDER.indexOf(emojiA)
        const indexB = TYPE_ORDER.indexOf(emojiB)
        return (indexA === -1 ? TYPE_ORDER.length : indexA) - (indexB === -1 ? TYPE_ORDER.length : indexB)
      })

      // 构建 CHANGELOG 内容
      let newContent = ''

      for (const key of sortedKeys) {
        const [emoji, type] = key.split('|')
        const groupCommits = groupedCommits[key]
        const title = this.getTypeTitle(type)

        newContent += `\n### ${emoji} ${title}\n\n`

        for (const commit of groupCommits) {
          const scopePrefix = commit.scope ? `**${commit.scope}:** ` : ''
          newContent += `- ${scopePrefix}${commit.message} (${commit.shortHash})\n`
        }
      }

      // 根据不同格式生成条目
      let entry: string

      if (format === 'keepachangelog') {
        entry = `\n## [${newVersion}] - ${date}${newContent}\n`
      }
      else if (format === 'conventional') {
        entry = `\n## ${versionTitle} (${date})${newContent}\n`
      }
      else {
        // 默认使用 conventional 格式
        entry = `\n# Changelog\n\n## ${versionTitle} (${date})${newContent}\n`
      }

      // 如果文件为空或不存在，直接写入
      if (!content) {
        writeFileSync(changelogPath, entry.trimStart(), 'utf8')
      }
      else {
        // 在第一个 ## 或 # 版本标题之前插入新条目
        const insertIndex = content.search(/^#{1,3}\s+/m)
        if (insertIndex !== -1) {
          content = content.slice(0, insertIndex) + entry + content.slice(insertIndex)
        }
        else {
          content += entry
        }
        writeFileSync(changelogPath, content, 'utf8')
      }

      log.success(`CHANGELOG 已更新: ${changelogPath}`)
    }
    catch (error) {
      throw new Error(`更新 CHANGELOG 失败: ${(error as Error).message}`)
    }
  }

  /**
   * 从修改的文件列表推断变更范围
   */
  private inferScopeFromFiles(files: string[]): string {
    if (files.length === 0)
      return ''

    // 常见目录映射
    const dirMap: Record<string, string> = {
      src: 'core',
      lib: 'core',
      dist: 'build',
      docs: 'docs',
      test: 'tests',
      tests: 'tests',
      __tests__: 'tests',
      examples: 'examples',
      '.github': 'ci',
      scripts: 'scripts',
    }

    const dirs = files.map(file => file.split('/')[0])

    // 统计最常见的目录
    const dirCount: Record<string, number> = {}
    for (const dir of dirs) {
      dirCount[dir] = (dirCount[dir] || 0) + 1
    }

    const mostCommonDir = Object.entries(dirCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0]

    return dirMap[mostCommonDir] || mostCommonDir || ''
  }
}
