#!/usr/bin/env node
import type { Config, PackageVersionSelections, PreviewResult } from '@/types'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { clearConfigCache, loadConfigAsync } from '@/config/loader'
import { VersionManager } from '@/core/VersionManager'
import log from '@/utils/logger'
import { selectAllVersionsInteractive, selectVersionInteractive } from './interactive'
import { parseArgs } from './parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function renderPreview(preview: PreviewResult): void {
  log.info('🔍 Dry-run 模式 - 以下操作将被执行:\n')

  for (const pkg of preview.packages) {
    log.info(`  📦 ${pkg.name}`)
    log.info(`     当前版本: ${pkg.oldVersion}`)
    log.info(`     新版本:   ${pkg.newVersion}`)
    log.info(`     Tag:      ${pkg.tagName}`)
    log.info(`     CHANGELOG: ${pkg.changelogEnabled ? '是' : pkg.isDefaultPackage ? '否（配置禁用）' : '跳过（子包）'}`)
    log.info('')
  }

  log.info(`     Git Commit: ${preview.autoCommit ? '是' : '否'}`)
  log.info(`     Git Push: ${preview.push ? '是' : '否'}`)
  log.info(`     Publish: ${preview.publish ? '是' : '否'}`)
  log.info('\n✅ 以上为预览，未执行任何实际操作')
}

let packageVersion = '1.0.0'
// 尝试多个可能的路径查找package.json
const possiblePaths = [
  join(__dirname, '..', '..', 'package.json'),
  join(__dirname, '..', 'package.json'),
  join(process.cwd(), 'package.json'),
]

/**
 * 获取友好的错误提示和解决方案
 */
function getFriendlyErrorMessage(error: Error): { message: string, solution?: string } {
  const errorMessage = error.message

  // 版本已存在
  if (errorMessage.includes('已存在')) {
    return {
      message: `⚠️ 版本 ${errorMessage.match(/版本 (.+?) 已存在/)?.[1] || ''} 已存在`,
      solution: '💡 请使用其他版本号，或运行 git tag -d <tag> 删除已有标签',
    }
  }

  // Git 冲突
  if (errorMessage.includes('Git conflict') || errorMessage.includes('conflict')) {
    return {
      message: '⚠️ 检测到 Git 冲突',
      solution: '💡 请先解决冲突后重试：git add . && git commit -m "resolve conflicts"',
    }
  }

  // NPM 认证失败
  if (errorMessage.includes('npm ERR! code E401') || errorMessage.includes('authentication')) {
    return {
      message: '🔐 NPM 认证失败',
      solution: '💡 请运行 npm login 或 pnpm login 登录后重试',
    }
  }

  // NPM 包已存在
  if (errorMessage.includes('npm ERR! code E403') || errorMessage.includes('cannot publish')) {
    return {
      message: '📦 NPM 包已存在或无权限',
      solution: '💡 检查包名是否已被占用，或确认是否有发布权限',
    }
  }

  // 网络错误
  if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
    return {
      message: '🌐 网络连接失败',
      solution: '💡 请检查网络连接，或配置 NPM 镜像源',
    }
  }

  // 文件路径安全
  if (errorMessage.includes('不安全的文件路径')) {
    return {
      message: '🔒 检测到不安全的文件路径',
      solution: '💡 请确保配置文件中的路径在项目根目录内',
    }
  }

  // 无效的包名
  if (errorMessage.includes('无效的包名')) {
    return {
      message: '❌ 无效的包名',
      solution: '💡 请检查配置文件中的 packagePaths 是否正确设置',
    }
  }

  // 不支持的版本类型
  if (errorMessage.includes('不支持的版本类型')) {
    return {
      message: '❌ 不支持的版本类型',
      solution: '💡 支持的版本类型: major, minor, patch, pre-patch, pre-minor, pre-major, next, as-is, conventional',
    }
  }

  // 无效的自定义版本号
  if (errorMessage.includes('无效的自定义版本号')) {
    return {
      message: '❌ 无效的自定义版本号',
      solution: '💡 请使用符合 semver 规范的版本号，如 1.0.0, 1.0.1-beta.1',
    }
  }

  // 版本计算失败
  if (errorMessage.includes('版本计算失败')) {
    return {
      message: '❌ 版本计算失败',
      solution: '💡 请检查当前版本号是否符合 semver 规范，或使用 --verbose 模式查看详细错误',
    }
  }

  // 无法计算新版本号
  if (errorMessage.includes('无法计算新版本号')) {
    return {
      message: '❌ 无法计算新版本号',
      solution: '💡 请检查当前版本号是否符合 semver 规范，或尝试使用不同的版本类型',
    }
  }

  // 文件读取失败
  if (errorMessage.includes('读取文件失败')) {
    return {
      message: '📁 文件读取失败',
      solution: '💡 请检查文件路径是否正确，文件是否存在且有读取权限',
    }
  }

  // 文件写入失败
  if (errorMessage.includes('写入文件失败')) {
    return {
      message: '📁 文件写入失败',
      solution: '💡 请检查文件路径是否正确，是否有写入权限，磁盘空间是否充足',
    }
  }

  // Git 操作失败
  if (errorMessage.includes('Git') && errorMessage.includes('失败')) {
    return {
      message: '🔧 Git 操作失败',
      solution: '💡 请检查 Git 仓库状态，确保有提交权限，或使用 --verbose 模式查看详细错误',
    }
  }

  // NPM 发布失败
  if (errorMessage.includes('发布失败')) {
    return {
      message: '🚀 NPM 发布失败',
      solution: '💡 请检查 NPM 配置、认证状态和网络连接，或使用 --verbose 模式查看详细错误',
    }
  }

  // Cargo.toml 相关错误
  if (errorMessage.includes('Cargo.toml')) {
    return {
      message: '🦀 Cargo.toml 操作失败',
      solution: '💡 请检查 Cargo.toml 文件是否存在，格式是否正确，或使用 --verbose 模式查看详细错误',
    }
  }

  // 不存在 package.json
  if (errorMessage.includes('不存在 package.json')) {
    return {
      message: '📦 package.json 不存在',
      solution: '💡 请确保指定的路径是一个有效的 Node.js 项目目录',
    }
  }

  // 路径不存在（放在 package.json 检查之后，避免误匹配）
  if (errorMessage.includes('路径') && errorMessage.includes('不存在') && !errorMessage.includes('package.json')) {
    return {
      message: '📂 路径不存在',
      solution: '💡 请检查路径是否正确，确保目录存在',
    }
  }

  // 配置错误
  if (errorMessage.includes('配置错误')) {
    return {
      message: '⚙️ 配置错误',
      solution: '💡 请检查配置文件是否正确，或使用 --show-config 查看当前配置',
    }
  }

  // 默认错误消息
  return {
    message: `❌ ${errorMessage}`,
    solution: '💡 请检查错误信息，或使用 --verbose 模式查看更多详情',
  }
}

/**
 * 显示友好的错误信息
 */
function displayError(error: Error, context?: { packageName?: string, operation?: string }): void {
  const { message, solution } = getFriendlyErrorMessage(error)

  if (context?.packageName) {
    log.error(`包 ${context.packageName} ${context.operation || '操作'} 失败:`)
  }

  log.error(`  ${message}`)

  if (solution) {
    log.info(`  ${solution}`)
  }

  // 调试模式下显示详细错误
  if (process.env.DEBUG) {
    log.debug(`详细错误信息: ${JSON.stringify(error, null, 2)}`)
  }
}

/**
 * 渲染进度条
 * @param current 当前进度
 * @param total 总数量
 * @param width 进度条宽度（字符数）
 * @returns 进度条字符串
 */
function renderProgressBar(current: number, total: number, width: number = 30): string {
  const percentage = Math.round((current / total) * 100)
  const filledLength = Math.round((width * current) / total)
  const emptyLength = width - filledLength

  const filled = '█'.repeat(filledLength)
  const empty = '░'.repeat(emptyLength)

  return `[${filled}${empty}] ${percentage}% | ${current}/${total}`
}

/**
 * 显示批量更新进度
 */
function updateProgress(
  current: number,
  total: number,
  packageName: string,
  status: 'processing' | 'success' | 'failed',
): void {
  const progressBar = renderProgressBar(current, total)
  const statusIcon = status === 'success' ? '✓' : status === 'failed' ? '✗' : '⟳'
  const statusText = status === 'processing' ? '处理中' : status === 'success' ? '完成' : '失败'

  // 清除当前行并显示新进度
  process.stdout.write(`\r${progressBar} | ${statusIcon} ${packageName} - ${statusText}   `)

  // 如果是最后一个或失败/成功，换行
  if (current === total || status !== 'processing') {
    process.stdout.write('\n')
  }
}

for (const packageJsonPath of possiblePaths) {
  try {
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
      packageVersion = packageJson.version || packageVersion
      break
    }
  }
  catch {
    // 继续尝试下一个路径
  }
}

process.env.NODE_NO_WARNINGS = '1'

export function showHelp(): void {
  const helpText = `🔧 mbump v${packageVersion}
========================
企业级版本管理工具，支持单包和monorepo场景

用法: mbump [package|path] [type] [options]

参数:
  [package]      要更新的包名称或 "all" 更新所有包
  [path]         项目目录路径（支持 ./path, ../path, /path, C:\\path），自动查找该目录下的 package.json
  [type]         版本升级类型: major, minor, patch, pre-patch, pre-minor, pre-major

选项:
  --dry-run, -d  试运行模式，只显示将要执行的操作
  --verbose, -v  详细输出模式，显示更多执行细节
  --no-commit, -n  禁用自动git提交
  --no-push, -p    禁用自动推送到远程仓库
  --allow-uncommitted, -u  允许在有未提交更改的情况下继续操作
  --publish, -P  启用包发布功能（默认不发布）
  --show-config, -c  显示当前加载的完整配置信息
  --rust, -r     启用 Rust 项目模式，更新 Cargo.toml 中的版本号
  --version, -V  显示版本信息
  --help, -h     显示此帮助信息

示例:
  mbump components patch    # 将components包升级一个补丁版本
  mbump all minor           # 将所有包升级一个小版本
  mbump plugins major --dry-run  # 试运行升级plugins包主版本
  mbump core patch --no-push  # 更新版本并提交到本地，但不推送到远程
  mbump components patch --publish  # 更新版本并发布

  # 路径模式（直接指定项目目录）
  mbump ./packages/my-pkg    # 更新 ./packages/my-pkg 目录下的 package.json
  mbump ./packages/my-pkg patch  # 指定版本类型
  mbump ../other-project minor  # 更新上级目录的项目

  # Rust 项目模式（更新 Cargo.toml）
  mbump --rust patch         # 更新当前目录 Rust 项目的补丁版本
  mbump -r minor             # 更新当前目录 Rust 项目的小版本
  mbump -r major --dry-run   # 试运行升级当前目录 Rust 项目的主版本
  mbump ./backend -r patch   # 更新指定目录下的 Rust 项目
  mbump ./backend -r -d      # 试运行模式更新指定目录下的 Rust 项目
`
  log.info(helpText)
}

function hasUncommittedChanges(): boolean {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' })
    return output.trim() !== ''
  }
  catch {
    return false
  }
}

async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2)

    if (args.includes('--help') || args.includes('-h')) {
      showHelp()
      process.exit(0)
    }

    if (args.includes('--version') || args.includes('-V')) {
      log.info(`mbump v${packageVersion}`)
      process.exit(0)
    }

    const parsedArgs = parseArgs(args)

    if (parsedArgs.rust) {
      const rootDir = parsedArgs.projectPath
        ? resolve(process.cwd(), parsedArgs.projectPath)
        : process.cwd()

      if (parsedArgs.projectPath && !existsSync(rootDir)) {
        displayError(new Error(`路径 "${parsedArgs.projectPath}" 不存在`), {
          operation: '路径验证',
        })
        process.exit(1)
      }

      const cargoTomlPath = join(rootDir, 'Cargo.toml')
      if (!existsSync(cargoTomlPath)) {
        displayError(new Error(`Cargo.toml 文件不存在于路径 "${rootDir}"`), {
          operation: 'Rust 项目检测',
        })
        log.info(`💡 请确保指定的路径是 Rust 项目根目录`)
        process.exit(1)
      }

      if (parsedArgs.projectPath) {
        log.info(`切换到项目路径: ${rootDir}`)
      }

      let packageName = 'default'
      try {
        const content = readFileSync(cargoTomlPath, 'utf8')
        const toml = await import('toml')
        const parsed = toml.parse(content) as Record<string, any>
        packageName = parsed.package?.name || 'rust'
      }
      catch {
        packageName = 'rust'
      }

      const projectConfig: Config = {
        packagePaths: {
          [packageName]: cargoTomlPath,
        },
        defaults: {
          releaseType: 'patch',
        },
        git: {
          autoCommit: parsedArgs.autoCommit,
          push: parsedArgs.push,
          tag: parsedArgs.tag,
          changelog: parsedArgs.changelog,
        },
      }

      const versionManager = new VersionManager({ config: projectConfig, rootDir, projectType: 'rust' })
      log.setLevel(parsedArgs.verbose ? 'debug' : 'info')

      if (hasUncommittedChanges()) {
        if (!parsedArgs.allowUncommitted) {
          log.warn('警告: 检测到未提交的Git更改')

          const inquirer = await import('inquirer')
          const answers = await inquirer.default.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: parsedArgs.dryRun
                ? '是否继续（dry-run模式不会实际提交更改）?'
                : '是否提交这些更改并继续?',
              default: true,
            },
          ])

          if (!answers.continue) {
            log.info('操作已取消')
            process.exit(0)
          }

          if (!parsedArgs.dryRun) {
            const commitMessage = 'chore: update mbump config and settings'
            execSync(`git add . && git commit -m "${commitMessage}"`, { encoding: 'utf8', stdio: 'pipe' })
            log.success(`已提交更改: ${commitMessage}`)
          }
          else {
            log.info('dry-run模式: 跳过实际提交操作')
          }
        }
        else {
          log.warn('警告: 存在未提交的Git更改，您选择了忽略此检查。请注意这可能导致不一致的版本状态。')
        }
      }

      const currentVersion = versionManager.getPackageVersion(packageName)
      if (!currentVersion) {
        displayError(new Error(`Cargo.toml 文件中未找到 [package] 部分的 version 字段`), {
          operation: '版本读取',
        })
        process.exit(1)
      }

      let selectedType = parsedArgs.type
      let customVersion: string | null = null

      if (!parsedArgs.type) {
        const selection = await selectVersionInteractive(projectConfig, packageName, currentVersion, rootDir)
        selectedType = selection.type
        customVersion = selection.customVersion
      }

      if (parsedArgs.dryRun) {
        const preview = await versionManager.previewUpdate(packageName, selectedType, {
          customVersion,
          autoCommit: parsedArgs.autoCommit,
          push: parsedArgs.push,
        })
        renderPreview(preview)
        process.exit(0)
      }

      const result = await versionManager.updateVersion(packageName, selectedType, {
        dryRun: parsedArgs.dryRun,
        verbose: parsedArgs.verbose,
        autoCommit: parsedArgs.autoCommit,
        push: parsedArgs.push,
        customVersion,
        tag: parsedArgs.tag,
        changelog: parsedArgs.changelog,
      })

      if (!result.success || result.error) {
        log.error(`版本更新失败: ${result.error || '未知错误'}`)
        process.exit(1)
      }

      log.success(`版本更新完成`)
      process.exit(0)

      // await versionManager.updateVersion(packageName, selectedType, {
      //   dryRun: parsedArgs.dryRun,
      //   verbose: parsedArgs.verbose,
      //   autoCommit: parsedArgs.autoCommit,
      //   push: parsedArgs.push,
      //   customVersion,
      //   tag: parsedArgs.tag,
      //   changelog: parsedArgs.changelog,
      // })

      // log.success(`版本更新完成`)
      // process.exit(0)
    }

    if (parsedArgs.projectPath) {
      const resolvedProjectPath = resolve(process.cwd(), parsedArgs.projectPath)
      if (!existsSync(resolvedProjectPath)) {
        displayError(new Error(`路径 "${parsedArgs.projectPath}" 不存在`), { operation: '路径验证' })
        process.exit(1)
      }
      const pkgJsonPath = join(resolvedProjectPath, 'package.json')
      if (!existsSync(pkgJsonPath)) {
        displayError(new Error(`路径 "${parsedArgs.projectPath}" 中不存在 package.json`), { operation: 'package.json 检测' })
        log.info(`💡 请确保指定的路径是一个有效的 Node.js 项目目录`)
        process.exit(1)
      }

      log.info(`切换到项目路径: ${resolvedProjectPath}`)

      const pkgJsonContent = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
      const packageName = pkgJsonContent.name || 'default'

      parsedArgs.package = packageName

      clearConfigCache(resolvedProjectPath)
      const projectConfig = await loadConfigAsync(resolvedProjectPath)

      projectConfig.packagePaths = {
        [packageName]: pkgJsonPath,
      }

      const projectVersionManager = new VersionManager({ config: projectConfig, rootDir: resolvedProjectPath })
      log.setLevel(parsedArgs.verbose ? 'debug' : 'info')

      if (hasUncommittedChanges()) {
        if (!parsedArgs.allowUncommitted) {
          log.warn('警告: 检测到未提交的Git更改')

          const inquirer = await import('inquirer')
          const answers = await inquirer.default.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: parsedArgs.dryRun
                ? '是否继续（dry-run模式不会实际提交更改）?'
                : '是否提交这些更改并继续?',
              default: true,
            },
          ])

          if (!answers.continue) {
            log.info('操作已取消')
            process.exit(0)
          }

          if (!parsedArgs.dryRun) {
            const commitMessage = 'chore: update mbump config and settings'
            execSync(`git add . && git commit -m "${commitMessage}"`, { encoding: 'utf8', stdio: 'pipe' })
            log.success(`已提交更改: ${commitMessage}`)
          }
          else {
            log.info('dry-run模式: 跳过实际提交操作')
          }
        }
        else {
          log.warn('警告: 存在未提交的Git更改，您选择了忽略此检查。请注意这可能导致不一致的版本状态。')
        }
      }

      let selectedType = parsedArgs.type
      let customVersion: string | null = null

      if (!parsedArgs.type) {
        const currentVersion = projectVersionManager.getPackageVersion(packageName)
        if (currentVersion) {
          const selection = await selectVersionInteractive(projectConfig, packageName, currentVersion, resolvedProjectPath)
          selectedType = selection.type
          customVersion = selection.customVersion
        }
      }

      if (parsedArgs.dryRun) {
        const preview = await projectVersionManager.previewUpdate(parsedArgs.package!, selectedType, {
          customVersion,
          autoCommit: parsedArgs.autoCommit,
          push: parsedArgs.push,
          publish: parsedArgs.publish,
        })
        renderPreview(preview)
        process.exit(0)
      }

      await projectVersionManager.updateVersion(parsedArgs.package!, selectedType, {
        dryRun: parsedArgs.dryRun,
        verbose: parsedArgs.verbose,
        autoCommit: parsedArgs.autoCommit,
        push: parsedArgs.push,
        publish: parsedArgs.publish,
        customVersion,
      })

      log.success(`版本更新完成`)
      process.exit(0)
    }

    const rootDir = process.cwd()
    const config: Config = await log.withSpinner('正在加载配置...', () => loadConfigAsync(rootDir), {
      succeedText: '配置加载完成',
      failText: '配置加载失败',
    })

    const parsedArgsWithDefaults = parseArgs(args, config.defaults)

    if (parsedArgsWithDefaults.showConfig) {
      log.info('📋 当前加载的配置:')
      log.info('')

      // 显示配置文件路径
      if (config.usedConfigPath) {
        const fileName = config.usedConfigPath.split(/[/\\]/).pop()
        log.info(`  配置文件: ${fileName}`)
      }
      else {
        log.info('  配置文件: (默认配置)')
      }

      // 显示包路径
      log.info('')
      log.info('📦 包路径:')
      for (const [name, path] of Object.entries(config.packagePaths)) {
        log.info(`  ${name}: ${path}`)
      }

      // 显示默认选项
      log.info('')
      log.info('⚙️  默认选项:')
      log.info(`  releaseType: ${config.defaults?.releaseType}`)
      log.info(`  dryRun: ${config.defaults?.dryRun}`)
      log.info(`  verbose: ${config.defaults?.verbose}`)
      log.info(`  allowUncommitted: ${config.defaults?.allowUncommitted}`)
      log.info(`  publish: ${config.defaults?.publish}`)

      // 显示 Git 选项
      log.info('')
      log.info('🔧 Git 选项:')
      log.info(`  commit: ${config.git?.autoCommit}`)
      log.info(`  push: ${config.git?.push}`)
      log.info(`  tag: ${config.git?.tag}`)
      log.info(`  changelog: ${config.git?.changelog}`)

      // 显示 Publish 选项
      log.info('')
      log.info('🚀 发布选项:')
      log.info(`  command: ${config.publish?.command}`)
      log.info(`  skipChecks: ${config.publish?.skipChecks}`)

      log.info('')
      process.exit(0)
    }

    const packageNames = Object.keys(config.packagePaths)
    if (!parsedArgsWithDefaults.package) {
      if (packageNames.includes('default')) {
        parsedArgsWithDefaults.package = 'default'
      }
      else if (packageNames.length === 1) {
        parsedArgsWithDefaults.package = packageNames[0]
      }
      else {
        displayError(new Error(`未指定包名\n可用的包名: ${packageNames.join(', ')} 或使用 "all" 更新所有包`))
        process.exit(1)
      }
    }
    else if (parsedArgsWithDefaults.package !== 'all' && !packageNames.includes(parsedArgsWithDefaults.package)) {
      const maybePath = parsedArgsWithDefaults.package
      if (maybePath) {
        const resolvedPath = resolve(process.cwd(), maybePath)
        const pkgJsonPath = join(resolvedPath, 'package.json')
        if (existsSync(resolvedPath) && existsSync(pkgJsonPath)) {
          log.info(`切换到项目路径: ${resolvedPath}`)

          const pkgJsonContent = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
          const packageName = pkgJsonContent.name || 'default'

          clearConfigCache(resolvedPath)
          const projectConfig = await loadConfigAsync(resolvedPath)

          projectConfig.packagePaths = {
            [packageName]: pkgJsonPath,
          }

          const projectVersionManager = new VersionManager({ config: projectConfig, rootDir: resolvedPath })
          log.setLevel(parsedArgsWithDefaults.verbose ? 'debug' : 'info')

          let selectedType = parsedArgsWithDefaults.type
          let customVersion: string | null = null

          if (!parsedArgsWithDefaults.type) {
            const currentVersion = projectVersionManager.getPackageVersion(packageName)
            if (currentVersion) {
              const selection = await selectVersionInteractive(projectConfig, packageName, currentVersion, resolvedPath)
              selectedType = selection.type
              customVersion = selection.customVersion
            }
          }

          if (parsedArgsWithDefaults.dryRun) {
            const preview = await projectVersionManager.previewUpdate(packageName, selectedType, {
              customVersion,
              autoCommit: parsedArgsWithDefaults.autoCommit,
              push: parsedArgsWithDefaults.push,
              publish: parsedArgsWithDefaults.publish,
            })
            renderPreview(preview)
            process.exit(0)
          }

          await projectVersionManager.updateVersion(packageName, selectedType, {
            dryRun: parsedArgsWithDefaults.dryRun,
            verbose: parsedArgsWithDefaults.verbose,
            autoCommit: parsedArgsWithDefaults.autoCommit,
            push: parsedArgsWithDefaults.push,
            publish: parsedArgsWithDefaults.publish,
            customVersion,
          })

          log.success(`版本更新完成`)
          process.exit(0)
        }
        else {
          displayError(new Error(`包名 "${parsedArgsWithDefaults.package}" 未在配置中找到，且路径 "${resolvedPath}" 不是有效的项目目录`), {
            operation: '包名/路径解析',
          })
          log.info(`💡 可用的包名: ${packageNames.join(', ')} 或使用 "all" 更新所有包`)
          log.info(`💡 也可以使用路径模式: mbump ./packages/my-pkg`)
          process.exit(1)
        }
      }

      displayError(new Error(`包名 "${parsedArgsWithDefaults.package}" 未在配置中找到`), {
        operation: '包名解析',
      })
      log.info(`💡 可用的包名: ${packageNames.join(', ')} 或使用 "all" 更新所有包`)
      log.info(`💡 也可以使用路径模式: mbump ./packages/my-pkg`)
      process.exit(1)
    }

    const versionManager = new VersionManager({ config, rootDir })
    log.setLevel(parsedArgsWithDefaults.verbose ? 'debug' : 'info')

    if (hasUncommittedChanges()) {
      if (!parsedArgsWithDefaults.allowUncommitted) {
        log.warn('警告: 检测到未提交的Git更改')

        const inquirer = await import('inquirer')
        const answers = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: parsedArgsWithDefaults.dryRun
              ? '是否继续（dry-run模式不会实际提交更改）?'
              : '是否提交这些更改并继续?',
            default: true,
          },
        ])

        if (!answers.continue) {
          log.info('操作已取消')
          process.exit(0)
        }

        if (!parsedArgsWithDefaults.dryRun) {
          const commitMessage = 'chore: update mbump config and settings'
          execSync(`git add . && git commit -m "${commitMessage}"`, { encoding: 'utf8', stdio: 'pipe' })
          log.success(`已提交更改: ${commitMessage}`)
        }
        else {
          log.info('dry-run模式: 跳过实际提交操作')
        }
      }
      else {
        log.warn('警告: 存在未提交的Git更改，您选择了忽略此检查。请注意这可能导致不一致的版本状态。')
      }
    }

    if (parsedArgsWithDefaults.verbose) {
      if (config.usedConfigPath) {
        const fileName = config.usedConfigPath.split('\\').pop() || config.usedConfigPath
        log.info(`使用配置文件: ${fileName}`)
      }
      log.info(`更新信息: 包=${parsedArgsWithDefaults.package}, 类型=${parsedArgsWithDefaults.type}${parsedArgsWithDefaults.dryRun ? ' (试运行)' : ''}`)
    }

    let selectedType = parsedArgsWithDefaults.type
    let customVersion: string | null = null
    const packageVersionSelections: PackageVersionSelections = {}

    if (!parsedArgsWithDefaults.type) {
      if (parsedArgsWithDefaults.package === 'all') {
        const selections = await selectAllVersionsInteractive(config, rootDir)
        Object.assign(packageVersionSelections, selections)
      }
      else {
        const packageName = parsedArgsWithDefaults.package!
        const currentVersion = versionManager.getPackageVersion(packageName)

        if (currentVersion) {
          const selection = await selectVersionInteractive(config, packageName, currentVersion)
          selectedType = selection.type
          customVersion = selection.customVersion
        }
      }
    }

    if (parsedArgsWithDefaults.package === 'all' && Object.keys(packageVersionSelections).length > 0) {
      if (parsedArgsWithDefaults.dryRun) {
        const preview = await versionManager.previewUpdate('all', 'patch', {
          packageVersionSelections,
          autoCommit: parsedArgsWithDefaults.autoCommit,
          push: parsedArgsWithDefaults.push,
          publish: parsedArgsWithDefaults.publish,
        })
        renderPreview(preview)
        process.exit(0)
      }

      const updatedPackagesInfo: Array<{ name: string, newVersion: string, pkgKey: string }> = []
      const errors: Array<{ packageName: string, error: Error }> = []
      const packages = Object.entries(packageVersionSelections)
      const total = packages.length

      log.info(`\n📦 开始批量更新 ${total} 个包...\n`)

      for (let i = 0; i < packages.length; i++) {
        const [packageName, selection] = packages[i]
        const current = i + 1

        // 显示进度
        updateProgress(current, total, packageName, 'processing')

        try {
          const result = await versionManager.updateVersion(packageName, selection.type, {
            dryRun: parsedArgsWithDefaults.dryRun,
            verbose: parsedArgsWithDefaults.verbose,
            customVersion: selection.customVersion,
            autoCommit: false,
            push: false,
            isBatchMode: true, // 标识这是批量更新模式
          })

          // 收集更新的包信息，同时记录包名 key
          if (result.success && result.updatedPackages.length > 0) {
            updatedPackagesInfo.push(...result.updatedPackages.map(pkg => ({
              ...pkg,
              pkgKey: packageName,
            })))
            updateProgress(current, total, packageName, 'success')
          }
          else {
            updateProgress(current, total, packageName, 'failed')
          }
        }
        catch (error) {
          errors.push({ packageName, error: error as Error })
          displayError(error as Error, { packageName, operation: '更新' })
          updateProgress(current, total, packageName, 'failed')
        }
      }

      log.info('') // 空行分隔

      // 报告所有错误
      if (errors.length > 0) {
        log.error(`\n❌ 批量更新完成，但有 ${errors.length} 个包更新失败:`)
        errors.forEach(({ packageName, error }) => {
          log.error(`   - ${packageName}: ${error.message}`)
        })
        log.info('\n💡 提示: 可以单独重试失败的包，或检查错误信息后重新运行')
      }

      if (!parsedArgsWithDefaults.dryRun && parsedArgsWithDefaults.autoCommit && updatedPackagesInfo.length > 0) {
        await versionManager.gitCommitAndPush(
          parsedArgsWithDefaults.push,
          updatedPackagesInfo,
          config.git?.tag !== false,
        )
      }

      if (parsedArgsWithDefaults.publish && !parsedArgsWithDefaults.dryRun) {
        const publishErrors: Array<{ packageName: string, error: Error }> = []
        const publishPackages = Object.entries(packageVersionSelections)
        const publishTotal = publishPackages.length

        log.info(`\n🚀 开始发布 ${publishTotal} 个包...\n`)

        for (let i = 0; i < publishPackages.length; i++) {
          const [packageName, selection] = publishPackages[i]
          const publishCurrent = i + 1

          updateProgress(publishCurrent, publishTotal, packageName, 'processing')

          try {
            await versionManager.updateVersion(packageName, selection.type, {
              dryRun: false,
              verbose: parsedArgsWithDefaults.verbose,
              customVersion: selection.customVersion,
              autoCommit: false,
              push: false,
              publish: true,
            })

            updateProgress(publishCurrent, publishTotal, packageName, 'success')
          }
          catch (error) {
            publishErrors.push({ packageName, error: error as Error })
            displayError(error as Error, { packageName, operation: '发布' })
            updateProgress(publishCurrent, publishTotal, packageName, 'failed')
          }
        }

        log.info('')

        if (publishErrors.length > 0) {
          log.error(`\n❌ 发布完成，但有 ${publishErrors.length} 个包发布失败:`)
          publishErrors.forEach(({ packageName, error }) => {
            log.error(`   - ${packageName}: ${error.message}`)
          })
        }
      }
    }
    else {
      if (parsedArgsWithDefaults.dryRun && parsedArgsWithDefaults.package) {
        const preview = await versionManager.previewUpdate(parsedArgsWithDefaults.package, selectedType, {
          customVersion,
          autoCommit: parsedArgsWithDefaults.autoCommit,
          push: parsedArgsWithDefaults.push,
          publish: parsedArgsWithDefaults.publish,
        })
        renderPreview(preview)
        process.exit(0)
      }

      await versionManager.updateVersion(parsedArgsWithDefaults.package!, selectedType, {
        dryRun: parsedArgsWithDefaults.dryRun,
        verbose: parsedArgsWithDefaults.verbose,
        customVersion,
        autoCommit: parsedArgsWithDefaults.autoCommit,
        push: parsedArgsWithDefaults.push,
        publish: parsedArgsWithDefaults.publish,
      })
    }

    log.success(`版本更新完成${parsedArgsWithDefaults.dryRun ? ' (试运行模式)' : ''}`)
    process.exit(0)
  }
  catch (error: any) {
    displayError(error as Error)
    process.exit(1)
  }
}

main().catch((error: any) => {
  displayError(error as Error, { operation: 'CLI执行' })
  process.exit(1)
})
