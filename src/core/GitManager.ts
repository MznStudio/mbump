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
      const output = execSync(`git log ${range} --format=%B`, {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      return output.trim().split('\n').filter(Boolean).map(message => ({ message, files: [] }))
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
