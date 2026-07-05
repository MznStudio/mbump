# mbump

企业级版本管理工具，支持单包和 Monorepo 场景，让版本更新变得简单高效。

## ✨ 功能特性

- **版本管理**：支持 major/minor/patch 递增，以及 pre-release 版本
- **Monorepo 支持**：管理多个包的版本，支持批量更新
- **交互式选择**：可视化选择版本类型，无需记忆命令参数
- **Git 集成**：自动提交、打 Tag、推送到远程仓库
- **CHANGELOG 生成**：根据 Git 提交自动生成更新日志
- **路径模式**：直接指定项目目录，无需配置文件
- **Rust 支持**：更新 Cargo.toml 中的版本号，支持 `cargo publish`
- **包发布**：支持 Node.js（pnpm/npm）和 Rust（cargo）包发布
- **安全检查**：检测未提交更改，防止版本状态不一致
- **Dry-run 模式**：预览将要执行的操作，避免误操作
- **多格式配置**：支持 TS/JS/JSON/YAML/TOML 等多种配置格式

## 📦 安装

### 全局安装（推荐）

```bash
npm install -g @mznjs/mbump
# 或
pnpm add -g @mznjs/mbump
```

### 本地安装

```bash
npm install @mznjs/mbump -D
# 或
pnpm add @mznjs/mbump -D
```

## 🚀 快速开始

### 单包项目（零配置）

```bash
# 升级补丁版本
mbump patch

# 升级小版本
mbump minor

# 升级主版本
mbump major

# 交互式选择版本类型
mbump
```

### 路径模式

```bash
# 更新指定目录下的项目（默认 patch）
mbump ./packages/my-pkg

# 指定版本类型
mbump ./packages/my-pkg minor

# 使用上级目录
mbump ../other-project
```

### Monorepo 项目

创建 `.mbump.config.ts` 配置文件：

```typescript
import type { Config } from '@mznjs/mbump'

export default {
  packagePaths: {
    components: 'packages/components/package.json',
    cli: 'packages/cli/package.json',
    core: 'packages/core/package.json',
  },
} satisfies Config
```

使用命令：

```bash
# 更新指定包
mbump components patch

# 更新所有包
mbump all

# 试运行模式
mbump all minor --dry-run

# 更新并发布所有包
mbump all patch --publish
```

## 📖 使用方法

### 1. 指定包名或路径

```bash
# 使用包名（需要配置文件）
mbump <package-name> <type>

# 使用路径（无需配置文件）
mbump <path> <type>
```

### 2. 版本类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `major` | 主版本号递增 | 1.0.0 → 2.0.0 |
| `minor` | 次版本号递增 | 1.0.0 → 1.1.0 |
| `patch` | 修订号递增 | 1.0.0 → 1.0.1 |
| `pre-major` | 预发布主版本 | 1.0.0 → 2.0.0-beta.0 |
| `pre-minor` | 预发布次版本 | 1.0.0 → 1.1.0-beta.0 |
| `pre-patch` | 预发布修订版 | 1.0.0 → 1.0.1-beta.0 |
| `as-is` | 使用自定义版本 | 指定 customVersion |

### 3. 常用命令示例

```bash
# 更新补丁版本
mbump patch

# 更新指定包的小版本
mbump components minor

# 批量更新所有包
mbump all

# 批量更新所有包到补丁版本
mbump all patch

# 预发布版本
mbump pre-minor

# 试运行模式（预览操作）
mbump components patch --dry-run

# 更新版本并发布
mbump components patch --publish

# 更新版本但不推送到远程
mbump components patch --no-push

# 允许未提交更改的情况下继续
mbump components patch --allow-uncommitted

# 详细输出模式
mbump components patch --verbose
```

### 4. 路径模式详解

路径模式允许直接指定项目目录，无需配置文件：

```bash
# 相对路径
mbump ./packages/my-pkg
mbump ../other-project

# 绝对路径
mbump /path/to/project
mbump C:\Projects\my-app

# 当前目录
mbump .
```

支持的路径格式：

| 格式 | 示例 |
|------|------|
| 相对路径 | `./packages/my-pkg` |
| 上级目录 | `../other-project` |
| 绝对路径 | `/usr/local/project` |
| Windows 路径 | `C:\Projects\app` |
| 用户主目录 | `~/projects/my-app` |
| UNC 路径 | `\\server\share\project` |

### 5. Rust 项目模式

```bash
# 更新当前目录 Rust 项目
mbump --rust patch

# 更新指定目录的 Rust 项目
mbump ./backend -r minor

# 更新并发布到 crates.io
mbump -r patch --publish

# 试运行模式
mbump -r major --dry-run
```

Rust 项目特点：
- 自动检测 `Cargo.toml` 文件
- 使用 `cargo publish` 发布（写死，不可配置）
- Tag 格式为 `{package-name}@{version}`

## ⚙️ 配置文件

### 配置文件格式

支持多种格式，按以下顺序查找：
`.ts` → `.mjs` → `.js` → `.cjs` → `.json` → `.yaml` → `.yml` → `.toml` → `package.json`

### 配置选项

```typescript
import type { Config } from '@mznjs/mbump'

export default {
  packagePaths: {
    default: 'package.json',
    components: 'packages/components/package.json',
  },

  defaults: {
    releaseType: 'patch',
    dryRun: false,
    verbose: false,
    allowUncommitted: false,
    publish: false,
  },

  git: {
    commitMessage: 'chore: bump version to {{newVersion}}',
    push: true,
    autoCommit: true,
    tag: true,
    tagPrefix: 'v',
    changelog: true,
  },

  publish: {
    command: 'pnpm publish --access public --no-git-checks',
    skipChecks: true,
  },
} satisfies Config
```

### 配置项说明

#### packagePaths

包路径映射，键为包名，值为 `package.json` 的相对路径（相对于配置文件所在目录）。

- `default` 键始终指向根目录的 `package.json`
- 即使不配置，系统也会自动使用 `{ default: 'package.json' }`

#### defaults

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `releaseType` | `string` | `'patch'` | 默认版本类型 |
| `dryRun` | `boolean` | `false` | 默认试运行模式 |
| `verbose` | `boolean` | `false` | 默认详细输出 |
| `allowUncommitted` | `boolean` | `false` | 允许未提交更改 |
| `publish` | `boolean` | `false` | 默认启用发布 |

#### git

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `commitMessage` | `string` | `'chore: bump version...'` | 提交消息模板 |
| `push` | `boolean` | `true` | 是否自动推送 |
| `autoCommit` | `boolean` | `true` | 是否自动提交 |
| `tag` | `boolean` | `true` | 是否创建 Tag |
| `tagPrefix` | `string` | `'v'` | Tag 前缀（仅主项目） |
| `changelog` | `boolean` | `true` | 是否生成 CHANGELOG |

#### publish

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `command` | `string` | `'pnpm publish...'` | 发布命令（仅 Node.js 项目） |
| `skipChecks` | `boolean` | `true` | 跳过安全检查 |

**注意**：Rust 项目的发布命令固定为 `cargo publish`，不受此配置影响。

## 📝 命令行选项

```
用法: mbump [package|path] [type] [options]

参数:
  [package]      要更新的包名称或 "all" 更新所有包
  [path]         项目目录路径（支持 ./path, ../path, /path, C:\path）
  [type]         版本升级类型: major, minor, patch, pre-patch, pre-minor, pre-major

选项:
  --dry-run, -d          试运行模式，只显示将要执行的操作
  --verbose, -v          详细输出模式，显示更多执行细节
  --no-commit, -n        禁用自动 Git 提交
  --no-push, -p          禁用自动推送到远程仓库
  --allow-uncommitted, -u 允许在有未提交更改的情况下继续操作
  --publish, -P          启用包发布功能（Node.js 使用 pnpm，Rust 使用 cargo）
  --show-config, -c      显示当前加载的完整配置信息
  --rust, -r             启用 Rust 项目模式
  --version, -V          显示当前版本号
  --help, -h             显示帮助信息
```

## 🏷️ Git Tag 策略

### 主项目包

- **格式**: `{tagPrefix}{version}`
- **示例**: `v1.0.1`, `release-2.0.0`
- **识别条件**: 包名为 `default` 或包路径为根目录的 `package.json`

### 子包

- **格式**: `{package-name}@{version}`
- **示例**: `@my-org/components@1.0.1`, `cli@2.3.0`
- **识别条件**: 所有非主项目包

### Rust 项目

- **格式**: `{package-name}@{version}`
- **示例**: `my-crate@0.1.0`
- **说明**: Rust 项目始终使用子包格式，不使用 tagPrefix

### 批量更新

使用 `mbump all` 时，会为每个包创建独立的 Tag：

```
v1.0.1                    # 主项目包
@my-org/components@1.0.1  # 子包
@my-org/cli@2.3.0         # 子包
```

## 🚀 包发布机制

### Node.js 项目

- 默认命令: `pnpm publish --access public --no-git-checks`
- 可通过配置文件自定义发布命令
- 使用 `--publish` 或 `-P` 启用

### Rust 项目

- 默认命令: `cargo publish`（固定写死，不可配置）
- 使用 `--publish` 或 `-P` 启用
- 发布前确保已登录 crates.io（`cargo login`）

## 📋 Dry-run 模式

Dry-run 模式允许预览将要执行的操作，不实际修改任何文件：

```bash
mbump components patch --dry-run
```

输出示例：

```
🔍 Dry-run 模式 - 以下操作将被执行:

  📦 components
     当前版本: 1.0.0
     新版本:   1.0.1
     Tag:      @my-org/components@1.0.1
     CHANGELOG: 是

     Git Commit: 是
     Git Push: 是
     Publish: 否

✅ 以上为预览，未执行任何实际操作
```

## ⚠️ 未提交更改检测

系统会自动检测未提交的 Git 更改，并提示用户确认：

```bash
mbump components patch
```

输出示例：

```
[warn] 警告: 检测到未提交的Git更改
? 是否继续（dry-run模式不会实际提交更改）? Yes
```

使用 `--allow-uncommitted` 选项跳过确认：

```bash
mbump components patch --allow-uncommitted
```

## 🛠️ 调试与诊断

### 查看配置

```bash
mbump --show-config
```

### 详细日志

```bash
mbump components patch --verbose
```

### 常见错误处理

| 错误 | 解决方案 |
|------|---------|
| 版本已存在 | 删除已有 Tag: `git tag -d v1.0.1` |
| Git 冲突 | 解决冲突后重新运行 |
| NPM 认证失败 | 运行 `pnpm login` 登录 |
| Cargo 认证失败 | 运行 `cargo login` 登录 |
| 包名不存在 | 检查配置文件中的 `packagePaths` |
| 路径不存在 | 确认路径正确，目录存在 |

## 🔌 API 使用

### 核心类

```typescript
import { VersionManager, GitManager, ChangelogManager } from '@mznjs/mbump'
```

### VersionManager

```typescript
import { VersionManager, loadConfigAsync } from '@mznjs/mbump'

const config = await loadConfigAsync(process.cwd())
const manager = new VersionManager({ config, rootDir: process.cwd() })

// 更新版本
const result = await manager.updateVersion('my-package', 'minor', {
  dryRun: false,
  verbose: true,
  autoCommit: true,
  push: true,
  publish: false,
})

// 预览更新
const preview = await manager.previewUpdate('my-package', 'patch')

// 获取包版本
const version = manager.getPackageVersion('my-package')
```

### Rust 项目支持

```typescript
import { VersionManager } from '@mznjs/mbump'

const manager = new VersionManager({
  rootDir: '/path/to/rust-project',
  projectType: 'rust',
  config: {
    packagePaths: {
      'my-crate': '/path/to/rust-project/Cargo.toml',
    },
    git: {
      autoCommit: true,
      push: true,
      tag: true,
    },
  },
})

// 更新版本
const result = await manager.updateVersion('my-crate', 'patch')

// 更新并发布
const result = await manager.updateVersion('my-crate', 'patch', {
  publish: true,
})
```

### GitManager

```typescript
import { GitManager } from '@mznjs/mbump'

const gitManager = new GitManager('/path/to/project')

// 检查未提交更改
const hasChanges = gitManager.hasUncommittedChanges()

// 创建 Tag
await gitManager.createTag('1.0.0', 'v')

// 提交并推送
await gitManager.commitAndPush('chore: bump version', true, true, '1.0.0', 'v')
```

### 工具函数

```typescript
import { pathUtils, semverUtils, securityUtils } from '@mznjs/mbump'

// 路径工具
pathUtils.isPathLike('./packages/my-pkg') // true

// Semver 工具
semverUtils.incrementVersion('1.0.0', 'patch') // '1.0.1'

// 安全工具
securityUtils.validatePath('/project/src', '/project') // true
```

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test tests/integration.test.ts

# 监听模式
pnpm test:watch

# 类型检查
pnpm typecheck
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发要求

- Node.js >= 18.0.0
- 所有测试必须通过
- 代码必须符合 ESLint 规范

## 📄 许可证

MIT License

## 👥 作者

**mznjs Team** - [GitHub](https://github.com/mznjs)

## 🙏 致谢

感谢以下开源项目的支持：
- [semver](https://github.com/npm/node-semver) - 语义化版本解析
- [consola](https://github.com/unjs/consola) - 优雅的日志输出
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - 交互式命令行
- [vitest](https://vitest.dev/) - 快速单元测试框架

---

**mbump** - 让版本管理更简单！🚀