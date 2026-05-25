import { execSync } from 'node:child_process'
import log from '@/utils/logger'

export class GitManager {
  private rootDir: string

  constructor(rootDir: string) {
    this.rootDir = rootDir
  }

  hasUncommittedChanges(): boolean {
    try {
      const output = execSync('git status --porcelain', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      return output.trim() !== ''
    }
    catch {
      return false
    }
  }

  getLastTag(): string | null {
    try {
      const output = execSync('git describe --tags --abbrev=0', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      return output.trim() || null
    }
    catch {
      return null
    }
  }

  getCommitsSinceLastTag(): { message: string, files: string[] }[] {
    try {
      const lastTag = this.getLastTag()
      const range = lastTag ? `${lastTag}..HEAD` : '--max-count=50'

      // 使用 --format 和 --name-only 同时获取 commit message 和文件列表
      const output = execSync(
        `git log ${range} --format="COMMIT_START%n%s" --name-only`,
        {
          cwd: this.rootDir,
          encoding: 'utf8',
          stdio: 'pipe',
        },
      )

      const commits: { message: string, files: string[] }[] = []
      const blocks = output.split('COMMIT_START').filter(Boolean)

      for (const block of blocks) {
        const lines = block.trim().split('\n')
        if (lines.length === 0)
          continue

        // 第一行是 commit message（去掉空行）
        const messageLines = lines.filter(line => line.trim())
        if (messageLines.length === 0)
          continue

        const message = messageLines[0].trim()

        // 其余行是文件列表（跳过空行和 message 行）
        const files = lines
          .slice(1)
          .map(f => f.trim())
          .filter(f => f && !f.startsWith('COMMIT_START'))

        commits.push({ message, files })
      }

      return commits
    }
    catch {
      return []
    }
  }

  checkVersionExists(version: string, tagPrefix: string = 'v'): boolean {
    try {
      execSync(`git rev-parse --verify ${tagPrefix}${version}`, {
        cwd: this.rootDir,
        stdio: 'pipe',
      })
      return true
    }
    catch {
      return false
    }
  }

  addFiles(files: string[]): void {
    try {
      execSync(`git add ${files.join(' ')}`, {
        cwd: this.rootDir,
        stdio: 'pipe',
      })
    }
    catch (error) {
      throw new Error(`Git add failed: ${(error as Error).message}`)
    }
  }

  commit(message: string): void {
    try {
      execSync(`git commit -m "${message}"`, {
        cwd: this.rootDir,
        stdio: 'pipe',
      })
      log.debug(`Git commit: ${message}`)
    }
    catch (error) {
      throw new Error(`Git commit failed: ${(error as Error).message}`)
    }
  }

  createTag(version: string, tagPrefix: string = 'v'): void {
    try {
      const tagName = `${tagPrefix}${version}`
      execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
        cwd: this.rootDir,
        stdio: 'pipe',
      })
      log.success(`已创建 tag: ${tagName}`)
    }
    catch (error) {
      throw new Error(`创建 Tag 失败: ${(error as Error).message}`)
    }
  }

  push(includeTags: boolean = true): void {
    try {
      execSync('git push', {
        cwd: this.rootDir,
        stdio: 'pipe',
      })
      log.debug('Git push')

      if (includeTags) {
        execSync('git push --tags', {
          cwd: this.rootDir,
          stdio: 'pipe',
        })
        log.success('已推送 tags')
      }
    }
    catch (error) {
      throw new Error(`Git push failed: ${(error as Error).message}`)
    }
  }

  commitAndPush(message: string, push: boolean = true, createTag: boolean = false, tagVersion?: string, tagPrefix: string = 'v'): void {
    try {
      execSync('git config --local core.autocrlf false', {
        cwd: this.rootDir,
        stdio: 'ignore',
      })
    }
    catch {
      log.warn('Failed to set git config')
    }

    this.addFiles(['-u'])
    this.commit(message)

    if (createTag && tagVersion) {
      this.createTag(tagVersion, tagPrefix)
    }

    if (push) {
      try {
        this.push(createTag)
      }
      catch (error) {
        log.warn(`Git push failed: ${(error as Error).message}`)
      }
    }
  }
}
