import type { ChangelogCommit, ChangelogTypeConfig } from '@/types'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export const TYPE_CONFIG: Record<string, ChangelogTypeConfig> = {
  feat: { title: '🚀 新增功能', emoji: '🚀', color: 'green' },
  feature: { title: '🚀 新增功能', emoji: '🚀', color: 'green' },
  fix: { title: '🩹 缺陷修复', emoji: '🩹', color: 'red' },
  bugfix: { title: '🩹 缺陷修复', emoji: '🩹', color: 'red' },
  perf: { title: '🔥 性能优化', emoji: '🔥', color: 'yellow' },
  performance: { title: '🔥 性能优化', emoji: '🔥', color: 'yellow' },
  refactor: { title: '♻️ 代码重构', emoji: '♻️', color: 'cyan' },
  docs: { title: '📝 文档更新', emoji: '📝', color: 'blue' },
  style: { title: '💄 代码格式', emoji: '💄', color: 'white' },
  chore: { title: '🔧 工具变更', emoji: '🔧', color: 'gray' },
  build: { title: '📦 构建变更', emoji: '📦', color: 'magenta' },
  ci: { title: '👷 CI 变更', emoji: '👷', color: 'cyan' },
  test: { title: '✅ 测试更新', emoji: '✅', color: 'green' },
  revert: { title: '⏪ 回滚提交', emoji: '⏪', color: 'red' },
  breaking: { title: '💥 破坏性变更', emoji: '💥', color: 'red' },
  break: { title: '💥 破坏性变更', emoji: '💥', color: 'red' },
}

export class ChangelogManager {
  private changelogPath: string

  constructor(rootDir: string) {
    this.changelogPath = `${rootDir}/CHANGELOG.md`
  }

  getTypeConfig(message: string): ChangelogTypeConfig {
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/)
    if (match) {
      const [, type] = match
      return TYPE_CONFIG[type.toLowerCase()] || {
        title: '📦 其他变更',
        emoji: '📦',
        color: 'gray',
      }
    }
    return { title: '📦 其他变更', emoji: '📦', color: 'gray' }
  }

  formatFileNames(files: string[]): string[] {
    return files.map((f) => {
      const parts = f.split('/')
      return parts[parts.length - 1]
    })
  }

  detectChangelogFormat(content: string) {
    const lines = content.split('\n')

    for (const line of lines) {
      if (line.startsWith('## [') || line.startsWith('## Version')) {
        return {
          hasHeader: true,
          titlePrefix: line.startsWith('## [') ? '## [' : '## ',
          usesBrackets: line.startsWith('## ['),
          sectionLevel: '###',
        }
      }
    }

    return {
      hasHeader: false,
      titlePrefix: '## [',
      usesBrackets: true,
      sectionLevel: '###',
    }
  }

  async updateChangelog(newVersion: string, commits: ChangelogCommit[], packageName?: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    
    // 构建版本标题：如果有包名，使用 {package-name}@{version} 格式
    const versionTitle = packageName ? `${packageName}@${newVersion}` : newVersion

    const categorized: Record<
      string,
      { config: ChangelogTypeConfig, items: { message: string, files: string[] }[] }
    > = {}

    for (const { message, files } of commits) {
      const typeConfig = this.getTypeConfig(message)
      const typeKey = typeConfig.title

      if (!categorized[typeKey]) {
        categorized[typeKey] = { config: typeConfig, items: [] }
      }

      const fileNames = this.formatFileNames(files)
      const fileTag = fileNames.length > 0 ? ` (${fileNames.join(', ')})` : ''

      categorized[typeKey].items.push({
        message: message + fileTag,
        files,
      })
    }

    if (!existsSync(this.changelogPath)) {
      let content = `# 更新日志 (Changelog)\n\n本项目的所有重要变更都将记录在此文件中。\n\n格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，\n本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。\n\n`
      content += `## [${versionTitle}] - ${today}\n\n`

      const sortedCategories = Object.values(categorized).sort((a, b) => {
        const order = ['🚀', '🩹', '🔥', '♻️', '📝', '💄', '🔧', '📦', '👷', '✅', '⏪', '💥']
        return order.indexOf(a.config.emoji) - order.indexOf(b.config.emoji)
      })

      for (const category of sortedCategories) {
        content += `${category.config.title}\n\n`
        for (const item of category.items) {
          content += `- ${item.message}\n`
        }
        content += '\n'
      }

      await writeFileSync(this.changelogPath, content, 'utf-8')
      return
    }

    const existingContent = await readFileSync(this.changelogPath, 'utf-8')
    const format = this.detectChangelogFormat(existingContent)

    let header: string
    if (format.usesBrackets) {
      header = `${format.titlePrefix}${versionTitle}] - ${today}\n\n`
    }
    else {
      header = `${format.titlePrefix}${versionTitle} - ${today}\n\n`
    }

    const sortedCategories = Object.values(categorized).sort((a, b) => {
      const order = ['🚀', '🩹', '🔥', '♻️', '📝', '💄', '🔧', '📦', '👷', '✅', '⏪', '💥']
      return order.indexOf(a.config.emoji) - order.indexOf(b.config.emoji)
    })

    for (const category of sortedCategories) {
      header += `${category.config.title}\n\n`
      for (const item of category.items) {
        header += `- ${item.message}\n`
      }
      header += '\n'
    }

    if (commits.length === 0) {
      header += `### 待补充\n\n`
    }

    let newContent: string
    if (format.hasHeader) {
      const firstVersionIndex = existingContent.search(/^##\s*\[?/m)
      if (firstVersionIndex !== -1) {
        newContent
          = existingContent.slice(0, firstVersionIndex)
            + header
            + existingContent.slice(firstVersionIndex)
      }
      else {
        newContent = header + existingContent
      }
    }
    else {
      newContent = header + existingContent
    }

    await writeFileSync(this.changelogPath, newContent, 'utf-8')
  }
}
