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
  const helpText = `🔧 zbump v${packageVersion}
========================
企业级版本管理工具，支持单包和monorepo场景

用法: zbump [package] [type] [options]

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
  --help, -h     显示此帮助信息

示例:
  zbump components patch    # 将components包升级一个补丁版本
  zbump all minor           # 将所有包升级一个小版本
  zbump plugins major --dry-run  # 试运行升级plugins包主版本
  zbump core patch --no-push  # 更新版本并提交到本地，但不推送到远程
  zbump components patch --npm  # 更新版本并发布到npm
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

    const packageNames = Object.keys(config.packagePaths)
    if (!parsedArgs.package) {
      if (packageNames.length === 1) {
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

    if (!parsedArgs.allowUncommitted) {
      await log.withSpinner('正在检查git状态...', async () => {
        if (hasUncommittedChanges()) {
          throw new Error('检测到未提交的更改')
        }
      }, {
        succeedText: 'Git状态检查完成',
        failText: 'Git状态检查失败',
      }).catch((error: any) => {
        if (error.message === '检测到未提交的更改') {
          log.error('错误: 存在未提交的Git更改。请先提交或暂存所有更改后再继续。')
          log.info('提示: 您可以使用 git commit 命令提交更改，或使用 git stash 命令暂存更改。')
          log.info('提示: 您也可以使用 --allow-uncommitted (-u) 参数来忽略此检查。')
          process.exit(1)
        }
        throw error
      })
    }

    if (parsedArgs.allowUncommitted && hasUncommittedChanges()) {
      log.warn('警告: 存在未提交的Git更改，您选择了忽略此检查。请注意这可能导致不一致的版本状态。')
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
      for (const [packageName, selection] of Object.entries(packageVersionSelections)) {
        await log.withSpinner(`正在更新包 ${packageName}...`, async () => {
          await versionManager.updateVersion(packageName, selection.type, {
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
      }

      if (!parsedArgs.dryRun && parsedArgs.autoCommit) {
        await versionManager.gitCommitAndPush(parsedArgs.push)
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
