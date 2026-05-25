# 更新日志 (Changelog)

本项目的所有重要变更都将记录在此文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0-beta.1] - 2026-05-25

🚀 新增功能

- feat: 新增TypeScript格式配置文件支持，优化配置加载逻辑

🔧 工具变更

- chore: 更新默认发布配置为pnpm相关参数
- chore: 整理配置文件示例并优化配置加载逻辑

📦 其他变更

- 1. 替换所有示例配置文件中的npm publish为pnpm publish --access public --no-git-checks，同步更新skipChecks为true
- 2. 新增.mbump.config.mjsx和.ts根配置文件，修改原有.mbump.config.mjs为删除
- 3. 在cli输出中新增发布选项的打印逻辑
- 4. 更新USAGE.md文档说明默认包管理器为pnpm，新增注意事项
- 5. 新增配置示例的CHANGELOG.md记录本次更新
- 1. 新增根目录基础配置文件示例
- 2. 新增完整配置示例目录config-examples，包含所有支持的配置格式备份
- 3. 重构配置加载器，调整配置文件加载优先级，完善不同格式配置的加载逻辑
- 4. 为配置加载添加日志提示，优化加载体验
- 1. 新增defineConfig工具函数并导出，支持类型提示
- 2. 扩展配置文件识别，支持.ts后缀的配置文件
- 3. 重构配置加载逻辑，支持调用导出的配置函数
- 4. 优化showConfig命令的输出展示，增加emoji和格式化排版
- 5. 新增多个示例配置文件，包含不同格式和场景
- 6. 替换旧的zbump配置文件为mbump配置文件格式

## [1.0.0-beta.0] - 2026-05-25

🔧 工具变更

- chore: 将项目重命名为mbump

📦 其他变更

- 更新了包名、CLI命令名、配置文件名以及文档中的相关引用，统一项目全量名称为mbump

## [0.1.0-beta.12] - 2026-05-25

🔧 工具变更

- chore(logger): 配置logger实例禁用时间戳

📦 其他变更

- 通过create方法自定义consola实例，关闭日志的时间戳显示，优化日志输出格式

## [0.1.0-beta.11] - 2026-05-25

♻️ 代码重构

- refactor(logger): 替换原生console为consola日志库

📦 其他变更

- 统一项目日志输出工具，将原有的console打印替换为consola，同时保留原有日志接口不变，调整了日志级别配置逻辑，优化空行输出的代码写法

## [0.1.0-beta.10] - 2026-05-25

### 待补充

## [0.1.0-beta.9] - 2026-05-25

🔧 工具变更

- chore(logger): 替换consola为原生console输出

📦 其他变更

- 移除了对consola的依赖，改用原生console打印带标识的日志内容，同时保留了原有接口不破坏调用逻辑

## [0.1.0-beta.8] - 2026-05-25

🔧 工具变更

- chore(logger): 配置consola日志禁用时间戳格式

## [0.1.0-beta.7] - 2026-05-25

🔧 工具变更

- chore(logger): 在日志 spinner 结束后添加空行分隔

📦 其他变更

- 在成功和失败的 spinner 输出后添加空行，优化终端输出的可读性

## [0.1.0-beta.6] - 2026-05-25

♻️ 代码重构

- refactor(logger): 移除日志消息缓冲机制

📦 其他变更

- 移除了原有的消息收集缓存逻辑，直接调用logger输出日志，简化了日志工具的实现流程，删除了不再需要的buffer相关辅助函数

## [0.1.0-beta.5] - 2026-05-25

♻️ 代码重构

- refactor(logger, version-manager): 优化日志收集与输出逻辑

📦 其他变更

- 1. 新增日志缓冲区，在spinner执行期间收集日志并统一输出
- 2. 移除VersionManager中的updateMessages变量，改用日志函数直接输出
- 3. 重构GitManager的代码，简化构造函数和部分方法逻辑
- 4. 调整GitManager部分方法的返回值类型，移除不必要的消息返回

## [0.1.0-beta.4] - 2026-05-25

♻️ 代码重构

- refactor(git): 重构Git操作相关方法以收集执行日志

## [0.1.0-beta.3] - 2026-05-25

♻️ 代码重构

- refactor(VersionManager): 将日志输出改为收集更新消息

## [0.1.0-beta.2] - 2026-05-25

♻️ 代码重构

- refactor(VersionManager): 优化版本更新逻辑的日志收集与输出

💄 代码格式

- style(VersionManager): 修复包名前后的空格不一致问题

## [0.1.0-beta.1] - 2026-05-25

🩹 缺陷修复

- fix(cli): 修复包名在加载提示中的显示格式

🔧 工具变更

- chore(changelog): 移除版本号前缀，优化 changelog 条目格式

## [0.1.0-beta.0] - 2026-05-25

🔧 工具变更

- chore(changelog): 给分类标题前添加前缀1

## [0.0.1-beta.1] - 2026-05-25

🔧 工具变更

- chore(cli): 添加dry-run模式支持，跳过实际提交操作
- chore: update mbump config and settings
- chore: 修正mbump配置文件命名，删除冗余的旧配置文件

📦 其他变更

- ``` feat(cli): 添加显示配置信息功能并移除mbump配置文件

## [0.0.1-beta.0] - 2026-05-25

🚀 新增功能

- feat: 初始化版本管理工具mbump项目

🔧 工具变更

- chore: 项目配置与依赖更新

📦 构建变更

- build: 新增mbump配置和default启动脚本

