# 配置文件示例使用指南

## 📦 快速开始

### 1. 选择配置格式

根据你的项目需求，从 `config-examples/` 目录中选择合适的配置格式：

```bash
# 查看所有可用的配置格式
ls config-examples/*.bak
```

### 2. 复制配置文件

```bash
# 例如：使用推荐的 .mjs 格式
cp config-examples/.mbump.config.mjs.bak .mbump.config.mjs

# 或者使用 TypeScript 格式
cp config-examples/.mbump.config.ts.bak .mbump.config.ts

# 或者使用 JSON 格式
cp config-examples/.mbump.config.json.bak .mbump.config.json
```

### 3. 修改配置

编辑复制的配置文件，根据项目实际情况修改：

- `packagePaths`: 你的包路径
- `defaults`: 默认选项
- `git`: Git 相关配置
- `publish`: 发布配置

### 4. 验证配置

```bash
# 查看当前加载的配置
pnpm dev --show-config

# 或运行试运行模式
pnpm dev all patch --dry-run
```

## 🎯 格式选择建议

### 推荐场景

| 项目类型 | 推荐格式 | 原因 |
|---------|---------|------|
| **现代 Node.js 项目** | `.mjs` ⭐ | 简洁、现代、原生支持 |
| **Monorepo 项目** | `.ts` | 类型安全、IDE 支持好 |
| **简单单包项目** | `.json` | 无需额外依赖，简单直接 |
| **需要注释** | `.jsonc` 或 `.yaml` | 可以添加说明注释 |
| **最大兼容性** | `.cjs` | 兼容老版本 Node.js |
| **嵌入式配置** | `package.json` | 减少文件数量 |

### 加载方式对比

| 格式 | 异步加载 | 同步加载 | 类型安全 | 需要额外依赖 |
|------|---------|---------|---------|------------|
| `.ts` | ✅ | ❌ | ✅ | tsx |
| `.mjs` | ✅ | ❌ | ❌ | 无 |
| `.js` | ✅ | ⚠️ | ❌ | 无 |
| `.cjs` | ✅ | ✅ | ❌ | 无 |
| `.json` | ✅ | ✅ | ❌ | 无 |
| `.jsonc` | ✅ | ✅ | ❌ | 无 |
| `.yaml` | ✅ | ✅ | ❌ | 无 |
| `.yml` | ✅ | ✅ | ❌ | 无 |
| `.toml` | ✅ | ✅ | ❌ | 无 |

## 📝 配置项说明

### packagePaths（必需）

定义项目中各个包的路径：

```javascript
{
  packagePaths: {
    // 键：包的名称（用于命令行指定）
    // 值：package.json 的路径（相对于项目根目录）
    components: 'packages/components/package.json',
    cli: 'packages/cli/package.json',
    default: 'package.json',  // 主包
  }
}
```

### defaults（可选）

设置默认行为：

```javascript
{
  defaults: {
    releaseType: 'patch',        // 默认版本类型
    dryRun: false,               // 默认是否试运行
    verbose: false,              // 默认是否详细输出
    allowUncommitted: false,     // 是否允许未提交更改
    npm: false,                  // 是否默认发布到 npm
  }
}
```

### git（可选）

Git 相关配置：

```javascript
{
  git: {
    commitMessage: 'chore: bump version to {{newVersion}}',  // 提交消息模板
    push: true,                    // 是否自动推送
    autoCommit: true,              // 是否自动提交
    tag: true,                     // 是否创建标签
    tagPrefix: 'v',                // 标签前缀
    changelog: true,               // 是否生成 CHANGELOG
  }
}
```

### publish（可选）

发布配置：

```javascript
{
  publish: {
    command: 'pnpm publish --access public --no-git-checks',  // 默认发布命令
    skipChecks: true,              // 默认跳过安全检查
  }
}
```

**注意**: 默认使用 `pnpm` 作为包管理器，如果你的项目使用 `npm` 或 `yarn`，请相应修改 `command` 字段。

## 🔧 高级用法

### 函数导出

配置文件可以导出一个函数，实现动态配置：

```javascript
// .mbump.config.js
export default () => {
  const isCI = process.env.CI === 'true'
  
  return {
    packagePaths: {
      default: 'package.json',
    },
    defaults: {
      dryRun: isCI,  // CI 环境默认试运行
    },
  }
}
```

### 条件配置

``typescript
// .mbump.config.ts
import type { Config } from '@mznjs/mbump'

const config: Config = {
  packagePaths: {
    default: 'package.json',
  },
}

// 根据环境变量调整配置
if (process.env.NODE_ENV === 'production') {
  config.defaults = {
    ...config.defaults,
    npm: true,
  }
}

export default config
```

## ⚠️ 注意事项

1. **配置文件优先级**: 如果有多个配置文件，只会加载优先级最高的那个
2. **路径解析**: 相对路径会相对于项目根目录解析
3. **最小配置**: 至少需要配置 `packagePaths`
4. **备份文件**: `.bak` 文件不会被自动加载，仅作为示例
5. **同步限制**: `.ts` 和 `.mjs` 格式不支持同步加载

## 🆘 常见问题

### Q: 为什么我的配置没有生效？

A: 检查以下几点：
1. 配置文件名是否正确（去掉 `.bak` 后缀）
2. 是否有更高优先级的配置文件存在
3. 配置格式是否正确（JSON 不能有注释等）
4. 运行 `pnpm dev --show-config` 查看实际加载的配置

### Q: 如何同时支持 .mbump 和 .zbump 前缀？

A: 两者完全等价，可以任选其一。如果同时存在，`.mbump` 优先级更高。

### Q: TypeScript 配置报错怎么办？

A: 确保已安装 `tsx`：
```bash
pnpm add -D tsx
```

### Q: 可以在 package.json 和其他配置文件同时配置吗？

A: 可以，但只会加载优先级最高的那个配置文件。

## 📚 更多信息

- [README.md](../README.md) - 项目主文档
- [SUMMARY.md](./SUMMARY.md) - 备份文件总结
- [配置文件加载规范](../docs/config-loader.md) - 详细的加载逻辑

---

**提示**: 这些备份文件是静态示例，不会被自动加载。使用时请复制到项目根目录并去掉 `.bak` 后缀。
