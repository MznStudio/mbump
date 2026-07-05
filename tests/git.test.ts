import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import os from 'node:os'
import { GitManager } from '../src/core/GitManager'

describe('GitManager', () => {
  let tempDir: string

  function setupTestRepo(): string {
    tempDir = join(os.tmpdir(), `mbump-git-test-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })
    execSync('git init', { cwd: tempDir, stdio: 'pipe' })
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' })
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' })
    execSync('touch README.md', { cwd: tempDir, stdio: 'pipe' })
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' })
    execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'pipe' })
    return tempDir
  }

  function cleanup(): void {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }

  describe('getRepoUrl', () => {
    it('应该返回 null 当没有远程仓库时', () => {
      const repoPath = setupTestRepo()
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getRepoUrl()).toBeNull()
      cleanup()
    })

    it('应该正确解析 SSH 格式的远程 URL', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin git@github.com:MznStudio/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getRepoUrl()).toBe('https://github.com/MznStudio/mbump')
      cleanup()
    })

    it('应该正确解析 HTTPS 格式的远程 URL', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin https://github.com/MznStudio/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getRepoUrl()).toBe('https://github.com/MznStudio/mbump')
      cleanup()
    })

    it('应该正确解析 git:// 格式的远程 URL', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin git://github.com/MznStudio/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getRepoUrl()).toBe('https://github.com/MznStudio/mbump')
      cleanup()
    })

    it('应该正确解析自定义域名的远程 URL', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin https://cnb.cool/mznjs/mbump', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getRepoUrl()).toBe('https://cnb.cool/mznjs/mbump')
      cleanup()
    })

    it('应该正确解析 SSH 格式的自定义域名远程 URL', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin git@cnb.cool:mznjs/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getRepoUrl()).toBe('https://cnb.cool/mznjs/mbump')
      cleanup()
    })

    it('应该去除 .git 后缀', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin https://github.com/MznStudio/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      const url = gitManager.getRepoUrl()!
      expect(url.endsWith('.git')).toBe(false)
      expect(url).toBe('https://github.com/MznStudio/mbump')
      cleanup()
    })
  })

  describe('getDefaultRemote', () => {
    it('应该返回 null 当没有远程仓库时', () => {
      const repoPath = setupTestRepo()
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getDefaultRemote()).toBeNull()
      cleanup()
    })

    it('应该返回 origin 远程仓库', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add origin https://github.com/MznStudio/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getDefaultRemote()).toBe('origin')
      cleanup()
    })

    it('应该返回第一个可用的远程仓库', () => {
      const repoPath = setupTestRepo()
      execSync('git remote add upstream https://github.com/MznStudio/mbump.git', { cwd: repoPath, stdio: 'pipe' })
      const gitManager = new GitManager(repoPath)
      expect(gitManager.getDefaultRemote()).toBe('upstream')
      cleanup()
    })
  })
})