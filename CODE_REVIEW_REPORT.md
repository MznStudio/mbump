# 📋 mbump 项目源码分析建议报告

> **分析日期**: 2026-07-06  
> **分析范围**: `src/` 全部 14 个核心模块（约 3,700 行）  
> **严重等级**: 🔴 严重 | 🟠 警告 | 🟡 建议 | 🔵 优化

---

## 一、🔴 安全问题（需立即修复）

### 1.1 命令注入风险 — GitManager 多处拼接用户输入

**涉及文件**: `src/core/GitManager.ts`

| 方法 | 行号 | 风险点 |
|------|------|--------|
| `addFiles()` | L245 | `` `git add ${files.join(' ')}` `` — 文件名含空格或特殊字符时会断裂 |
| `commit()` | L257 | `` `git commit -m \"${message}\"` `` — commit message 来自配置模板，若含双引号会逃逸 |
| `createTag()` | L271 | `` `git tag -a ${tagName}` `` — tagName 含特殊字符时危险 |
| `checkVersionExists()` | L232 | `` `git rev-parse --verify ${tag}` `` — 同上 |
| `getCommitsSinceLastTag()` | L190 | `` `git log ${range}...` `` — range 含 tag 名时可能注入 |
| `push()` | L289+299 | remote/branch 直接拼入命令 |

**现状**: 项目已有 `validateCommand()` (security.ts)，但 **GitManager 完全没有使用它**。

**建议修复方案**:
```typescript
// 使用 execSync 的 args 数组形式替代字符串拼接
import { execSync } from 'node:child_process'

// ❌ 危险写法
execSync(`git add ${files.join(' ')}`, { cwd: this.rootDir })

// ✅ 安全写法
execSync('git add', [...files], { cwd: this.rootDir })
// 或用 node-child-process 的 spawn 等价方式
```

### 1.2 VersionManager 中同样的命令注入

**涉及文件**: `src/core/VersionManager.ts` L597
```typescript
execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { ... })
```
 tagName 来自版本号计算 + 配置的 tagPrefix，虽然通常安全，但应统一防护。

---

## 二、🟠 代码质量问题（影响可维护性）

### 2.1 版本计算逻辑严重重复 — 约 80 行代码复制了 3 次

**涉及文件**: `src/core/VersionManager.ts`

完全相同的 `switch (releaseType)` 版本计算块出现在：
- **L143–198** — `previewUpdate()` 的 `packageVersionSelections` 分支
- **L245–300** — `previewUpdate()` 的普通分支  
- **L383–438** — `updateVersion()` 内部

**三处逻辑完全一致**，任何修改（如新增 releaseType）需要同步改 3 处，极易遗漏。

**建议**: 提取为独立方法：
```typescript
private calculateNewVersion(currentVersion: string, releaseType: ReleaseType): string {
  switch (releaseType) {
    case 'major': case 'minor': case 'patch':
      return incrementVersion(currentVersion, releaseType)!
    // ... 统一一份
  }
}
```

### 2.2 `_isDefaultPackage()` 重复调用 — 相同参数多次计算

**涉及文件**: `src/core/VersionManager.ts`

在 `updateVersion()` 单次执行中，`_isDefaultPackage()` 被调用了 **4 次**，且参数相同：
- L452–454（版本检查时）
- L484–486（CHANGELOG 判断时）
- L559–561（Git commit 时）

每次都重新做路径解析和比较。应缓存结果：
```typescript
const isDefaultPackage = pkgName === 'all'
  ? this._isDefaultPackage(Object.keys(packagePaths)[0])
  : this._isDefaultPackage(pkgName)
// 后续复用 isDefaultPackage 变量
```

### 2.3 `getCommitUrl()` 已成为死代码

**涉及文件**: `src/core/GitManager.ts` L147–158

当前调用方 (`VersionManager.ts:507`) 已切换到 `getCommitRelativePath()`，`getCommitUrl()` 不再被任何地方调用。

**建议**: 删除 `getCommitUrl()` 方法，或在 JSDoc 标记 `@deprecated` 并说明保留原因。

### 2.4 ChangelogManager 排序魔法数组重复

**涉及文件**: `src/core/ChangelogManager.ts`

排序数组 `['🚀', '🩹', '🔥', '♻️', '📝', ...]` 在 `updateChangelog()` 中出现了 **2 次**（L108 和 L136），应提取为类常量：

```typescript
private static readonly TYPE_ORDER = ['🚀', '🩹', '🔥', '♻️', '📝', '💄', '🔧', '📦', '👷', '✅', '⏪', '💥']
```

### 2.5 `detectChangelogFormat()` 缺少返回类型注解

**涉及文件**: `src/core/ChangelogManager.ts` L50
```typescript
detectChangelogFormat(content: string) {  // ← 缺少返回类型
```
IDE 无法推断返回结构，降低类型安全性。

---

## 三、🟡 架构与设计建议

### 3.1 VersionManager 职责过重（God Object 反模式）

**文件**: `src/core/VersionManager.ts`（761 行）

该类同时承担了：
- 版本计算与预览
- 文件读写（package.json / Cargo.toml）
- CHANGELOG 生成
- Git 操作编排
- NPM/Cargo 发布
- 缓存管理

**建议拆分方向**:
```
VersionManager (编排层)
├── VersionCalculator    → 版本计算逻辑（解决 #2.1 重复）
├── PackageWriter        → 文件写入
├── ReleasePublisher     → 发布逻辑
└── (现有) GitManager / ChangelogManager / VersionProvider
```

### 3.2 配置加载器 loader.ts 过于复杂（562 行）

**问题**:
- 手写了 YAML 和 TOML 解析器（各 ~60 行），但解析能力非常有限（不支持嵌套对象、多行字符串等）
- 配置文件优先级列表极长（async 26 种、sync 18 种），且 `.mbump.config.*` 与 `.zbump.config.*` 双前缀并存
- `tryParseYaml()` / `tryParseToml()` 对复杂内容会静默丢失数据

**建议**:
- YAML 用 `js-yaml` 库替代手写解析
- TOML 已有 `toml` 依赖（VersionProvider.ts 在用），loader 应复用
- 考虑废弃 `.zbump.config.*` 兼容别名，减少配置查找数量

### 3.3 错误处理策略不统一

**当前混合了 3 种错误处理方式**:

| 方式 | 位置 | 问题 |
|------|------|------|
| `try/catch + return null/false` | GitManager 大部分方法 | 吞掉错误，调用方无法区分"无远程"和"命令失败" |
| `try/catch + throw new Error` | GitManager.addFiles/commit 等 | 包装了一层，丢失原始堆栈 |
| `try/catch + warn + continue` | VersionManager CHANGELOG 部分 | 静默降级，用户可能不知道 CHANGELOG 生成失败了 |

**建议**: 引入自定义错误类体系：
```typescript
export class MbumpError extends Error {
  constructor(message: public code: ErrorCode, message: string, public cause?: Error) { ... }
}
export enum ErrorCode {
  GIT_NO_REMOTE = 'GIT_NO_REMOTE',
  GIT_COMMAND_FAILED = 'GIT_COMMAND_FAILED',
  VERSION_EXISTS = 'VERSION_EXISTS',
  // ...
}
```

### 3.4 NodeVersionProvider.updateVersion() 会丢失 JSON 格式

**涉及文件**: `src/core/VersionProvider.ts` L29–34
```typescript
updateVersion(filePath: string, newVersion: string): void {
  const content = readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(content) as PackageInfo
  parsed.version = newVersion
  writeFileSync(filePath, JSON.stringify(parsed, null, 2))  // ⚠️
}
```
**问题**: 
- `JSON.parse` → `JSON.stringify` 循环会**丢失所有非 PackageInfo 字段**（如 private、exports、imports、scripts 中的特殊字符转义、注释等）
- 原始文件的键顺序会被打乱
- 尾部逗号风格可能改变

**建议**: 使用 `json5` 或正则替换仅修改 version 字段，保持原文件其余部分不变。

---

## 四、🔵 性能优化建议

### 4.1 getRepoUrl() 重复调用

**涉及文件**: `src/core/GitManager.ts`

`getCommitRelativePath()` (L135) 和 `getCommitUrl()` (L148) 都各自调用 `getRepoUrl()`，而 `getRepoUrl()` 内部又调用 `getDefaultRemote()` → `getCurrentBranch()` → `execSync`。

当对一批 commits 生成链接时（CHANGELOG 可能有几十条），每条 commit 都重复执行 3-4 次 `execSync`。

**建议**: 添加缓存或提供批量方法：
```typescript
private repoUrlCache: string | null = null

getCachedRepoUrl(): string | null {
  if (!this.repoUrlCache) {
    this.repoUrlCache = this.getRepoUrl()
  }
  return this.repoUrlCache
}
```

### 4.2 semver.ts 每次 parseVersion 都创建新对象

**涉及文件**: `src/utils/semver.ts`

`getMajor/getMinor/getPatch` 各自调用 `semver.parse(version)`，如果连续调用这 3 个方法（如 pre-minor 判断逻辑中），会解析 3 次。

**建议**: 提供复合方法或缓存 SemVer 对象：
```typescript
export function parseVersionInfo(version: string): { major: number; minor: number; patch: number } | null {
  const parsed = semver.parse(version)
  if (!parsed) return null
  return { major: parsed.major, minor: parsed.minor, patch: parsed.patch }
}
```

### 4.3 package.json 查找路径过多

**涉及文件**: `src/cli/index.ts` L37–41
```typescript
const possiblePaths = [
  join(__dirname, '..', '..', 'package.json'),
  join(__dirname, '..', 'package.json'),
  join(process.cwd(), 'package.json'),
]
```
遍历 3 个路径读取文件来获取自身版本号。应在构建时注入版本号（如通过 esbuild define 或 tsdown replace）。

---

## 五、📝 其他发现

### 5.1 注释掉的遗留代码

**文件**: `src/cli/interactive.ts` L19–20
```typescript
// const { readFileSync } = require('node:fs')
// const { _join, resolve } = require('node:path')
```
应清理。

### 5.2 `gitPush` 字段声明后未使用

**文件**: `src/core/VersionManager.ts` L19
```typescript
private gitPush: boolean  // ← 声明了但从未读取
```
实际 push 判断用的是 `this.gitConfig.push !== false`。

### 5.3 `color` 字段从未被消费

**文件**: `src/types/index.ts` L150–154
```typescript
export interface ChangelogTypeConfig {
  title: string
  emoji: string
  color: string   // ← 定义了但从未用于渲染
}
```
TYPE_CONFIG 中每个类型都有 color，但 CHANGELOG 生成时完全没有用到颜色信息。要么实现彩色输出，要么移除以减少混淆。

### 5.4 parser.ts 类型断言过多

**文件**: `src/cli/parser.ts` L13–14, L19–21
```typescript
autoCommit: (defaults as any).git?.autoCommit !== false,
push: (defaults as any).git?.push !== false,
```
用 `(defaults as any)` 绕过类型检查，说明 `DefaultsConfig` 类型定义缺少 git 子字段。应扩展 `DefaultsConfig` 类型或重构默认值传递方式。

### 5.5 security.ts 的 validateCommand 正则有缺陷

**文件**: `src/utils/security.ts` L10–15
```typescript
/;\s*[a-z0-9]/i    // 会误杀合法路径中的分号（Windows 驱动号 C:\path）
/\|\|\s*[a-z0-9]/i  // 和下一行 /\|\s*[a-z0-9]/i 功能重叠
```
且该方法在整个项目中**只有一处调用**（publish 命令验证），GitManager 的所有 execSync 完全没有经过校验。

---

## 六、🎯 优先级行动建议

| 优先级 | 编号 | 改进项 | 工作量 | 影响范围 |
|--------|------|--------|--------|----------|
| P0 | #1.1 | 修复 GitManager 命令注入 | 半天 | 安全性 |
| P0 | #2.1 | 提取版本计算方法消除 3 次复制 | 1 小时 | 可维护性 |
| P1 | #2.2 | 缓存 _isDefaultPackage 结果 | 15 分钟 | 性能/整洁度 |
| P1 | #3.4 | 修复 updateVersion 丢失 JSON 字段 | 2 小时 | 数据安全 |
| P1 | #3.3 | 统一错误处理策略 | 半天 | 可调试性 |
| P2 | #2.3 | 清理死代码 getCommitUrl | 5 分钟 | 整洁度 |
| P2 | #2.4 | 提取排序常量 | 10 分钟 | 整洁度 |
| P2 | #5.2 | 移除未使用的 gitPush 字段 | 1 分钟 | 整洁度 |
| P2 | #5.3 | 移除或实现 color 字段 | 15 分钟 | API 设计 |
| P3 | #3.1 | 拆分 VersionManager | 1-2 天 | 架构 |
| P3 | #3.2 | 重构配置加载器 | 1 天 | 架构 |
| P3 | #4.1 | getRepoUrl 结果缓存 | 30 分钟 | 性能 |

---

## 七、总结评价

### ✅ 项目亮点
- **多格式配置支持完善**: 支持 TS/JS/MJS/CJS/JSON/YAML/TOML/package.json 共 8 种格式
- **多平台 Git 托管兼容**: GitHub/GitLab/Bitbucket/Gitee/Coding/自托管 全覆盖
- **Monorepo 友好**: 支持子包版本管理和批量更新
- **交互体验好**: inquirer 交互式选择 + dry-run 预览 + 友好的错误提示
- **Rust 支持**: 同时支持 Node.js 和 Cargo 项目

### ⚠️ 主要风险
1. **安全问题突出**: 大量 `execSync` 字符串拼接未做输入净化
2. **代码重复度高**: 版本计算逻辑复制 3 份，修改极易遗漏
3. **核心操作不安全**: `updateVersion` 会破坏 package.json 原有格式

### 📊 代码健康度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | ⭐⭐☆☆☆ | 命令注入风险多处存在 |
| 可维护性 | ⭐⭐⭐☆☆ | 有明显重复代码和死代码 |
| 可扩展性 | ⭐⭐⭐⭐☆ | Provider 模式设计良好，架构清晰 |
| 类型安全 | ⭐⭐⭐☆☆ | 有类型定义但有 any 断言和缺失注解 |
| 测试覆盖 | ⭐⭐⭐☆☆ | 有测试但覆盖面待确认 |
| **综合** | **⭐⭐⭐☆☆** | **功能完整，需重点加固安全和去重** |

---

*报告完成 — 基于 src/ 全部 14 个源码文件的静态分析*
