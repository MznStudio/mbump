import { execSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { join } from 'node:path'
import { NodeVersionProvider, VersionManager } from './dist/index.js'

// 创建临时测试目录
const tempDir = join(os.tmpdir(), `mbump-test-${Date.now()}`)
mkdirSync(tempDir, { recursive: true })

try {
  // 创建 package.json 文件（根包）- 使用用户的包名
  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
    name: '@mznjs/mbump',
    version: '2.2.10',
  }, null, 2))

  // 创建子包目录 - 模拟用户的配置
  mkdirSync(join(tempDir, 'packages'), { recursive: true })
  mkdirSync(join(tempDir, 'packages', 'theme'), { recursive: true })
  mkdirSync(join(tempDir, 'packages', 'web'), { recursive: true })
  mkdirSync(join(tempDir, 'plugins'), { recursive: true })
  mkdirSync(join(tempDir, 'plugins', 'utils'), { recursive: true })
  mkdirSync(join(tempDir, 'plugins', 'core'), { recursive: true })

  writeFileSync(join(tempDir, 'packages', 'theme', 'package.json'), JSON.stringify({
    name: 'theme',
    version: '0.0.7',
  }, null, 2))
  writeFileSync(join(tempDir, 'packages', 'web', 'package.json'), JSON.stringify({
    name: 'web',
    version: '0.0.8',
  }, null, 2))
  writeFileSync(join(tempDir, 'plugins', 'utils', 'package.json'), JSON.stringify({
    name: 'utils',
    version: '0.0.7',
  }, null, 2))
  writeFileSync(join(tempDir, 'plugins', 'core', 'package.json'), JSON.stringify({
    name: 'core',
    version: '0.0.4',
  }, null, 2))

  // 创建配置文件 - 模拟用户的配置（不包含 default）
  writeFileSync(join(tempDir, '.mbump.config.json'), JSON.stringify({
    packagePaths: {
      theme: 'packages/theme/package.json',
      web: 'packages/web/package.json',
      utils: 'plugins/utils/package.json',
      core: 'plugins/core/package.json',
    },
    git: {
      tag: true,
      push: false,
      changelog: false,
      autoCommit: false,
    },
  }, null, 2))

  // 初始化 git
  execSync('git init', { cwd: tempDir, stdio: 'pipe' })
  execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' })
  execSync('git add .', { cwd: tempDir, stdio: 'pipe' })
  execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' })

  // 创建 VersionManager
  const manager = new VersionManager({ rootDir: tempDir })

  console.log('=== 配置信息 ===')
  console.log('packagePaths:', JSON.stringify(manager.config.packagePaths, null, 2))

  // 测试 _isDefaultPackage
  console.log('\n=== _isDefaultPackage 测试 ===')
  for (const key of Object.keys(manager.config.packagePaths)) {
    const isDefault = manager._isDefaultPackage(key)
    const pkgPath = manager.config.packagePaths[key]
    console.log(`_isDefaultPackage('${key}'): ${isDefault} (path: ${pkgPath})`)
  }

  // 测试 getDefaultTagFormat
  console.log('\n=== getDefaultTagFormat 测试 ===')
  const provider = new NodeVersionProvider()
  console.log('根包:', provider.getDefaultTagFormat('@mznjs/mbump', '2.2.11', true))
  console.log('子包:', provider.getDefaultTagFormat('theme', '0.0.8', false))

  // 检查 packagePaths 的键顺序
  console.log('\n=== packagePaths 键顺序 ===')
  console.log('Object.keys:', Object.keys(manager.config.packagePaths))

  // 模拟实际调用流程
  console.log('\n=== 模拟实际调用流程 ===')
  const packagePaths = manager.config.packagePaths
  const targets = Object.entries(packagePaths)
  console.log('targets:', JSON.stringify(targets))

  // 获取第一个包的信息
  const firstTarget = targets[0]
  const [firstKey, firstPath] = firstTarget
  console.log('第一个包:', firstKey, firstPath)

  const firstPkg = manager.getPackageInfo(firstPath)
  console.log('第一个包信息:', JSON.stringify(firstPkg))

  const isDefault = manager._isDefaultPackage(firstKey)
  console.log('isDefault:', isDefault)

  const tagName = provider.getDefaultTagFormat(firstPkg.name, '2.2.11', isDefault)
  console.log('生成的 tag:', tagName)
}
finally {
  // 清理
  rmSync(tempDir, { recursive: true, force: true })
}
