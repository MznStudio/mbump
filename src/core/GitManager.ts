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

  getCurrentBranch(): string | null {
    try {
      const output = execSync('git rev-parse --abbrev-ref HEAD', {
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

  getDefaultRemote(): string | null {
    try {
      const branch = this.getCurrentBranch()
      if (!branch)
        return null

      const output = execSync(`git config branch.${branch}.remote`, {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      const upstreamRemote = output.trim()
      if (upstreamRemote)
        return upstreamRemote
    }
    catch {
    }

    try {
      const output = execSync('git remote', {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      const remotes = output.trim().split('\n').filter(Boolean)
      if (remotes.length > 0) {
        const origin = remotes.find(r => r === 'origin')
        return origin || remotes[0]
      }
    }
    catch {
    }

    return null
  }

  getRepoUrl(): string | null {
    try {
      const remote = this.getDefaultRemote()
      if (!remote)
        return null

      const output = execSync(`git remote get-url ${remote}`, {
        cwd: this.rootDir,
        encoding: 'utf8',
        stdio: 'pipe',
      })
      const url = output.trim()

      let httpsUrl: string

      if (url.startsWith('git@')) {
        const [host, repo] = url.replace('git@', '').split(':')
        httpsUrl = `https://${host}/${repo}`
      }
      else if (url.startsWith('https://')) {
        httpsUrl = url
      }
      else if (url.startsWith('git://')) {
        httpsUrl = url.replace('git://', 'https://')
      }
      else {
        return null
      }

      if (httpsUrl.endsWith('.git')) {
        httpsUrl = httpsUrl.slice(0, -4)
      }

      return httpsUrl
    }
    catch {
      return null
    }
  }

  getCommitUrl(hash: string, customCommitPath?: string): string | null {
    const repoUrl = this.getRepoUrl()
    if (!repoUrl)
      return null

    const commitPath = customCommitPath || this.detectCommitPath(repoUrl)

    if (!commitPath)
      return null

    return `${repoUrl}${commitPath}${hash}`
  }

  private detectCommitPath(repoUrl: string): string | null {
    const host = new URL(repoUrl).hostname

    if (host.includes('github.com')) {
      return '/commit/'
    }
    else if (host.includes('gitlab.com') || host.includes('gitlab.')) {
      return '/-/commit/'
    }
    else if (host.includes('bitbucket.org') || host.includes('bitbucket.')) {
      return '/commits/'
    }
    else if (host.includes('gitee.com') || host.includes('gitee.')) {
      return '/commit/'
    }
    else if (host.includes('coding.net') || host.includes('coding.')) {
      return '/commit/'
    }
    else {
      return '/-/commit/'
    }
  }

  getCommitsSinceLastTag(): { hash: string, message: string, files: string[] }[] {
    try {
      const lastTag = this.getLastTag()
      const range = lastTag ? `${lastTag}..HEAD` : '--max-count=50'

      // 使用 --format 和 --name-only 同时获取 commit hash、message 和文件列表
      const output = execSync(
        `git log ${range} --format="COMMIT_START%n%H%n%s" --name-only`,
        {
          cwd: this.rootDir,
          encoding: 'utf8',
          stdio: 'pipe',
        },
      )

      const commits: { hash: string, message: string, files: string[] }[] = []
      const blocks = output.split('COMMIT_START').filter(Boolean)

      for (const block of blocks) {
        const lines = block.trim().split('\n')
        if (lines.length === 0)
          continue

        // 第一行是 commit hash，第二行是 commit message
        const hash = lines[0]?.trim() || ''
        const message = lines[1]?.trim() || ''

        if (!hash || !message)
          continue

        // 其余行是文件列表
        const files = lines
          .slice(2)
          .map(f => f.trim())
          .filter(f => f && !f.startsWith('COMMIT_START'))

        commits.push({ hash, message, files })
      }

      return commits
    }
    catch {
      return []
    }
  }

  checkVersionExists(version: string, tagPrefix: string = 'v', packageName?: string): boolean {
    try {
      const tag = packageName ? `${packageName}@${version}` : `${tagPrefix}${version}`
      execSync(`git rev-parse --verify ${tag}`, {
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
      const remote = this.getDefaultRemote()
      const branch = this.getCurrentBranch()
      let pushCommand = 'git push'

      if (remote) {
        pushCommand = branch ? `git push ${remote} ${branch}` : `git push ${remote}`
      }

      execSync(pushCommand, {
        cwd: this.rootDir,
        stdio: 'pipe',
      })
      log.debug('Git push')

      if (includeTags) {
        execSync(remote ? `git push ${remote} --tags` : 'git push --tags', {
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

  commitAndPush(message: string, push: boolean = true, createTag: boolean = false, tagVersion?: string, tagPrefix: string = 'v', tagName?: string): void {
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
      if (tagName) {
        try {
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
      else {
        this.createTag(tagVersion, tagPrefix)
      }
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
