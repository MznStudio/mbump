# 配置文件示例备份

本目录包含所有支持的 mbump 配置文件格式的示例备份。

## 📋 文件格式列表

### 1. TypeScript (.ts.bak)
- **文件**: `.mbump.config.ts.bak`
- **特点**: 提供完整的类型安全，需要 tsx 支持
- **加载方式**: 仅异步加载
- **适用场景**: Monorepo 项目，需要类型检查

### 2. ES Module (.mjs.bak) ⭐ 推荐
- **文件**: `.mbump.config.mjs.bak`
- **特点**: 现代、简洁，使用 `export default`
- **加载方式**: 仅异步加载
- **适用场景**: 现代 Node.js 项目

### 3. JavaScript (.js.bak)
- **文件**: `.mbump.config.js.bak`
- **特点**: 灵活，支持 ES Module 和 CommonJS
- **加载方式**: 异步（优先 ES Module），同步（仅 CommonJS）
- **适用场景**: 通用场景

### 4. CommonJS (.cjs.bak)
- **文件**: `.mbump.config.cjs.bak`
- **特点**: 使用 `module.exports`，兼容性好
- **加载方式**: 异步和同步都支持
- **适用场景**: 需要同步加载的场景

### 5. JSON (.json.bak)
- **文件**: `.mbump.config.json.bak`
- **特点**: 标准 JSON 格式，无注释
- **加载方式**: 异步和同步都支持
- **适用场景**: 简单配置，无需逻辑

### 6. JSONC (.jsonc.bak)
- **文件**: `.mbump.config.jsonc.bak`
- **特点**: 支持注释的 JSON 格式
- **加载方式**: 异步和同步都支持
- **适用场景**: 需要注释说明的配置

### 7. YAML (.yaml.bak)
- **文件**: `.mbump.config.yaml.bak`
- **特点**: 简洁易读，支持注释
- **加载方式**: 异步和同步都支持
- **适用场景**: 人类友好的配置格式

### 8. YML (.yml.bak)
- **文件**: `.mbump.config.yml.bak`
- **特点**: 与 .yaml 完全相同，只是扩展名不同
- **加载方式**: 异步和同步都支持
- **适用场景**: 同 YAML

### 9. TOML (.toml.bak)
- **文件**: `.mbump.config.toml.bak`
- **特点**: 明确的键值对结构
- **加载方式**: 异步和同步都支持
- **适用场景**: 结构化配置

### 10. package.json
- **文件**: `package.json.bak`
- **特点**: 在 package.json 的 `mbump` 字段中配置
- **加载方式**: 异步和同步都支持
- **适用场景**: 单包项目，减少配置文件数量

## 🎯 选择建议

| 场景 | 推荐格式 |
|------|---------|
| 需要类型安全 | `.ts` |
| 现代 Node.js 项目 | `.mjs` ⭐ |
| 最大兼容性 | `.cjs` 或 `.json` |
| 需要同步加载 | `.cjs` 或 `.json` |
| 简单配置 | `.json` 或直接在 `package.json` 中 |
| 人类友好 | `.yaml` 或 `.jsonc` |
| Monorepo 项目 | `.ts` 或 `.mjs` |

## 📝 使用说明

1. 选择一个适合的格式作为模板
2. 复制并重命名为 `.mbump.config.*`（去掉 .bak 后缀）
3. 根据项目需求修改配置内容
4. 确保至少配置了 `packagePaths`

## ⚠️ 注意事项

- 这些是示例文件，不会被自动加载
- 实际使用时需要去掉 `.bak` 后缀
- 配置文件优先级：`.ts` > `.mjs` > `.js` > `.cjs` > `.json` > ...
- 同时支持 `.mbump` 和 `.zbump` 两种前缀

## 🔗 相关文档

- [README.md](../README.md) - 项目主文档
- [配置文件加载规范](../docs/config-loader.md) - 详细的加载逻辑说明
