import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import os from 'node:os'
import { VersionManager } from '../src/core/VersionManager'
import { loadConfig } from '../src/config/loader'

/**
 * 集成测试 - 验证 mbump 的完整工作流程
 */
describe('Integration Tests', () => {
  let tempDir: string
  let testProjectPath: string

  /**
   * 创建临时测试目录和 Git 仓库
   */
  function setupTestProject(): string {
    // 创建临时目录
    tempDir = join(os.tmpdir(), `mbump-test-${Date.now()}`)
    mkdirSync(tempDir, { recursive: true })

    // 初始化 Git 仓库
    execSync('git init', { cwd: tempDir, stdio: 'pipe' })
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' })
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' })

    return tempDir
  }

  /**
   * 清理临时目录
   */
  function cleanupTestProject(): void {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }

  /**
   * 创建 package.json 文件
   */
  function createPackageFile(name: string, version: string, path?: string): string {
    const pkgPath = path || join(tempDir, 'package.json')
    const pkgContent = {
      name,
      version,
      description: 'Test package',
      main: 'index.js',
    }
    writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2))
    return pkgPath
  }

  /**
   * 创建配置文件
   */
  function createConfigFile(packagePaths: Record<string, string>): string {
    const configPath = join(tempDir, '.mbump.config.json')
    const configContent = {
      packagePaths,
      git: {
        tag: true,
        push: false,
        changelog: true,
        autoCommit: true,
      },
    }
    writeFileSync(configPath, JSON.stringify(configContent, null, 2))
    return configPath
  }

  /**
   * 创建初始 Git commit
   */
  function createInitialCommit(): void {
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' })
    execSync('git commit -m "initial commit"', { cwd: tempDir, stdio: 'pipe' })
  }

  beforeEach(() => {
    testProjectPath = setupTestProject()
  })

  afterEach(() => {
    cleanupTestProject()
  })

  describe('单包版本更新', () => {
    it('应该成功更新单个包的版本号', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 执行版本更新
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'minor', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: false,
      })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.updatedPackages).toHaveLength(1)
      expect(result.updatedPackages[0].name).toBe('test-package')
      expect(result.updatedPackages[0].oldVersion).toBe('1.0.0')
      expect(result.updatedPackages[0].newVersion).toBe('1.1.0')

      // 验证 package.json 已更新
      const pkgContent = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf8'))
      expect(pkgContent.version).toBe('1.1.0')
    })

    it('应该在 dry-run 模式下不修改文件', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 执行 dry-run 更新
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'patch', {
        dryRun: true,
        autoCommit: false,
        npm: false,
        changelog: false,
      })

      // 验证结果
      expect(result.success).toBe(true)
      expect(result.updatedPackages).toHaveLength(1)
      expect(result.updatedPackages[0].newVersion).toBe('1.0.1')

      // 验证 package.json 未被修改
      const pkgContent = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf8'))
      expect(pkgContent.version).toBe('1.0.0')
    })

    it('应该拒绝无效的自定义版本号', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 执行无效版本更新
      const manager = new VersionManager({ rootDir: tempDir })

      const result = await manager.updateVersion('default', 'patch', {
        customVersion: 'invalid-version',
        dryRun: false,
      })

      // 验证结果 - 注意：错误是通过 result.error 返回的，而不是抛出异常
      expect(result.success).toBe(false)
      expect(result.error).toContain('无效的自定义版本号')
    })
  })

  describe('批量版本更新', () => {
    it('应该成功更新多个包的版本号', async () => {
      // 创建测试环境
      const packagesDir = join(tempDir, 'packages')
      mkdirSync(packagesDir, { recursive: true })

      const pkgADir = join(packagesDir, 'pkg-a')
      const pkgBDir = join(packagesDir, 'pkg-b')
      mkdirSync(pkgADir, { recursive: true })
      mkdirSync(pkgBDir, { recursive: true })

      createPackageFile('pkg-a', '1.0.0', join(pkgADir, 'package.json'))
      createPackageFile('pkg-b', '2.0.0', join(pkgBDir, 'package.json'))

      createConfigFile({
        'pkg-a': 'packages/pkg-a/package.json',
        'pkg-b': 'packages/pkg-b/package.json',
      })

      createInitialCommit()

      // 执行批量更新
      const manager = new VersionManager({ rootDir: tempDir })

      // 更新第一个包
      const result1 = await manager.updateVersion('pkg-a', 'minor', {
        dryRun: false,
        autoCommit: false,
        npm: false,
        changelog: false,
      })

      // 更新第二个包
      const result2 = await manager.updateVersion('pkg-b', 'patch', {
        dryRun: false,
        autoCommit: false,
        npm: false,
        changelog: false,
      })

      // 验证结果
      expect(result1.success).toBe(true)
      expect(result1.updatedPackages[0].newVersion).toBe('1.1.0')

      expect(result2.success).toBe(true)
      expect(result2.updatedPackages[0].newVersion).toBe('2.0.1')

      // 验证两个 package.json 都已更新
      const pkgA = JSON.parse(readFileSync(join(pkgADir, 'package.json'), 'utf8'))
      const pkgB = JSON.parse(readFileSync(join(pkgBDir, 'package.json'), 'utf8'))

      expect(pkgA.version).toBe('1.1.0')
      expect(pkgB.version).toBe('2.0.1')
    })

    it('应该支持部分包更新失败时的容错', async () => {
      // 创建测试环境
      const pkgADir = join(tempDir, 'pkg-a')
      mkdirSync(pkgADir, { recursive: true })
      createPackageFile('pkg-a', '1.0.0', join(pkgADir, 'package.json'))

      // 故意创建错误的配置（指向不存在的文件）
      createConfigFile({
        'pkg-a': 'pkg-a/package.json',
        'pkg-b': 'non-existent/package.json', // 这个包不存在
      })

      createInitialCommit()

      const manager = new VersionManager({ rootDir: tempDir })

      // 更新存在的包应该成功
      const result1 = await manager.updateVersion('pkg-a', 'patch', {
        dryRun: false,
        autoCommit: false,
        npm: false,
        changelog: false,
      })

      expect(result1.success).toBe(true)

      // 更新不存在的包应该失败
      const result2 = await manager.updateVersion('pkg-b', 'patch', {
        dryRun: false,
        autoCommit: false,
        npm: false,
        changelog: false,
      })

      expect(result2.success).toBe(false)
      expect(result2.error).toBeDefined()
    })
  })

  describe('CHANGELOG 生成', () => {
    it('应该在版本更新后生成 CHANGELOG', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })

      // 创建一些 commits
      execSync('git add . && git commit -m "feat: initial feature"', { cwd: tempDir, stdio: 'pipe' })
      writeFileSync(join(tempDir, 'test.txt'), 'test content')
      execSync('git add . && git commit -m "fix: bug fix"', { cwd: tempDir, stdio: 'pipe' })

      // 执行版本更新（启用 CHANGELOG）
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'minor', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: true,
      })

      // 验证结果
      expect(result.success).toBe(true)

      // 验证 CHANGELOG.md 已创建
      const changelogPath = join(tempDir, 'CHANGELOG.md')
      expect(existsSync(changelogPath)).toBe(true)

      const changelogContent = readFileSync(changelogPath, 'utf8')
      // CHANGELOG 标题格式是 [version] 而不是 [vversion]
      expect(changelogContent).toContain('[1.1.0]')
      expect(changelogContent).toMatch(/feat|fix/)
    })

    it('应该在禁用 CHANGELOG 时不生成文件', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 执行版本更新（禁用 CHANGELOG）
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'patch', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: false,
      })

      // 验证结果
      expect(result.success).toBe(true)

      // 验证 CHANGELOG.md 未创建
      const changelogPath = join(tempDir, 'CHANGELOG.md')
      expect(existsSync(changelogPath)).toBe(false)
    })
  })

  describe('Git Tag 管理', () => {
    it('应该在版本更新后创建 Git Tag', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 执行版本更新
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'minor', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: false,
        tag: true,
      })

      // 验证结果
      expect(result.success).toBe(true)

      // 验证 Git Tag 已创建
      const tags = execSync('git tag', { cwd: tempDir, encoding: 'utf8' }).trim().split('\n')
      expect(tags).toContain('v1.1.0')
    })

    it('应该在禁用 Tag 时不创建标签', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 执行版本更新（禁用 Tag）
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'patch', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: false,
        tag: false,
      })

      // 验证结果
      expect(result.success).toBe(true)

      // 验证没有创建 Git Tag
      const tags = execSync('git tag', { cwd: tempDir, encoding: 'utf8' }).trim()
      expect(tags).toBe('')
    })

    it('应该使用自定义 Tag 前缀', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      const configPath = join(tempDir, '.mbump.config.json')
      writeFileSync(configPath, JSON.stringify({
        packagePaths: { default: 'package.json' },
        git: {
          tag: true,
          push: false,
          tagPrefix: 'release-',
        },
      }, null, 2))

      createInitialCommit()

      // 执行版本更新
      const manager = new VersionManager({ rootDir: tempDir })
      const result = await manager.updateVersion('default', 'major', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: false,
        tag: true,
        tagPrefix: 'release-',
      })

      // 验证结果
      expect(result.success).toBe(true)

      // 验证使用了自定义前缀的 Git Tag
      const tags = execSync('git tag', { cwd: tempDir, encoding: 'utf8' }).trim().split('\n')
      expect(tags).toContain('release-2.0.0')
    })
  })

  describe('缓存机制', () => {
    it('应该预加载包信息到缓存', () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 创建 VersionManager（会自动预加载）
      const manager = new VersionManager({ rootDir: tempDir })

      // 获取缓存统计
      const stats = manager.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.packages).toContain(join(tempDir, 'package.json'))
    })

    it('应该能够清除包缓存', () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      const manager = new VersionManager({ rootDir: tempDir })

      // 验证缓存存在
      let stats = manager.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)

      // 清除缓存
      manager.clearPackageCache()

      // 验证缓存已清除
      stats = manager.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('应该能够刷新指定包的缓存', () => {
      // 创建测试环境
      const pkgPath = join(tempDir, 'package.json')
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      const manager = new VersionManager({ rootDir: tempDir })

      // 获取初始版本
      const pkg1 = manager.getPackageInfo(pkgPath)
      expect(pkg1.version).toBe('1.0.0')

      // 直接修改文件（绕过缓存）
      writeFileSync(pkgPath, JSON.stringify({ ...pkg1, version: '2.0.0' }, null, 2))

      // 刷新缓存并重新读取
      const pkg2 = manager.refreshPackageCache(pkgPath)
      expect(pkg2.version).toBe('2.0.0')
    })
  })

  describe('配置加载缓存', () => {
    it('应该缓存配置以避免重复读取', () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 第一次加载配置
      const config1 = loadConfig(tempDir)
      expect(config1.packagePaths.default).toBeDefined()

      // 第二次加载应该使用缓存（无法直接验证，但可以确保返回相同结果）
      const config2 = loadConfig(tempDir)
      expect(config2.packagePaths.default).toBe(config1.packagePaths.default)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的包名', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      const manager = new VersionManager({ rootDir: tempDir })

      // 尝试更新不存在的包
      const result = await manager.updateVersion('non-existent', 'patch', {
        dryRun: false,
        autoCommit: false,
        npm: false,
        changelog: false,
      })

      // 验证结果 - 错误是通过 result.error 返回的
      expect(result.success).toBe(false)
      expect(result.error).toContain('无效的包名')
    })

    it('应该处理版本冲突', async () => {
      // 创建测试环境
      createPackageFile('test-package', '1.0.0')
      createConfigFile({ default: 'package.json' })
      createInitialCommit()

      // 创建一个已存在的 tag
      execSync('git tag v1.1.0', { cwd: tempDir, stdio: 'pipe' })

      const manager = new VersionManager({ rootDir: tempDir })

      // 尝试创建已存在的版本
      const result = await manager.updateVersion('default', 'minor', {
        dryRun: false,
        autoCommit: true,
        npm: false,
        changelog: false,
        tag: true,
      })

      // 验证结果 - 错误是通过 result.error 返回的
      expect(result.success).toBe(false)
      expect(result.error).toContain('已存在')
    })
  })
})
