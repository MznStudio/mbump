# mbump

企业级版本管理工具，支持单包和 monorepo 场景。

## ✨ 功能特性

- ✅ 基础版本递增 (major/minor/patch)
- ✅ 预发布版本支持 (pre-patch/pre-minor/pre-major)
- ✅ 自定义版本号输入
- ✅ CHANGELOG 自动生成
- ✅ Git Tag 管理（支持自定义前缀）
- ✅ Git 自动提交和推送
- ✅ 多包管理 (monorepo)
- ✅ **交互式版本选择** - 可视化选择版本类型
- ✅ 试运行模式 (dry-run)
- ✅ NPM/PNPM 发布支持
- ✅ **多格式配置文件支持** (TS/JS/JSON/YAML/TOML)
- ✅ 智能配置加载（支持异步/同步）
- ✅ 未提交更改检测与处理
- ✅ 详细日志输出模式

## 📦 安装

```bash
npm install -g @mznjs/mbump
# 或
pnpm add -g @mznjs/mbump
```

## 🚀 快速开始

### 单包项目

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
# 更新所有包（交互式选择每个包的版本）
mbump all

# 更新指定包
mbump components minor

# 试运行模式（不实际执行）
mbump components minor --dry-run

# 更新版本并发布到 npm/pnpm
mbump components patch --npm
```

## 💻 命令行参数

```
用法: mbump [package] [type] [options]

参数:
  [package]      要更新的包名称或 "all" 更新所有包
  [type]         版本升级类型: major, minor, patch, pre-patch, pre-minor, pre-major

选项:
  --dry-run, -d          试运行模式，只显示将要执行的操作
  --verbose, -v          详细输出模式，显示更多执行细节
  --no-commit, -n        禁用自动git提交
  --no-push, -p          禁用自动推送到远程仓库
  --allow-uncommitted, -u  允许在有未提交更改的情况下继续操作
  --npm                  启用npm/pnpm包发布功能（默认不发布）
  --show-config          显示当前加载的完整配置信息
  --help, -h             显示此帮助信息

示例:
  mbump components patch              # 将components包升级一个补丁版本
  mbump all minor                     # 将所有包升级一个小版本
  mbump plugins major --dry-run       # 试运行升级plugins包主版本
  mbump core patch --no-push          # 更新版本并提交到本地，但不推送到远程
  mbump components patch --npm        # 更新版本并发布到npm/pnpm
  mbump                               # 交互式选择包和版本类型
  mbump --show-config                 # 查看当前配置
```

## ⚙️ 配置文件

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

#### ES Module 格式（推荐）⭐

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

#### YAML 格式

```yaml
# .mbump.config.yaml
packagePaths:
  components: packages/components/package.json
  cli: packages/cli/package.json

defaults:
  releaseType: patch

git:
  commitMessage: "chore: bump version to {{newVersion}}"
  push: true
  autoCommit: true
  tag: true
  tagPrefix: v
  changelog: true

publish:
  command: "pnpm publish --access public --no-git-checks"
  skipChecks: true
```

#### TOML 格式

```toml
# .mbump.config.toml
[packagePaths]
components = "packages/components/package.json"
cli = "packages/cli/package.json"

[defaults]
releaseType = "patch"

[git]
commitMessage = "chore: bump version to {{newVersion}}"
push = true
autoCommit = true
tag = true
tagPrefix = "v"
changelog = true

[publish]
command = "pnpm publish --access public --no-git-checks"
skipChecks = true
```

#### package.json 格式

```json
{
  "name": "my-monorepo",
  "version": "1.0.0",
  "mbump": {
    "packagePaths": {
      "components": "packages/components/package.json",
      "cli": "packages/cli/package.json"
    }
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

### 配置选项详解

#### 根选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `packagePaths` | `Record<string, string>` | `{ default: 'package.json' }` | 包路径映射（必需） |

#### defaults 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `releaseType` | `string` | `'patch'` | 默认版本类型 |
| `dryRun` | `boolean` | `false` | 默认试运行模式 |
| `verbose` | `boolean` | `false` | 默认详细输出 |
| `allowUncommitted` | `boolean` | `false` | 允许未提交更改 |
| `npm` | `boolean` | `false` | 默认启用发布 |

#### git 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `commitMessage` | `string` | `'chore: bump version to {{newVersion}}'` | Git 提交消息模板（支持 `{{newVersion}}` 占位符） |
| `push` | `boolean` | `true` | 是否自动推送到远程仓库 |
| `autoCommit` | `boolean` | `true` | 是否自动提交更改 |
| `tag` | `boolean` | `true` | 是否创建 Git 标签 |
| `tagPrefix` | `string` | `'v'` | 标签前缀（如 `v1.0.0`）。**注意**：仅主项目包使用此配置，子包使用 `{包名}@{版本号}` 格式 |
| `changelog` | `boolean` | `true` | 是否生成 CHANGELOG |

**Git Tag 策略**：

mbump 根据包的类型采用不同的 Tag 命名策略：

#### 主项目包 (default / root package)
- **Tag 格式**: `{tagPrefix}{version}`
- **使用前缀**: 是（默认 `v`）
- **示例**: 
  ```bash
  mbump default patch
  # → 创建 Tag: v1.0.1
  ```

#### 子包 (所有非主项目包)
- **Tag 格式**: `{package-name}@{version}`
- **不使用前缀**: 直接使用 package.json 中的 name 字段
- **适用场景**: 
  - 单独更新子包：`mbump components patch`
  - 批量更新所有包：`mbump all`
- **示例**:
  ```bash
  mbump components patch
  # → 创建 Tag: components@1.0.1
  
  mbump all
  # → 为每个子包创建独立 Tag:
  #   - components@1.0.1
  #   - cli@2.3.0
  #   - core@0.5.2
  ```

**优势**：
- ✅ 主项目包保持简洁的 `v1.0.1` 格式
- ✅ 子包使用清晰的 `{包名}@{版本号}` 格式，便于区分
- ✅ 符合 Monorepo 最佳实践（类似 pnpm、lerna）
- ✅ 支持独立的版本追踪和回滚

#### publish 选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `command` | `string` | `'pnpm publish --access public --no-git-checks'` | 发布命令 |
| `skipChecks` | `boolean` | `true` | 跳过安全检查 |

### 配置最佳实践

#### 单包项目

```json
{
  "packagePaths": {
    "default": "package.json"
  }
}
```

#### Monorepo 项目

```javascript
// .mbump.config.mjs
export default {
  packagePaths: {
    // 核心包
    core: 'packages/core/package.json',
    // UI 组件库
    components: 'packages/components/package.json',
    // CLI 工具
    cli: 'packages/cli/package.json',
    // 插件系统
    plugins: 'packages/plugins/package.json',
  },
  defaults: {
    releaseType: 'patch',
    verbose: false,
  },
  git: {
    commitMessage: 'chore(release): bump {{name}} to {{newVersion}}',
    tagPrefix: '',
  },
  publish: {
    command: 'pnpm publish --access public --no-git-checks',
    skipChecks: true,
  },
}
```

## 🔌 API 使用

```typescript
import { VersionManager, loadConfig, loadConfigAsync } from '@mznjs/mbump'

// 异步加载配置（推荐）
const config = await loadConfigAsync(process.cwd())
const manager = new VersionManager({ config, rootDir: process.cwd() })

// 同步加载配置
const config = loadConfig(process.cwd())
const manager = new VersionManager({ config, rootDir: process.cwd() })

// 更新单个包版本
const result = await manager.updateVersion('my-package', 'minor', {
  dryRun: false,
  verbose: true,
  autoCommit: true,
  push: true,
  npm: false,
})

console.log(result.updatedPackages)
// [
//   {
//     name: 'my-package',
//     oldVersion: '1.0.0',
//     newVersion: '1.1.0'
//   }
// ]

// 获取包当前版本
const version = manager.getPackageVersion('my-package')
console.log(version) // '1.0.0'

// 手动提交和推送
await manager.gitCommitAndPush(true) // true = 推送到远程
```

## 📊 版本类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `major` | 主版本升级（破坏性变更） | 1.0.0 → 2.0.0 |
| `minor` | 次版本升级（新功能） | 1.0.0 → 1.1.0 |
| `patch` | 补丁版本升级（bug 修复） | 1.0.0 → 1.0.1 |
| `next` | 下一个补丁版本（同 patch） | 1.0.0 → 1.0.1 |
| `conventional` | 约定式版本（同 patch） | 1.0.0 → 1.0.1 |
| `pre-patch` | 预发布补丁版本 | 1.0.0 → 1.0.1-beta.0 |
| `pre-minor` | 预发布次版本 | 1.0.0 → 1.1.0-beta.0 |
| `pre-major` | 预发布主版本 | 1.0.0 → 2.0.0-beta.0 |
| `as-is` | 保持当前版本不变 | 1.0.0 → 1.0.0 |
| `custom` | 自定义版本号 | 1.0.0 → 任意有效版本 |

## 🎯 使用场景

### 场景 1: 日常开发

```bash
# 修复 bug 后发布补丁版本
mbump patch

# 添加新功能后发布小版本
mbump minor

# 重大重构后发布主版本
mbump major
```

### 场景 2: 预发布测试

```bash
# 创建 beta 版本进行测试
mbump pre-minor

# 创建 rc 版本（需要自定义）
mbump custom
# 输入: 1.0.0-rc.1
```

### 场景 3: Monorepo 批量更新

```bash
# 交互式选择每个包的版本
mbump all

# 统一升级所有包的补丁版本
mbump all patch

# 试运行查看将要执行的变更
mbump all minor --dry-run
```

### 场景 4: CI/CD 自动化

```bash
# 在 CI 环境中自动发布
mbump components patch --npm --no-commit

# 跳过未提交检查
mbump core minor --allow-uncommitted
```

## 🔍 调试与诊断

### 查看详细日志

```bash
mbump components patch --verbose
```

### 查看当前配置

```bash
mbump --show-config
```

输出示例：
```
📋 当前加载的配置:

  配置文件: .mbump.config.mjs

📦 包路径:
  components: package.json
  cli: packages/cli/package.json

⚙️  默认选项:
  releaseType: patch
  dryRun: false
  verbose: false
  allowUncommitted: false
  npm: false

🔧 Git 选项:
  commit: true
  push: true
  tag: true
  changelog: true

🚀 发布选项:
  command: pnpm publish --access public --no-git-checks
  skipChecks: true
```

### 试运行模式

```bash
# 预览将要执行的操作，不实际修改文件
mbump components minor --dry-run
```

## 🏷️ Git Tag 策略详解

mbump 采用智能的 Git Tag 策略，根据包的类型自动选择合适的命名格式：

### 主项目包 (default / root package)

主项目包通常对应根目录的 `package.json`，配置为 `"default": "package.json"`。

```bash
mbump default patch
# 或简写为
mbump patch  # 如果默认包名为 default
```

**Tag 格式**：`{tagPrefix}{version}`
- 默认前缀：`v`
- 示例：`v1.0.1`, `v2.3.0`, `release-3.0.0`

**行为**：
- ✅ 自动创建带注释的 Git Tag
- ✅ 推送到远程仓库（如果 `git.push = true`）
- ✅ 使用配置的 `tagPrefix`（可通过 `git.tagPrefix` 自定义）

**自定义前缀示例**：
```json
{
  "git": {
    "tagPrefix": "release-"
  }
}
```
```bash
mbump default minor
# → 创建 Tag: release-1.1.0
```

---

### 子包 (所有非主项目包)

子包包括所有在 `packagePaths` 中配置的非主项目包。

#### 单独更新子包

```bash
mbump components patch
mbump cli minor
```

**Tag 格式**：`{package-name}@{version}`
- **不使用** `tagPrefix` 配置
- 直接使用 `package.json` 中的 `name` 字段
- 为更新的包创建独立标签

**示例**：
```bash
mbump components patch
# 假设 components/package.json 中 "name": "@my-org/components"
# → 创建 Tag: @my-org/components@1.0.1

mbump cli minor
# 假设 cli/package.json 中 "name": "@my-org/cli"
# → 创建 Tag: @my-org/cli@2.3.0
```

---

#### Monorepo 批量更新

```bash
mbump all
```

**Tag 格式**：`{package-name}@{version}`
- 不使用 `tagPrefix` 配置
- 为每个更新的**子包**创建独立标签
- **主项目包**仍然使用 `{tagPrefix}{version}` 格式

**示例**：
假设有以下包被更新：
- `default` (主项目): 1.0.0 → 1.0.1
- `components`: 1.0.0 → 1.0.1
- `cli`: 2.2.0 → 2.3.0
- `core`: 0.5.1 → 0.5.2

将创建以下 Tags：
```
v1.0.1                    # 主项目包，使用 tagPrefix
components@1.0.1          # 子包
cli@2.3.0                 # 子包
core@0.5.2                # 子包
```

**优势**：
- ✅ 清晰区分主项目和子包的版本历史
- ✅ 主项目保持简洁的 `v1.0.1` 格式
- ✅ 子包使用明确的 `{包名}@{版本号}` 格式
- ✅ 便于单独回滚某个包到特定版本
- ✅ 符合 Monorepo 最佳实践（类似 pnpm、lerna）
- ✅ 支持独立的 CI/CD 流程

---

### Git 操作示例

```bash
# 查看所有 tags
git tag -l

# 查看主项目的 tags
git tag -l "v*"

# 查看特定子包的 tags
git tag -l "components@*"

# 查看所有子包的 tags
git tag -l "*@*"

# 检出主项目的特定版本
git checkout v1.0.1

# 检出子包的特定版本
git checkout components@1.0.1

# 推送所有 tags
git push --tags
```

---

### 禁用 Tag 创建

如果不需要自动创建 Tag，可以在配置中禁用：

```json
{
  "git": {
    "tag": false
  }
}
```

这将禁用所有包（包括主项目和子包）的自动 Tag 创建。

---

### 注意事项

1. **主项目包识别**：系统通过以下方式判断是否为主项目包：
   - 包名为 `default`
   - 或者包路径为 `package.json`（根目录）

2. **子包命名**：子包的 Tag 名称直接来自其 `package.json` 中的 `name` 字段，可能包含 scope（如 `@my-org/components`）

3. **Tag 唯一性**：Git 要求所有 Tag 名称唯一，因此不同包即使版本号相同，也会因为包名不同而产生不同的 Tag

4. **批量更新行为**：使用 `mbump all` 时，所有更改会在一次 commit 中提交，然后为每个包创建独立的 Tag

## ⚠️ 注意事项

1. **Git 要求**: 确保项目在 Git 仓库中，且已配置用户信息
2. **未提交更改**: 默认情况下，存在未提交更改时会提示确认
3. **配置文件**: 至少需要配置 `packagePaths`，其他选项可使用默认值
4. **Node 版本**: 需要 Node.js >= 18.0.0
5. **包管理器**: 默认使用 pnpm 发布，可在配置中修改为 npm 或 yarn
6. **TypeScript 配置**: `.ts` 格式需要安装 `tsx` 依赖
7. **ES Module**: `.mjs` 格式仅支持异步加载

## 📚 更多资源

- [配置示例](./config-examples/) - 各种格式的配置文件示例
- [CHANGELOG](./CHANGELOG.md) - 版本更新历史
- [GitHub Issues](https://github.com/mznjs/mbump/issues) - 问题反馈

## 📄 许可证

MIT © mznjs

```
