import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RustManager } from '@/core/RustManager'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

describe('RustManager', () => {
  let tempDir: string
  let rustManager: RustManager
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
    rustManager = new RustManager(tempDir)
  })

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true })
    }
    catch {
    }
  })

  it('应该正确解析 Cargo.toml 中的版本号', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    expect(rustManager.exists()).toBe(true)
    expect(rustManager.getCurrentVersion()).toBe('1.0.0')
    expect(rustManager.getPackageName()).toBe('test-crate')
  })

  it('应该正确解析 Cargo.toml 中的预发布版本', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0-beta.1"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    expect(rustManager.getCurrentVersion()).toBe('1.0.0-beta.1')
  })

  it('应该在 Cargo.toml 不存在时返回 null', () => {
    expect(rustManager.exists()).toBe(false)
    expect(rustManager.getCurrentVersion()).toBe(null)
    expect(rustManager.getPackageName()).toBe(null)
  })

  it('应该正确计算 patch 版本更新', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('patch', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.oldVersion).toBe('1.0.0')
    expect(result.newVersion).toBe('1.0.1')
  })

  it('应该正确计算 minor 版本更新', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('minor', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('1.1.0')
  })

  it('应该正确计算 major 版本更新', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('major', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('2.0.0')
  })

  it('应该正确计算 pre-patch 版本更新', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('pre-patch', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('1.0.1-beta.0')
  })

  it('应该正确计算 pre-minor 版本更新', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('pre-minor', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('1.1.0-beta.0')
  })

  it('应该正确计算 pre-major 版本更新', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('pre-major', { dryRun: true })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('2.0.0-beta.0')
  })

  it('应该正确更新 Cargo.toml 中的版本号', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"

[dependencies]
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('patch', {
      dryRun: false,
      autoCommit: false,
    })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('1.0.1')

    const updatedVersion = rustManager.getCurrentVersion()
    expect(updatedVersion).toBe('1.0.1')
  })

  it('应该使用自定义版本号', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    const result = rustManager.updateVersion('patch', {
      dryRun: true,
      customVersion: '2.5.0',
    })
    expect(result.success).toBe(true)
    expect(result.newVersion).toBe('2.5.0')
  })

  it('应该拒绝无效的自定义版本号', () => {
    const cargoToml = `[package]
name = "test-crate"
version = "1.0.0"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    expect(() => {
      rustManager.updateVersion('patch', {
        dryRun: true,
        customVersion: 'invalid-version',
      })
    }).toThrow('无效的自定义版本号')
  })

  it('应该在缺少 version 字段时抛出错误', () => {
    const cargoToml = `[package]
name = "test-crate"
`
    writeFileSync(join(tempDir, 'Cargo.toml'), cargoToml)

    expect(() => {
      rustManager.updateVersion('patch', { dryRun: true })
    }).toThrow('未找到 [package] 部分的 version 字段')
  })
})