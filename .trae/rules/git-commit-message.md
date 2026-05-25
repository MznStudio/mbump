---
alwaysApply: true
scene: git_message
---

## 行为约束 (Behavior Constraints)
- **语言要求**：提交信息的描述部分统一使用中文。
## 格式标准 (Format Standard)
必须严格遵循 Conventional Commits（约定式提交）规范：
`<类型>(<可选的作用域>): <描述>`

### 1. 类型 (Type) 必须从以下列表中选择：
- `feat`: 新增功能
- `fix`: 修复 Bug
- `docs`: 仅文档变更
- `style`: 代码格式修改（不影响代码逻辑，如空格、分号等）
- `refactor`: 代码重构（既不是新增功能，也不是修复 Bug）
- `perf`: 性能优化
- `test`: 增加或修改测试用例
- `chore`: 构建过程或辅助工具的变动（如依赖升级、脚手架修改）
- `ci`: CI/CD 配置文件或脚本的修改
- `revert`: 回退之前的提交
