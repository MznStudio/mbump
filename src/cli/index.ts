#!/usr/bin/env node
import type { Config, PackageVersionSelections } from '@/types'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { loadConfigAsync } from '@/config/loader'
import { VersionManager } from '@/core/VersionManager'
import log from '@/utils/logger'
import { selectAllVersionsInteractive, selectVersionInteractive } from './interactive'
import { parseArgs } from './parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let packageVersion = '1.0.0'
// 尝试多个可能的路径查找package.json
const possiblePaths = [
  join(__dirname, '..', '..', 'package.json'),
  join(__dirname, '..', 'package.json'),
  join(process.cwd(), 'package.json'),
]

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

用法: mbump [package] [type] [options]

参数:
  [package]      要更新的包名称或 "all" 更新所有包
  [type]         版本升级类型: major, minor, patch, pre-patch, pre-minor, pre-major

选项:
  --dry-run, -d  试运行模式，只显示将要执行的操作
  --verbose, -v  详细输出模式，显示更多执行细节
  --no-commit, -n  禁用自动git提交
  --no-push, -p    禁用自动推送到远程仓库
  --allow-uncommitted, -u  允许在有未提交更改的情况下继续操作
  --npm, -npm    启用npm包发布功能（默认不发布）
  --show-config  显示当前加载的完整配置信息
  --help, -h     显示此帮助信息

示例:
  mbump components patch    # 将components包升级一个补丁版本
  mbump all minor           # 将所有包升级一个小版本
  mbump plugins major --dry-run  # 试运行升级plugins包主版本
  mbump core patch --no-push  # 更新版本并提交到本地，但不推送到远程
  mbump components patch --npm  # 更新版本并发布到npm
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

    const rootDir = process.cwd()
    const config: Config = await log.withSpinner('正在加载配置...', () => loadConfigAsync(rootDir), {
      succeedText: '配置加载完成',
      failText: '配置加载失败',
    })

    const parsedArgs = parseArgs(args, config.defaults)

    if (parsedArgs.showConfig) {
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
        const relativePath = path.split(/[/\\]/).pop()
        log.info(`  ${name}: ${relativePath}`)
      }

      // 显示默认选项
      log.info('')
      log.info('⚙️  默认选项:')
      log.info(`  releaseType: ${config.defaults?.releaseType}`)
      log.info(`  dryRun: ${config.defaults?.dryRun}`)
      log.info(`  verbose: ${config.defaults?.verbose}`)
      log.info(`  allowUncommitted: ${config.defaults?.allowUncommitted}`)
      log.info(`  npm: ${config.defaults?.npm}`)

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
    if (!parsedArgs.package) {
      if (packageNames.includes('default')) {
        parsedArgs.package = 'default'
      }
      else if (packageNames.length === 1) {
        parsedArgs.package = packageNames[0]
      }
      else {
        throw new Error(
          '未指定包名\n' + `请指定要更新的包名，可选包: ${packageNames.join(', ')} 或使用 "all" 更新所有包`,
        )
      }
    }
    else if (parsedArgs.package !== 'all' && !packageNames.includes(parsedArgs.package)) {
      throw new Error(
        `包名 "${parsedArgs.package}" 未在配置中找到\n` + `可用的包名: ${packageNames.join(', ')} 或使用 "all" 更新所有包`,
      )
    }

    const versionManager = new VersionManager({ config, rootDir })
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

    if (parsedArgs.verbose) {
      if (config.usedConfigPath) {
        const fileName = config.usedConfigPath.split('\\').pop() || config.usedConfigPath
        log.info(`使用配置文件: ${fileName}`)
      }
      log.info(`更新信息: 包=${parsedArgs.package}, 类型=${parsedArgs.type}${parsedArgs.dryRun ? ' (试运行)' : ''}`)
    }

    let selectedType = parsedArgs.type
    let customVersion: string | null = null
    const packageVersionSelections: PackageVersionSelections = {}

    if (
      !args.some(arg => arg === '--type' || arg.startsWith('--type=') || arg === '-t' || arg.startsWith('-t='))
    ) {
      if (parsedArgs.package === 'all') {
        const selections = await selectAllVersionsInteractive(config, rootDir)
        Object.assign(packageVersionSelections, selections)
      }
      else {
        const packageName = parsedArgs.package!
        const currentVersion = versionManager.getPackageVersion(packageName)

        if (currentVersion) {
          const selection = await selectVersionInteractive(config, packageName, currentVersion)
          selectedType = selection.type
          customVersion = selection.customVersion
        }
      }
    }

    if (parsedArgs.package === 'all' && Object.keys(packageVersionSelections).length > 0) {
      const updatedPackagesInfo: Array<{ name: string, newVersion: string }> = []
      
      for (const [packageName, selection] of Object.entries(packageVersionSelections)) {
        const result = await log.withSpinner(`正在更新包...${packageName}...`, async () => {
          return await versionManager.updateVersion(packageName, selection.type, {
            dryRun: parsedArgs.dryRun,
            verbose: parsedArgs.verbose,
            customVersion: selection.customVersion,
            autoCommit: false,
            push: false,
          })
        }, {
          succeedText: `包 ${packageName} 更新完成`,
          failText: `包 ${packageName} 更新失败`,
        })
        
        // 收集更新的包信息
        if (result.success && result.updatedPackages.length > 0) {
          updatedPackagesInfo.push(...result.updatedPackages)
        }
      }

      if (!parsedArgs.dryRun && parsedArgs.autoCommit && updatedPackagesInfo.length > 0) {
        await versionManager.gitCommitAndPush(
          parsedArgs.push,
          updatedPackagesInfo,
          config.git?.tag !== false,
          config.git?.tagPrefix || 'v',
        )
      }

      if (parsedArgs.npm && !parsedArgs.dryRun) {
        for (const [packageName, selection] of Object.entries(packageVersionSelections)) {
          await log.withSpinner(`正在发布包 ${packageName}...`, async () => {
            await versionManager.updateVersion(packageName, selection.type, {
              dryRun: false,
              verbose: parsedArgs.verbose,
              customVersion: selection.customVersion,
              autoCommit: false,
              push: false,
              npm: true,
            })
          }, {
            succeedText: `包 ${packageName} 发布完成`,
            failText: `包 ${packageName} 发布失败`,
          })
        }
      }
    }
    else {
      await versionManager.updateVersion(parsedArgs.package!, selectedType, {
        dryRun: parsedArgs.dryRun,
        verbose: parsedArgs.verbose,
        customVersion,
        autoCommit: parsedArgs.autoCommit,
        push: parsedArgs.push,
        npm: parsedArgs.npm,
      })
    }

    log.success(`版本更新完成${parsedArgs.dryRun ? ' (试运行模式)' : ''}`)
    process.exit(0)
  }
  catch (error: any) {
    log.error(error.message)
    process.exit(1)
  }
}

main().catch((error: any) => {
  console.error('CLI执行错误:', error)
  process.exit(1)
})
