import { VersionManager } from './dist/index.js';
import { join, resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import os from 'os';

// 创建临时测试目录
const tempDir = join(os.tmpdir(), 'mbump-test-' + Date.now());
mkdirSync(tempDir, { recursive: true });

try {
  // 创建 package.json 文件（根包）
  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ 
    name: '@mznjs/mbump', 
    version: '2.2.10' 
  }, null, 2));

  // 创建子包目录
  mkdirSync(join(tempDir, 'packages'), { recursive: true });
  mkdirSync(join(tempDir, 'packages', 'theme'), { recursive: true });
  writeFileSync(join(tempDir, 'packages', 'theme', 'package.json'), JSON.stringify({ 
    name: 'theme', 
    version: '0.0.7' 
  }, null, 2));

  // 创建配置文件
  writeFileSync(join(tempDir, '.mbump.config.json'), JSON.stringify({
    packagePaths: {
      theme: 'packages/theme/package.json',
    },
    git: {
      tag: true,
      push: false,
      changelog: false,
      autoCommit: false,
    },
  }, null, 2));

  // 初始化 git
  execSync('git init', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
  execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });

  // 创建 VersionManager
  const manager = new VersionManager({ rootDir: tempDir });
  
  // 获取配置中的 packagePaths
  const packagePaths = manager.config.packagePaths;
  console.log('packagePaths:', JSON.stringify(packagePaths, null, 2));
  
  // 测试 _isDefaultPackage
  for (const key of Object.keys(packagePaths)) {
    const isDefault = manager._isDefaultPackage(key);
    console.log(`_isDefaultPackage('${key}'):`, isDefault);
  }
  
  // 测试 updateVersion
  console.log('\n--- 执行 updateVersion ---');
  const result = await manager.updateVersion('all', 'patch', {
    dryRun: true,
    autoCommit: false,
    npm: false,
    changelog: false,
  });
  
  console.log('更新结果:', JSON.stringify(result.updatedPackages, null, 2));
  
} finally {
  // 清理
  rmSync(tempDir, { recursive: true, force: true });
}