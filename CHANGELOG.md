# 更新日志 (Changelog)

本项目的所有重要变更都将记录在此文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.1.6-0] - 2026-07-04

🚀 新增功能

- 447c6124e5817c7ff11e33b3801402e236aba213 feat(changelog): 新增commit hash展示到变更日志 (CHANGELOG.md, ChangelogManager.ts, GitManager.ts, index.ts)

## [2.1.5] - 2026-07-04

🚀 新增功能

- 6ab62173f0a0f8e7e8a0a0b0c0d0e0f0a0b0c0d0e feat(cli): 添加未提交Git更改检测与处理逻辑 (README.md, index.ts)
- e6726cd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0 feat: 新增tag、changelog相关参数与错误提示优化 (index.ts, parser.ts, VersionManager.ts, index.ts)

## [2.1.4] - 2026-07-04

### 待补充

## [2.1.3] - 2026-07-04

### 待补充

## [utils@0.0.3] - 2026-07-04

### 待补充

## [utils@0.0.2] - 2026-07-04

### 待补充

## [utils@0.0.1] - 2026-07-04

🔧 工具变更

- chore(rust-test): 初始化版本发布相关配置与更新日志 (.mbump.config.json.bak, CHANGELOG.md)

## [2.1.2] - 2026-07-04

### 待补充

## [2.1.1] - 2026-07-04

♻️ 代码重构

- refactor(cli): 移除重复的版本计算逻辑 (index.ts)
- refactor: 重构版本管理逻辑，新增预览更新功能 (README.md, Cargo.toml, index.ts, parser.ts, VersionManager.ts, index.ts, index.ts, path.ts, semver.ts)

## [2.1.1-beta.2] - 2026-07-04

📝 文档更新

- docs(cli): 更新文档并实现Rust项目指定目录支持 (README.md, index.ts)

## [2.1.1-beta.1] - 2026-07-04

### 待补充

## [2.1.1-beta.0] - 2026-07-04

🚀 新增功能

- feat(cli): 新增 Rust 项目版本更新支持 (README.md, package.json, pnpm-lock.yaml, index.ts, parser.ts, RustManager.ts, index.ts)

## [2.1.0] - 2026-07-04

🚀 新增功能

- feat(cli): 优化路径支持与命令行参数，新增更多路径格式和快捷参数 (README.md, index.ts, parser.ts)

## [2.0.4] - 2026-07-04

🚀 新增功能

- feat(cli): 新增--version/-V参数用于显示版本信息 (index.ts, parser.ts, index.ts)

## [2.0.4-beta.1] - 2026-07-04

♻️ 代码重构

- refactor(cli): 重构参数解析和配置加载逻辑 (index.ts)

## [2.0.4-beta.0] - 2026-07-04

🚀 新增功能

- feat(cli): 新增路径模式支持，允许直接指定项目目录更新版本 (README.md, index.ts, parser.ts, index.ts)

## [2.0.3] - 2026-07-04

♻️ 代码重构

- refactor(config,cli): 重构包路径处理逻辑，新增路径校验 (package.json, index.ts, loader.ts, VersionManager.ts, integration.test.ts)

## [2.0.2] - 2026-05-26

🔧 工具变更

- chore(.cnb.yml): 移除dry_run配置项 (.cnb.yml)

## [2.0.2-beta.2] - 2026-05-26

🔧 工具变更

- chore(.cnb.yml): 移除不必要的folder配置项 (.cnb.yml)
- chore(.cnb.yml): 修正npm同步配置的邮箱和目录参数 (.cnb.yml)
- chore(.cnb.yml): 移除多余的folder配置项 (.cnb.yml)
- chore(.cnb.yml): add folder configuration for npm publish (.cnb.yml)
- chore(.cnb.yml): 配置dry_run为true并调整部署目录 (.cnb.yml)

## [2.0.2-beta.1] - 2026-05-26

🔧 工具变更

- chore(package): 更新@mznjs/eslint-config依赖到0.0.6版本 (package.json, pnpm-lock.yaml)
- chore(.cnb.yml): 添加build配置项 (.cnb.yml)

## [2.0.2-beta.0] - 2026-05-26

🔧 工具变更

- chore(.cnb.yml): 更新发布任务的配置键名 (.cnb.yml)

👷 CI 变更

- ci: 修改npm发布触发的事件名称 (.cnb.yml, web_trigger.yml)

## [2.0.1] - 2026-05-26

👷 CI 变更

- ci(.cnb): 添加web触发配置和npm发布流水线 (.cnb.yml, web_trigger.yml)

## [2.0.0] - 2026-05-26

### 待补充

## [1.1.1] - 2026-05-26

🔧 工具变更

- chore: 发布1.1.0版本，更新版本号和变更日志 (CHANGELOG.md, package.json)
- chore: 发布1.0.0正式版本，更新版本号和变更日志 (CHANGELOG.md, package.json)

## [1.1.0] - 2026-05-26

🔧 工具变更

- chore: 发布1.0.0正式版本，更新版本号和变更日志 (CHANGELOG.md, package.json)

## [2.0.0] - 2026-05-26

### 待补充

## [0.0.3] - 2026-05-26

🔧 工具变更

- chore(core): 发布版本0.0.1-beta.2 (CHANGELOG.md, package.json)
- chore(core): 发布版本0.0.1-beta.1 (CHANGELOG.md, package.json)

## [core@0.0.1-beta.2] - 2026-05-26

🔧 工具变更

- chore(core): 发布版本0.0.1-beta.1 (CHANGELOG.md, package.json)

## [core@0.0.1-beta.1] - 2026-05-26

### 待补充

## [core@0.0.1-beta.0] - 2026-05-26

### 待补充

## [0.0.2] - 2026-05-25

📝 文档更新

- docs(README): 更新文档添加测试说明和贡献指南 (README.md, integration.test.ts)

## [0.0.2-beta.6] - 2026-05-25

🚀 新增功能

- feat(core): 添加智能缓存机制提升批量操作性能 (README.md, loader.ts, VersionManager.ts, index.ts)

🩹 缺陷修复

- fix(cli): 修复错误日志显示和类型检查问题 (index.ts, VersionManager.ts, index.ts)

## [0.0.2-beta.5] - 2026-05-25

🚀 新增功能

- feat(cli): 添加批量更新进度条显示功能 (README.md, index.ts)

## [0.0.2-beta.4] - 2026-05-25

🚀 新增功能

- feat(cli): 添加友好的错误提示和解决方案 (README.md, index.ts)

## [0.0.2-beta.3] - 2026-05-25

🚀 新增功能

- feat(cli): 增强 dry-run 模式功能 (README.md, index.ts)

## [0.0.2-beta.2] - 2026-05-25

🚀 新增功能

- feat(core): 添加批量更新容错处理机制 (README.md, index.ts)

## [0.0.2-beta.1] - 2026-05-25

🔧 工具变更

- chore(changelog): 清理历史版本记录 (CHANGELOG.md)

## [0.0.2-beta.0] - 2026-05-25

🚀 新增功能

- feat(core): GitManager 支持获取提交消息和文件列表 (GitManager.ts)

## [0.0.1] - 2026-05-25

♻️ 代码重构

- refactor(cli): 移除多余空行并优化代码格式
- refactor(config): 整理配置加载模块的代码格式
- refactor(changelog): 优化变更日志管理器的代码格式
- refactor(version): 整理版本管理器的代码格式和注释
- refactor(types): 规范化类型定义中的注释格式

📦 其他变更

- 移除了 src/cli/index.ts 中多余的空行，统一了注释格式的空格处理，
- 使代码更加整洁规范。同时修正了注释中的空格问题，保持一致的
- 代码风格。
- 清理了 src/config/loader.ts 中的多余空行，统一了代码块之间的
- 间距格式，使配置加载逻辑更加清晰易读。
- 移除了 src/core/ChangelogManager.ts 中的多余空行，保持
- 代码结构的整洁性。
- 统一了 src/core/VersionManager.ts 中的注释格式，移除了多
- 余空行，并规范化了 isBatchMode 参数的注释格式。
- 统一了 src/types/index.ts 中 isBatchMode 字段的注释格式，
- 移除了多余空格，保持类型定义的一致性。

## [0.0.0] - 2026-05-25

🚀 新增功能

- feat(version): 添加无commit时手动输入变更描述的功能
- feat(core): 添加批量更新模式支持并优化CHANGELOG生成逻辑
- feat(monorepo): 优化多包场景下的CHANGELOG生成逻辑
- feat(cli&core): 实现monorepo多包差异化git tag策略
- feat: 新增TypeScript格式配置文件支持，优化配置加载逻辑

🩹 缺陷修复

- fix(cli): 修复配置项可选链调用缺失的问题

♻️ 代码重构

- refactor(changelog): 移除手动输入变更描述的交互逻辑
- refactor(VersionManager): 优化包版本更新时的包名处理逻辑
- refactor(cli,version): 优化多包更新的tag生成逻辑
- refactor(logger): 替换原生console为consola日志库

📝 文档更新

- docs(utils): 添加测试文件
- docs(theme): 添加主题包测试文件
- docs(README): 更新主项目包更新的描述文字
- docs: 更新文档并修复交互式提示信息
- docs: 更新README文档，补充完整功能、配置和使用说明

🔧 工具变更

- chore: bump versions for multiple packages
- chore: bump versions for multiple packages
- chore(theme): add empty test file 2.txt
- chore(plugins/utils): add 1.txt test file
- chore: bump version for theme to v1.0.1-beta.8
- chore: bump version for theme to v1.0.1-beta.7
- chore: bump version for default to v1.0.0-beta.11
- chore: bump versions for multiple packages
- chore: bump versions for multiple packages
- chore: bump versions for multiple packages
- chore: bump versions for multiple packages
- chore: bump versions for multiple packages
- chore: bump version for core to v2.0.0-beta.1
- chore: bump version for default to v1.0.0-beta.5
- chore: bump versions for multiple packages
- chore: bump version for core to v1.0.1-beta.0
- chore: bump version for utils to v1.0.1-beta.0
- chore: bump version for theme to v1.0.1-beta.0
- chore: bump version for web to v1.0.1-beta.0
- chore: 初始化多package配置并更新mbump扫描路径
- chore: bump version for default to v1.0.0-beta.3
- chore: bump version for default to v1.0.0-beta.2
- chore: bump version for default to v1.0.0-beta.1
- chore: 更新默认发布配置为pnpm相关参数
- chore: 整理配置文件示例并优化配置加载逻辑
- chore: bump version for default to v1.0.0-beta.0
- chore: 将项目重命名为mbump
- chore: bump version for default to v0.1.0-beta.12
- chore(logger): 配置logger实例禁用时间戳
- chore: bump version for default to v0.1.0-beta.11
- chore: bump version for default to v0.1.0-beta.10
- chore: bump version for default to v0.1.0-beta.9
- chore(logger): 替换consola为原生console输出
- chore: bump version for default to v0.1.0-beta.8
- chore(logger): 配置consola日志禁用时间戳格式
- chore: bump version for default to v0.1.0-beta.7

📦 其他变更

- 移除了无commits时的手动输入变更描述交互功能，直接使用现有commits生成changelog，简化了版本发布流程。
- 新增当无自上一个Tag以来的commit时，支持用户手动输入变更描述来生成CHANGELOG的交互逻辑，同时支持跳过CHANGELOG生成，适配首次初始化项目、手动修改版本号等场景
- ```
- 添加新的测试文件用于验证功能
- ```
- ```
- 新增测试文件用于验证主题包功能
- ```
- 区分主项目包和子包的changelog生成方式
- - 在VersionManager中添加isBatchMode选项，默认为false
- - 修改CHANGELOG生成逻辑，使用isBatchMode标识来控制批量更新时的行为
- - 在批量更新模式下，只有主项目包才会生成CHANGELOG
- - CLI调用时设置isBatchMode为true，标识批量更新模式
- - 更新类型定义，添加isBatchMode可选属性
- 1. 修复mbump all批量更新时子包重复生成CHANGELOG的问题，仅主项目包生成CHANGELOG
- 2. 为ChangelogManager新增packageName参数，支持按包名格式化版本标题
- 3. 更新README文档，补充CHANGELOG生成策略说明和使用示例
- 1. 扩展updatedPackages类型，新增pkgKey字段用于区分主包和子包
- 2. 重构gitCommitAndPush方法的tag命名逻辑，主项目包使用v前缀格式，子包保留原有格式
- 3. 调整gitCommitAndPush的参数名称，将_taPrefix改为tagPrefix提升可读性
- 1. 补全并修正README.md中的Tag格式示例和说明
- 2. 在交互式选择界面中添加包名前缀显示
- 3. 移除代码中多余的空行
- 调整.mbump.config.ts的包扫描路径，新增web、theme、utils、core四个包的配置文件
- 1. 重构gitCommitAndPush方法，支持传入更新包列表和tag配置
- 2. 为子包单独创建{包名}@{版本号}格式的tag，主项目保留v前缀格式
- 3. 更新README文档，新增git tag策略详细说明
- 4. 修复批量更新时的tag创建逻辑，适配多包场景
- 本次提交大幅完善了项目README文档：
- 1.  为各章节添加了美观的emoji前缀增强可读性
- 2.  补充了pnpm安装方式、交互式使用、试运行和发布相关的快速开始示例
- 3.  新增了YAML/TOML/package.json三种配置格式示例
- 4.  重构配置选项说明，使用表格形式清晰展示参数
- 5.  补充了API使用的完整代码示例和版本类型详细说明
- 6.  新增使用场景、调试诊断、注意事项和更多资源章节
- 7.  优化了命令行参数说明和示例，补充了--show-config参数
- 8.  更新了版本类型的详细说明，新增custom/as-is等类型的说明
- 9.  补充了许可证和项目资源链接
- 为所有可能不存在的配置项添加可选链操作符，避免当配置字段未定义时抛出访问错误
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
- 更新了包名、CLI命令名、配置文件名以及文档中的相关引用，统一项目全量名称为mbump
- 通过create方法自定义consola实例，关闭日志的时间戳显示，优化日志输出格式
- 统一项目日志输出工具，将原有的console打印替换为consola，同时保留原有日志接口不变，调整了日志级别配置逻辑，优化空行输出的代码写法
- 移除了对consola的依赖，改用原生console打印带标识的日志内容，同时保留了原有接口不破坏调用逻辑
