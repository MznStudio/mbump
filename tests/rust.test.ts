import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VersionManager } from '@/core/VersionManager'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

describe('Rust Version Management', () => {
  let tempDir: string
  let versionManager: VersionManager
  let testId = 0

  beforeEach(() => {
    testId++
    tempDir = join(__dirname, `temp-rust-project-${testId}`)
    try {
      rmSync(tempDir, { recursive: true, force: true })
    }
    catch {
    }
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    }
    catch {
    }
  })

  const setupCargoToml = (name: string, version: string) => {
    const cargoToml = `[package]
name = "${name}"
version = "${version}"
`
    const cargoTomlPath = join(tempDir, 'Cargo.toml')
    writeFileSync(cargoTomlPath, cargoToml)

    versionManager = new VersionManager({
      rootDir: tempDir,
      projectType: 'rust',
      config: {
        packagePaths: {
          [name]: cargoTomlPath,
        },
        defaults: {
          releaseType: 'patch',
        },
        git: {
          autoCommit: false,
          push: false,
          tag: false,
          changelog: false,
        },
      },
    })

    return cargoTomlPath
  }

  it('应该正确解析 Cargo.toml 中的版本号', () => {
    setupCargoToml('test-crate', '1.0.0')

    const version = versionManager.getPackageVersion('test-crate')
    expect(version).toBe('1.0.0')
  })

  it('应该正确解析 Cargo.toml 中的预发布版本', () => {
    setupCargoToml('test-crate', '1.0.0-beta.1')

    const version = versionManager.getPackageVersion('test-crate')
    expect(version).toBe('1.0.0-beta.1')
  })

  it('应该在 Cargo.toml 不存在时返回 null', () => {
    versionManager = new VersionManager({
      rootDir: tempDir,
      projectType: 'rust',
      config: {
        packagePaths: {
          'test-crate': join(tempDir, 'Cargo.toml'),
        },
        defaults: {
          releaseType: 'patch',
        },
        git: {
          autoCommit: false,
          push: false,
          tag: false,
          changelog: false,
        },
      },
    })

    const version = versionManager.getPackageVersion('test-crate')
    expect(version).toBe(null)
  })

  it('应该正确计算 patch 版本更新', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'patch')
    expect(result.packages[0].oldVersion).toBe('1.0.0')
    expect(result.packages[0].newVersion).toBe('1.0.1')
  })

  it('应该正确计算 minor 版本更新', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'minor')
    expect(result.packages[0].newVersion).toBe('1.1.0')
  })

  it('应该正确计算 major 版本更新', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'major')
    expect(result.packages[0].newVersion).toBe('2.0.0')
  })

  it('应该正确计算 pre-patch 版本更新', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'pre-patch')
    expect(result.packages[0].newVersion).toBe('1.0.1-beta.0')
  })

  it('应该正确计算 pre-minor 版本更新', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'pre-minor')
    expect(result.packages[0].newVersion).toBe('1.1.0-beta.0')
  })

  it('应该正确计算 pre-major 版本更新', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'pre-major')
    expect(result.packages[0].newVersion).toBe('2.0.0-beta.0')
  })

  it('应该正确更新 Cargo.toml 中的版本号', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.updateVersion('test-crate', 'patch', {
      autoCommit: false,
      push: false,
      tag: false,
      changelog: false,
    })
    expect(result.success).toBe(true)
    expect(result.updatedPackages[0].newVersion).toBe('1.0.1')

    const updatedVersion = versionManager.getPackageVersion('test-crate')
    expect(updatedVersion).toBe('1.0.1')
  })

  it('应该使用自定义版本号', async () => {
    setupCargoToml('test-crate', '1.0.0')

    const result = await versionManager.previewUpdate('test-crate', 'patch', {
      customVersion: '2.5.0',
    })
    expect(result.packages[0].newVersion).toBe('2.5.0')
  })

  it('应该拒绝无效的自定义版本号', async () => {
    setupCargoToml('test-crate', '1.0.0')

    await expect(versionManager.previewUpdate('test-crate', 'patch', {
      customVersion: 'invalid-version',
    })).rejects.toThrow('无效的自定义版本号')
  })

  it('应该在缺少 version 字段时抛出错误', async () => {
    const cargoToml = `[package]
name = "test-crate"
`
    const cargoTomlPath = join(tempDir, 'Cargo.toml')
    writeFileSync(cargoTomlPath, cargoToml)

    versionManager = new VersionManager({
      rootDir: tempDir,
      projectType: 'rust',
      config: {
        packagePaths: {
          'test-crate': cargoTomlPath,
        },
        defaults: {
          releaseType: 'patch',
        },
        git: {
          autoCommit: false,
          push: false,
          tag: false,
          changelog: false,
        },
      },
    })

    const version = versionManager.getPackageVersion('test-crate')
    expect(version).toBe('0.0.0')
  })
})