import { VersionManager } from './dist/index.js';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import os from 'os';
import { execSync } from 'child_process';

// 创建临时测试目录
const tempDir = join(os.tmpdir(), 'mbump-test-' + Date.now());
mkdirSync(tempDir, { recursive: true });

// 创建 package.json 文件
writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: '@mznjs/mbump', version: '2.2.10' }, null, 2));

// 创建子包目录
mkdirSync(join(tempDir, 'packages'), { recursive: true });
mkdirSync(join(tempDir, 'packages', 'theme'), { recursive: true });
writeFileSync(join(tempDir, 'packages', 'theme', 'package.json'), JSON.stringify({ name: 'theme', version: '0.0.7' }, null, 2));

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

// 测试 updatePackageVersions
const manager = new VersionManager({ rootDir: tempDir });
const result = manager.updatePackageVersions({ packages: ['default', 'theme'], releaseType: 'patch', dryRun: true, verbose: true });

console.log('测试结果:');
console.log('packages:', JSON.stringify(result.packages, null, 2));

// 清理
rmSync(tempDir, { recursive: true, force: true });