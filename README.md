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
| `changelog` | `boolean` | `true` | 是否生成 CHANGELOG。**注意**：在 `mbump all` 批量更新时，只有主项目包会生成 CHANGELOG，子包跳过此步骤 |

**Git Tag 策略**：

mbump 根据包的类型采用不同的 Tag 命名策略：

#### 主项目包 (default / root package)
- **Tag 格式**: `{tagPrefix}{version}`
- **使用前缀**: 是（默认 `v`）
- **识别条件**: 包名为 `default` 或包路径为 `package.json`（根目录）
- **示例**: 
  ```bash
  mbump default patch
  # 假设 package.json 中 "name": "@my-org/monorepo"
  # → 创建 Tag: v1.0.1
  
  # 自定义前缀
  mbump default minor
  # 如果配置 git.tagPrefix = "release-"
  # → 创建 Tag: release-1.1.0
  ```

#### 子包 (所有非主项目包)
- **Tag 格式**: `{package-name}@{version}`
- **不使用前缀**: 直接使用 package.json 中的 `name` 字段
- **适用场景**: 
  - 单独更新子包：`mbump components patch`
  - 批量更新所有包：`mbump all`
- **示例**:
  ```bash
  mbump components patch
  # 假设 components/package.json 中 "name": "@my-org/components"
  # → 创建 Tag: @my-org/components@1.0.1
  
  mbump cli minor
  # 假设 cli/package.json 中 "name": "@my-org/cli"
  # → 创建 Tag: @my-org/cli@2.3.0
  ```

#### 批量更新 (mbump all)
当使用 `mbump all` 时，会为每个包创建相应的 Tag：
```bash
mbump all
# → 主项目包: v1.0.1 (使用 tagPrefix)
# → 子包们:
#   - @my-org/components@1.0.1
#   - @my-org/cli@2.3.0
#   - @my-org/core@0.5.2
```

**优势**：
- ✅ 主项目包保持简洁的 `v1.0.1` 格式，符合传统习惯
- ✅ 子包使用清晰的 `{包名}@{版本号}` 格式，便于区分
- ✅ 清晰区分主项目和子包的版本历史
- ✅ 便于单独回滚某个包到特定版本
- ✅ 符合 Monorepo 最佳实践（类似 pnpm、lerna）
- ✅ 支持独立的 CI/CD 流程

#### CHANGELOG 生成策略

mbump 在不同场景下采用不同的 CHANGELOG 生成策略：

**单包更新** (`mbump components patch`)：
- ✅ 为该包生成 CHANGELOG.md
- ✅ 记录从上一个 Tag 到当前的所有 commits
- ✅ **标题格式**: `[package-name@version]`，例如 `[@mznjs/components@1.0.1]`

**批量更新** (`mbump all`)：
- ✅ **主项目包**：生成 CHANGELOG.md（如果 `git.changelog = true`）
- ❌ **子包**：跳过 CHANGELOG 生成，避免重复和混乱

**原因**：
- Monorepo 项目中，所有包的 commits 通常都在同一个仓库中
- 为每个子包单独生成 CHANGELOG 会导致内容重复
- 只在主项目包生成一份完整的 CHANGELOG 更清晰、更易维护

**CHANGELOG 标题格式**：
- **主项目包**: `[v1.0.1]` (使用 tagPrefix)
- **子包**: `[@mznjs/components@1.0.1]` (使用 package.json 的 name 字段)

**示例**：
```bash
# 单包更新 - 会生成 CHANGELOG
mbump components patch
# → CHANGELOG.md 中添加: ## [@mznjs/components@1.0.1] - 2024-01-15 ✅

# 主项目包单独更新
mbump default patch
# → CHANGELOG.md 中添加: ## [v1.0.1] - 2024-01-15 ✅

# 批量更新 - 只有主项目包生成 CHANGELOG
mbump all
# → 主项目包: CHANGELOG.md 中添加: ## [v1.0.1] - 2024-01-15 ✅
# → 子包 components: 子包 components 跳过 CHANGELOG 生成
# → 子包 cli: 子包 cli 跳过 CHANGELOG 生成
```

如需为子包单独生成 CHANGELOG，可以单独更新该包：
```bash
mbump components patch --changelog
```

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

## 🛡️ 批量更新容错处理

`mbump all` 命令具有完善的容错处理机制，确保单个包更新失败不会影响其他包的正常更新。

### 工作原理

1. **错误收集**：每个包的更新操作都被 try-catch 包裹，失败时记录错误但继续处理下一个包
2. **部分成功**：即使部分包失败，成功的包仍然可以完成版本更新、CHANGELOG 生成、Git 提交等操作
3. **统一报告**：所有包处理完成后，统一报告失败的包及其错误信息
4. **独立发布**：NPM 发布阶段也采用相同的容错机制，一个包发布失败不影响其他包

### 使用示例

```bash
# 批量更新所有包
mbump all patch
```

**正常情况输出**：
```bash
✓ 包 components 更新完成
✓ 包 cli 更新完成
✓ 包 core 更新完成
✓ 已提交 3 个包的更改到 Git
✓ 已推送到远程仓库
✅ 版本更新完成
```

**部分失败情况输出**：
```bash
✓ 包 components 更新完成
⚠️ 包 cli 更新失败: Git conflict detected
✓ 包 core 更新完成
✓ 包 utils 更新完成

❌ 批量更新完成，但有 1 个包更新失败:
   - cli: Git conflict detected

💡 提示: 可以单独重试失败的包，或检查错误信息后重新运行

✓ 已提交 3 个包的更改到 Git
✓ 已推送到远程仓库
✅ 版本更新完成
```

### 失败后的处理

如果某个包更新失败，你可以：

1. **查看错误信息**：根据提示的错误信息进行修复
2. **单独重试**：修复后单独更新失败的包
   ```bash
   mbump cli patch
   ```
3. **跳过 NPM 发布**：如果只是想更新版本和提交 Git
   ```bash
   mbump all patch --no-npm
   ```

### 技术细节

- **错误类型**：收集 `Error` 对象，保留完整的错误消息
- **日志级别**：
  - 单个包失败：黄色警告 (`⚠️`)
  - 最终汇总：红色错误 (`❌`)
  - 提示信息：蓝色信息 (`💡`)
- **Git 原子性**：所有成功的包会被一起提交到一个 Git commit 中
- **NPM 独立性**：每个包的 NPM 发布是独立的，互不影响

## 🔍 Dry-run 模式增强

`--dry-run`（或 `-d`）选项允许你在实际执行操作之前预览将要进行的更改。增强后的 dry-run 模式会显示详细的预览信息，帮助你确认操作是否符合预期。

### 单包更新预览

```bash
mbump components patch --dry-run
```

**输出示例**：
```
🔍 Dry-run 模式 - 以下操作将被执行:

  📦 components
     当前版本: 1.0.0
     新版本:   1.0.1
     Tag:      @mznjs/components@1.0.1
     CHANGELOG: 是
     Git Commit: 是
     Git Push: 是
     NPM Publish: 否

✅ 以上为预览，未执行任何实际操作
```

### 批量更新预览

```bash
mbump all minor --dry-run
```

**输出示例**：
```
🔍 Dry-run 模式 - 以下操作将被执行:

  📦 default
     当前版本: 0.0.1
     新版本:   0.1.0
     Tag:      v0.1.0
     CHANGELOG: 是

  📦 components
     当前版本: 1.0.0
     新版本:   1.1.0
     Tag:      @mznjs/components@1.1.0
     CHANGELOG: 跳过（子包或配置禁用）

  📦 cli
     当前版本: 2.0.0
     新版本:   2.1.0
     Tag:      @mznjs/cli@2.1.0
     CHANGELOG: 跳过（子包或配置禁用）

✅ 以上为预览，未执行任何实际操作
```

### 预览信息说明

Dry-run 模式会显示以下关键信息：

1. **📦 包名**：要更新的包名称
2. **当前版本**：包的当前版本号
3. **新版本**：将要升级到的版本号
4. **Tag**：将要创建的 Git Tag 名称
   - 主项目包：`v{version}` 格式
   - 子包：`{package-name}@{version}` 格式
5. **CHANGELOG**：是否会生成 CHANGELOG
   - 主项目包：根据 `git.changelog` 配置
   - 子包：批量更新时跳过，单包更新时生成
6. **Git Commit**：是否会自动提交到 Git（仅单包更新显示）
7. **Git Push**：是否会自动推送到远程仓库（仅单包更新显示）
8. **NPM Publish**：是否会发布到 NPM（仅单包更新显示）

### 使用场景

1. **验证版本计算**：确认新版本号是否正确
2. **检查 Tag 命名**：预览将要创建的 Git Tag 名称
3. **确认操作范围**：了解哪些包会被更新
4. **避免误操作**：在实际执行前发现潜在问题
5. **团队协作**：在 PR 中展示将要进行的更改

### 注意事项

- Dry-run 模式不会修改任何文件
- 不会创建 Git commits 或 tags
- 不会发布到 NPM
- 适合用于 CI/CD 流程中的预检步骤
- 可以与 `--verbose` 结合使用获取更多信息

## ⚠️ 错误提示优化

mbump 提供了友好的错误提示信息，帮助用户快速理解和解决问题。

### 常见错误及解决方案

#### 1. 版本已存在

**错误信息**：
```
⚠️ 版本 v1.0.1 已存在
💡 请使用其他版本号，或运行 git tag -d <tag> 删除已有标签
```

**原因**：尝试创建的 Git Tag 已经存在

**解决方案**：
- 使用不同的版本号
- 或删除已有的 tag：`git tag -d v1.0.1 && git push origin :refs/tags/v1.0.1`

#### 2. Git 冲突

**错误信息**：
```
⚠️ 检测到 Git 冲突
💡 请先解决冲突后重试：git add . && git commit -m "resolve conflicts"
```

**原因**：工作区有未解决的合并冲突

**解决方案**：
- 手动解决冲突
- 提交解决后的更改
- 重新运行 mbump

#### 3. NPM 认证失败

**错误信息**：
```
🔐 NPM 认证失败
💡 请运行 npm login 或 pnpm login 登录后重试
```

**原因**：未登录或登录凭证过期

**解决方案**：
- 运行 `npm login` 或 `pnpm login`
- 输入用户名、密码和邮箱
- 重新运行 mbump

#### 4. NPM 包已存在

**错误信息**：
```
📦 NPM 包已存在或无权限
💡 检查包名是否已被占用，或确认是否有发布权限
```

**原因**：包名已被他人注册，或没有发布权限

**解决方案**：
- 检查包名是否唯一
- 联系包的所有者获取权限
- 或使用 scoped package（如 @my-org/package-name）

#### 5. 网络连接失败

**错误信息**：
```
🌐 网络连接失败
💡 请检查网络连接，或配置 NPM 镜像源
```

**原因**：网络不通或 NPM registry 无法访问

**解决方案**：
- 检查网络连接
- 配置国内镜像源：
  ```bash
  npm config set registry https://registry.npmmirror.com
  # 或
  pnpm config set registry https://registry.npmmirror.com
  ```

#### 6. 文件路径安全

**错误信息**：
```
🔒 检测到不安全的文件路径
💡 请确保配置文件中的路径在项目根目录内
```

**原因**：配置文件中的路径指向项目外部

**解决方案**：
- 检查 `.mbump.config.js` 中的 `packagePaths`
- 确保所有路径都在项目根目录内

#### 7. 无效的包名

**错误信息**：
```
❌ 无效的包名
💡 请检查配置文件中的 packagePaths 是否正确设置
```

**原因**：指定的包名在配置中不存在

**解决方案**：
- 检查 `.mbump.config.js` 中的 `packagePaths` 配置
- 确保包名与配置中的 key 一致

### 调试模式

如果遇到未知错误，可以使用 `DEBUG` 环境变量查看详细信息：

```bash
# Linux/Mac
DEBUG=true mbump components patch

# Windows PowerShell
$env:DEBUG="true"; mbump components patch

# Windows CMD
set DEBUG=true && mbump components patch
```

这将显示完整的错误堆栈信息，便于排查问题。

### 批量更新错误报告

在批量更新模式下，如果部分包失败，会统一报告：

```
❌ 批量更新完成，但有 1 个包更新失败:
   - cli: Git conflict detected

💡 提示: 可以单独重试失败的包，或检查错误信息后重新运行
```

每个失败的包都会显示友好的错误提示和解决方案。

## 📊 进度条显示

在批量更新模式下，mbump 会实时显示更新进度，让你清楚地了解当前处理状态。

### 进度条格式

```
[████████████░░░░░░░░░░░░░░░░░░] 40% | 2/5 | ⟳ components - 处理中
```

**组成部分**：
- **进度条**：`[████████████░░░░░░░░░░░░░░░░░░]` 可视化进度
- **百分比**：`40%` 完成百分比
- **计数**：`2/5` 当前进度/总数
- **状态图标**：
  - `⟳` 处理中
  - `✓` 成功
  - `✗` 失败
- **包名**：当前处理的包名称
- **状态文本**：处理中/完成/失败

### 使用示例

#### 批量更新进度

```bash
mbump all patch
```

**输出示例**：
```
📦 开始批量更新 5 个包...

[██████████████████████████████] 100% | ✓ cli - 完成
[██████████████████████████████] 100% | ✓ components - 完成
[██████████████████████████████] 100% | ✓ core - 完成
[██████████████████████████████] 100% | ✓ theme - 完成
[██████████████████████████████] 100% | ✓ utils - 完成

✅ 版本更新完成
```

#### NPM 发布进度

```bash
mbump all patch --npm
```

**输出示例**：
```
📦 开始批量更新 5 个包...

[██████████████████████████████] 100% | ✓ cli - 完成
[██████████████████████████████] 100% | ✓ components - 完成
...

🚀 开始发布 5 个包到 NPM...

[██████████████████████████████] 100% | ✓ @mznjs/cli - 完成
[██████████████████████████████] 100% | ✓ @mznjs/components - 完成
...

✅ 版本更新完成
```

#### 部分失败情况

```bash
mbump all patch
```

**输出示例**：
```
📦 开始批量更新 5 个包...

[██████████████████████████████] 100% | ✓ cli - 完成
[██████████████████████████████] 100% | ✓ components - 完成
[██████████████████████████████] 100% | ✗ core - 失败
[██████████████████████████████] 100% | ✓ theme - 完成
[██████████████████████████████] 100% | ✓ utils - 完成

❌ 批量更新完成，但有 1 个包更新失败:
   - core: Git conflict detected

💡 提示: 可以单独重试失败的包，或检查错误信息后重新运行
```

### 特性说明

1. **实时更新**：进度条在处理每个包时实时更新
2. **状态反馈**：清晰显示每个包的处理状态（处理中/成功/失败）
3. **视觉友好**：使用 Unicode 字符绘制美观的进度条
4. **自动换行**：每个包处理完成后自动换行，保留历史记录
5. **双阶段进度**：版本更新和 NPM 发布分别显示进度

### 技术实现

- **进度计算**：`(current / total) * 100` 计算百分比
- **进度条渲染**：使用 `█` 和 `░` 字符填充
- **光标控制**：使用 `\r` 回车符实现原地更新
- **状态管理**：维护 processing/success/failed 三种状态

### 注意事项

- 进度条仅在批量更新模式下显示
- 单包更新不使用进度条（因为只有一个包）
- Dry-run 模式不显示进度条（直接显示预览后退出）
- 进度条宽度固定为 30 个字符，适应各种终端宽度

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
