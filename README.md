# zbump

企业级版本管理工具，支持单包和 monorepo 场景。

## 功能特性

- ✅ 基础版本递增 (major/minor/patch)
- ✅ 预发布版本支持 (pre-patch/pre-minor/pre-major)
- ✅ 自定义版本号
- ✅ CHANGELOG 自动生成
- ✅ Git Tag 管理
- ✅ Git 自动提交和推送
- ✅ 多包管理 (monorepo)
- ✅ 交互式版本选择
- ✅ 试运行模式
- ✅ NPM 发布支持
- ✅ 多格式配置文件支持

## 安装

```bash
npm install -g @mznjs/zbump
```

## 快速开始

### 单包项目

```bash
# 升级补丁版本
zbump patch

# 升级小版本
zbump minor

# 升级主版本
zbump major
```

### Monorepo 项目

创建配置文件 `.zbump.config.json`:

```json
{
  "packagePaths": {
    "components": "packages/components/package.json",
    "cli": "packages/cli/package.json",
    "core": "packages/core/package.json"
  }
}
```

```bash
# 更新所有包
zbump all

# 更新指定包
zbump components minor
```

## 命令行参数

```
用法: zbump [package] [type] [options]

参数:
  [package]      要更新的包名称或 "all" 更新所有包
  [type]         版本升级类型: major, minor, patch

选项:
  --dry-run, -d  试运行模式，只显示将要执行的操作
  --verbose, -v  详细输出模式，显示更多执行细节
  --no-commit, -n  禁用自动git提交
  --no-push, -p    禁用自动推送到远程仓库
  --allow-uncommitted, -u  允许在有未提交更改的情况下继续操作
  --npm, -npm    启用npm包发布功能（默认不发布）
  --help, -h     显示此帮助信息
```

## 配置文件

支持多种配置格式：`.zbump.config.json`, `.zbump.config.yaml`, `.zbump.config.toml`, `.zbump.config.js`

### 完整配置示例

```json
{
  "packagePaths": {
    "components": "packages/components/package.json"
  },
  "defaults": {
    "releaseType": "patch",
    "dryRun": false,
    "verbose": false,
    "allowUncommitted": false,
    "npm": false
  },
  "git": {
    "commitMessage": "chore: bump version to {{newVersion}}",
    "push": true,
    "autoCommit": true,
    "tag": true,
    "tagPrefix": "v",
    "changelog": true
  },
  "publish": {
    "command": "pnpm publish --access public --no-git-checks",
    "skipChecks": true
  }
}
```

## API 使用

```typescript
import { VersionManager, loadConfig } from '@mznjs/zbump'

const config = loadConfig(process.cwd())
const manager = new VersionManager({ config, rootDir: process.cwd() })

const result = await manager.updateVersion('my-package', 'minor', {
  dryRun: false,
  verbose: true,
  autoCommit: true,
  push: true,
})

console.log(result.updatedPackages)
```

## 版本类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `major` | 主版本升级 | 1.0.0 → 2.0.0 |
| `minor` | 次版本升级 | 1.0.0 → 1.1.0 |
| `patch` | 补丁版本升级 | 1.0.0 → 1.0.1 |
| `pre-patch` | 预发布补丁 | 1.0.0 → 1.0.1-beta.0 |
| `pre-minor` | 预发布次版本 | 1.0.0 → 1.1.0-beta.0 |
| `pre-major` | 预发布主版本 | 1.0.0 → 2.0.0-beta.0 |
| `as-is` | 保持当前版本 | 1.0.0 → 1.0.0 |
| `next` | 下一个补丁版本 | 1.0.0 → 1.0.1 |

## 许可证

MIT
