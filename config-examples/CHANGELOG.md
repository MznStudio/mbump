# 配置文件示例更新日志

## 2026-05-25 - 修正 publish 配置

### 问题
初始创建的备份文件中，`publish.command` 使用的是 `npm publish`，与项目实际的默认配置不一致。

### 修复
将所有备份文件中的 `publish` 配置更新为与 [schema.ts](../src/config/schema.ts) 中定义的默认值一致：

```javascript
publish: {
  command: 'pnpm publish --access public --no-git-checks',
  skipChecks: true,
}
```

### 更新的文件
- ✅ `.mbump.config.ts.bak`
- ✅ `.mbump.config.mjs.bak`
- ✅ `.mbump.config.js.bak`
- ✅ `.mbump.config.cjs.bak`
- ✅ `.mbump.config.json.bak`
- ✅ `.mbump.config.jsonc.bak`
- ✅ `.mbump.config.yaml.bak`
- ✅ `.mbump.config.yml.bak`
- ✅ `.mbump.config.toml.bak`
- ✅ `package.json.bak`
- ✅ `SUMMARY.md`（文档示例）
- ✅ `USAGE.md`（使用说明）

### 验证
- 所有 13 个文件已确认包含正确的 `pnpm publish` 配置
- 没有文件仍使用旧的 `npm publish` 配置

### 说明
默认配置使用 `pnpm` 是因为本项目使用 pnpm 作为包管理器。如果你的项目使用其他包管理器（npm、yarn），请根据实际情况修改 `publish.command` 字段。

---

**更新人**: AI Assistant  
**更新时间**: 2026-05-25 18:50
