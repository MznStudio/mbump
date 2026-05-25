# mbump

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
npm install -g @mznjs/mbump
```

## 快速开始

### 单包项目

```bash
# 升级补丁版本
mbump patch

# 升级小版本
mbump minor

# 升级主版本
mbump major
```

### Monorepo 项目

创建配置文件 `.mbump.config.json`:

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
mbump all

# 更新指定包
mbump components minor
```

## 命令行参数

```
用法: mbump [package] [type] [options]

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

mbump 支持多种配置格式，并提供灵活的加载策略。

### 支持的配置文件格式

| 格式 | 文件扩展名 | 异步加载 | 同步加载 | 说明 |
|------|-----------|---------|---------|------|
| TypeScript | `.ts` | ✅ | ❌ | 需要 tsx，提供类型安全 |
| ES Module | `.mjs` | ✅ | ❌ | 使用 `export default` |
| JavaScript | `.js` | ✅ | ⚠️ | 优先 ES Module，兼容 CommonJS |
| CommonJS | `.cjs` | ✅ | ✅ | 使用 `module.exports` |
| JSON | `.json`, `.jsonc` | ✅ | ✅ | 标准 JSON 或带注释 JSON |
| YAML | `.yaml`, `.yml` | ✅ | ✅ | YAML 格式 |
| TOML | `.toml` | ✅ | ✅ | TOML 格式 |
| package.json | - | ✅ | ✅ | 在 `mbump` 字段中配置 |

**配置文件前缀**: 支持 `.mbump.config.*` 和 `.zbump.config.*`

### 配置文件优先级

配置加载器会按以下顺序查找配置文件（找到第一个即停止）：

1. TypeScript (`.ts`)
2. ES Module (`.mjs`)
3. JavaScript (`.js`)
4. CommonJS (`.cjs`)
5. JSON (`.json`, `.jsonc`)
6. YAML (`.yaml`, `.yml`)
7. TOML (`.toml`)
8. package.json

### 配置示例

#### ES Module 格式（推荐）

```javascript
// .mbump.config.mjs
export default {
  packagePaths: {
    components: 'packages/components/package.json',
    cli: 'packages/cli/package.json',
  },
  defaults: {
    releaseType: 'patch',
  },
}
```

#### TypeScript 格式

```typescript
// .mbump.config.ts
import type { Config } from '@mznjs/mbump'

export default {
  packagePaths: {
    components: 'packages/components/package.json',
  },
  defaults: {
    releaseType: 'minor',
  },
} satisfies Config
```

#### CommonJS 格式

```javascript
// .mbump.config.cjs
module.exports = {
  packagePaths: {
    components: 'packages/components/package.json',
  },
}
```

#### JSON 格式

```json
{
  "packagePaths": {
    "components": "packages/components/package.json",
    "cli": "packages/cli/package.json"
  },
  "defaults": {
    "releaseType": "patch"
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

#### 函数导出

配置文件也可以导出一个函数，该函数会被自动调用以获取配置：

```javascript
// .mbump.config.js
export default () => ({
  packagePaths: {
    components: 'packages/components/package.json',
  },
})
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `packagePaths` | `Record<string, string>` | - | 包路径映射（必需） |
| `defaults.releaseType` | `string` | `'patch'` | 默认版本类型 |
| `defaults.dryRun` | `boolean` | `false` | 默认试运行模式 |
| `defaults.verbose` | `boolean` | `false` | 默认详细输出 |
| `git.commitMessage` | `string` | `'chore: bump version to {{newVersion}}'` | Git 提交消息模板 |
| `git.push` | `boolean` | `true` | 是否自动推送 |
| `git.autoCommit` | `boolean` | `true` | 是否自动提交 |
| `git.tag` | `boolean` | `true` | 是否创建标签 |
| `git.tagPrefix` | `string` | `'v'` | 标签前缀 |
| `git.changelog` | `boolean` | `true` | 是否生成 CHANGELOG |
| `publish.command` | `string` | `'npm publish'` | 发布命令 |
| `publish.skipChecks` | `boolean` | `false` | 跳过安全检查 |

## API 使用

```typescript
import { VersionManager, loadConfig } from '@mznjs/mbump'

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
