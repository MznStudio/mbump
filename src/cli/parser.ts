import type { DefaultsConfig, ParsedArgs, ReleaseType } from '@/types'
import { isPathLike } from '@/utils/path'

export function parseArgs(args: string[], defaults: DefaultsConfig = {}): ParsedArgs {
  const parsed: ParsedArgs = {
    package: null,
    projectPath: null,
    type: undefined,
    dryRun: defaults.dryRun || false,
    help: false,
    version: false,
    verbose: defaults.verbose || false,
    autoCommit: (defaults as any).git?.autoCommit !== false,
    push: (defaults as any).git?.push !== false,
    allowUncommitted: defaults.allowUncommitted || false,
    npm: defaults.npm || false,
    showConfig: false,
    rust: false,
    tag: (defaults as any).git?.tag !== false,
    tagPrefix: (defaults as any).git?.tagPrefix || 'v',
    changelog: (defaults as any).git?.changelog !== false,
  }

  const allowedTypes: ReleaseType[] = [
    'major',
    'minor',
    'patch',
    'pre-patch',
    'pre-minor',
    'pre-major',
    'as-is',
    'next',
    'conventional',
  ]

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '--dry-run' || arg === '-d') {
      parsed.dryRun = true
      i++
    }
    else if (arg === '--verbose' || arg === '-v') {
      parsed.verbose = true
      i++
    }
    else if (arg === '--no-commit' || arg === '-n') {
      parsed.autoCommit = false
      i++
    }
    else if (arg === '--no-push' || arg === '-p') {
      parsed.push = false
      i++
    }
    else if (arg === '--allow-uncommitted' || arg === '-u') {
      parsed.allowUncommitted = true
      i++
    }
    else if (arg === '--npm' || arg === '-N') {
      parsed.npm = true
      i++
    }
    else if (arg === '--show-config' || arg === '-c') {
      parsed.showConfig = true
      i++
    }
    else if (arg === '--rust' || arg === '-r') {
      parsed.rust = true
      i++
    }
    else if (arg === '--version' || arg === '-V') {
      parsed.version = true
      i++
    }
    else if (arg === '--type' || arg === '-t') {
      if (i + 1 < args.length) {
        const typeValue = args[i + 1] as ReleaseType
        if (allowedTypes.includes(typeValue)) {
          parsed.type = typeValue
          i += 2
        }
        else {
          throw new Error(`不支持的版本类型: ${typeValue}，支持的类型: ${allowedTypes.join(', ')}`)
        }
      }
      else {
        throw new Error('--type 参数需要一个值')
      }
    }
    else if (arg.startsWith('--type=') || arg.startsWith('-t=')) {
      const typeValue = arg.split('=')[1] as ReleaseType
      if (allowedTypes.includes(typeValue)) {
        parsed.type = typeValue
      }
      else {
        throw new Error(`不支持的版本类型: ${typeValue}，支持的类型: ${allowedTypes.join(', ')}`)
      }
      i++
    }
    else if (!arg.startsWith('-')) {
      if (!parsed.projectPath && !parsed.package) {
        if (isPathLike(arg)) {
          parsed.projectPath = arg
        }
        else {
          parsed.package = arg
        }
      }
      else if (allowedTypes.includes(arg as ReleaseType)) {
        parsed.type = arg as ReleaseType
      }
      else if (!parsed.package && !isPathLike(arg)) {
        parsed.package = arg
      }
      i++
    }
    else {
      i++
    }
  }

  return parsed
}
