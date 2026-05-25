import type { Config } from '@/types'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
// import logger from '@/utils/logger'
import { BASE_CONFIG, isValidConfig } from './schema'

function removeJsoncComments(jsoncString: string): string {
  let cleanString = jsoncString.replace(/\/\/.*$/gm, '')
  cleanString = cleanString.replace(/\/\*[\s\S]*?\*\//g, '')
  return cleanString
}

function tryParseYaml(yamlString: string): Record<string, any> | null {
  try {
    const result: Record<string, any> = {}
    const lines = yamlString.split('\n')

    for (let line of lines) {
      const commentIndex = line.indexOf('#')
      if (commentIndex !== -1) {
        line = line.substring(0, commentIndex).trim()
      }

      line = line.trim()
      if (line) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const keyPath = line.substring(0, colonIndex).trim()
          const valueStr = line.substring(colonIndex + 1).trim()
          let value: any = valueStr

          if (value === 'true') {
            value = true
          }
          else if (value === 'false') {
            value = false
          }
          else if (value === 'null') {
            value = null
          }
          else if (!Number.isNaN(Number(value)) && value !== '') {
            value = Number(value)
          }
          else if (value.startsWith('{') || value.startsWith('[')) {
            try {
              value = JSON.parse(value)
            }
            catch {
              // keep original value
            }
          }

          if (keyPath.includes('.')) {
            const parts = keyPath.split('.')
            let current: any = result
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i]
              if (!current[part])
                current[part] = {}
              current = current[part]
            }
            current[parts[parts.length - 1]] = value
          }
          else {
            result[keyPath] = value
          }
        }
      }
    }

    return result
  }
  catch {
    return null
  }
}

function tryParseToml(tomlString: string): Record<string, any> | null {
  try {
    const result: Record<string, any> = {}
    const lines = tomlString.split('\n')

    for (let line of lines) {
      const commentIndex = line.indexOf('#')
      if (commentIndex !== -1) {
        line = line.substring(0, commentIndex).trim()
      }

      line = line.trim()
      if (line) {
        const equalsIndex = line.indexOf('=')
        if (equalsIndex > 0) {
          const keyPath = line.substring(0, equalsIndex).trim()
          const valueStr = line.substring(equalsIndex + 1).trim()
          let value: any = valueStr

          if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith('\'') && value.endsWith('\''))
          ) {
            value = value.slice(1, -1)
          }

          if (value === 'true') {
            value = true
          }
          else if (value === 'false') {
            value = false
          }
          else if (value === 'null') {
            value = null
          }
          else if (!Number.isNaN(Number(value)) && value !== '') {
            value = Number(value)
          }
          else if (value.startsWith('{') || value.startsWith('[')) {
            try {
              value = JSON.parse(value)
            }
            catch {
              // keep original value
            }
          }

          if (keyPath.includes('.')) {
            const parts = keyPath.split('.')
            let current: any = result
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i]
              if (!current[part])
                current[part] = {}
              current = current[part]
            }
            current[parts[parts.length - 1]] = value
          }
          else {
            result[keyPath] = value
          }
        }
      }
    }

    return result
  }
  catch {
    return null
  }
}

interface ConfigParser {
  parse: (content: string, configPath: string) => Partial<Config> | null
}

const parsers: Record<string, ConfigParser> = {
  json: {
    parse(content: string, configPath: string): Partial<Config> | null {
      let jsonContent = content
      if (configPath.endsWith('.jsonc')) {
        jsonContent = removeJsoncComments(content)
      }

      try {
        const parsedConfig = JSON.parse(jsonContent)
        if (configPath.includes('package.json')) {
          return parsedConfig.zbump || parsedConfig.mvbump || parsedConfig.bump || null
        }
        return parsedConfig
      }
      catch {
        return null
      }
    },
  },
  yaml: {
    parse(content: string): Partial<Config> | null {
      return tryParseYaml(content)
    },
  },
  toml: {
    parse(content: string): Partial<Config> | null {
      return tryParseToml(content)
    },
  },
  js: {
    parse(_: string, configPath: string): Partial<Config> | null {
      try {
        const require = createRequire(import.meta.url)
        const jsModule = require(configPath)
        return jsModule.default || jsModule
      }
      catch {
        return null
      }
    },
  },
}

function getFileExtension(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'yml')
    return 'yaml'
  if (ext === 'cjs' || ext === 'mjs')
    return 'js'
  if (ext === 'jsonc')
    return 'json'
  return ext || ''
}

async function loadConfigAsyncImpl(rootDir: string): Promise<{ config: Partial<Config>, path: string | null }> {
  const configPaths = [
    join(rootDir, '.zbump.config.js'),
    join(rootDir, '.zbump.config.cjs'),
    join(rootDir, '.zbump.config.mjs'),
    join(rootDir, '.zbump.config.json'),
    join(rootDir, '.zbump.config.jsonc'),
    join(rootDir, '.zbump.config.yaml'),
    join(rootDir, '.zbump.config.yml'),
    join(rootDir, '.zbump.config.toml'),
    join(rootDir, 'package.json'),
  ]

  for (const configPath of configPaths) {
    try {
      const content = readFileSync(configPath, 'utf8')
      const ext = getFileExtension(configPath)

      if (ext === 'js' && (configPath.endsWith('.mjs') || configPath.endsWith('.js'))) {
        try {
          const absPath = resolve(rootDir, configPath)
          const jsModule = await import(absPath)
          const config = jsModule.default || jsModule
          if (config)
            return { config, path: configPath }
        }
        catch {
          try {
            const require = createRequire(import.meta.url)
            const jsModule = require(configPath)
            const config = jsModule.default || jsModule
            if (config)
              return { config, path: configPath }
          }
          catch {
            continue
          }
        }
      }
      else {
        const parser = parsers[ext]
        if (parser) {
          const config = parser.parse(content, configPath)
          if (config)
            return { config, path: configPath }
        }
      }
    }
    catch {
      continue
    }
  }

  return { config: {}, path: null }
}

function loadConfigSyncImpl(rootDir: string): { config: Partial<Config>, path: string | null } {
  const configPaths = [
    join(rootDir, '.zbump.config.json'),
    join(rootDir, '.zbump.config.jsonc'),
    join(rootDir, '.zbump.config.yaml'),
    join(rootDir, '.zbump.config.yml'),
    join(rootDir, '.zbump.config.toml'),
    join(rootDir, '.zbump.config.js'),
    join(rootDir, '.zbump.config.cjs'),
    join(rootDir, 'package.json'),
  ]

  for (const configPath of configPaths) {
    try {
      const content = readFileSync(configPath, 'utf8')
      const ext = getFileExtension(configPath)
      const parser = parsers[ext]

      if (parser) {
        const config = parser.parse(content, configPath)
        if (config)
          return { config, path: configPath }
      }
    }
    catch {
      continue
    }
  }

  return { config: {}, path: null }
}

function mergeConfig(userConfig: Partial<Config>, rootDir: string): Config {
  const mergedConfig: Config = {
    ...BASE_CONFIG,
    ...(userConfig || {}),
    packagePaths: {
      ...BASE_CONFIG.packagePaths,
      ...(userConfig?.packagePaths || {}),
    },
    defaults: {
      ...BASE_CONFIG.defaults,
      ...(userConfig?.defaults || {}),
    },
    git: {
      ...BASE_CONFIG.git,
      ...(userConfig?.git || {}),
    },
    publish: {
      ...BASE_CONFIG.publish,
      ...(userConfig?.publish || {}),
    },
  }

  if (!isValidConfig(mergedConfig)) {
    throw new Error(
      '配置无效：未找到有效的包路径配置\n'
      + '请创建配置文件并添加至少一个包路径，例如：\n'
      + '```\n'
      + 'packagePaths: {\n'
      + '  components: \'packages/components/package.json\',\n'
      + '  plugins: \'packages/plugins/package.json\'\n'
      + '}\n'
      + '```',
    )
  }

  const resolvedPackagePaths: Record<string, string> = {}
  for (const [name, path] of Object.entries(mergedConfig.packagePaths)) {
    if (path && typeof path === 'string' && !path.startsWith('/') && !path.match(/^[a-z]:\\/i)) {
      resolvedPackagePaths[name] = join(rootDir, path)
    }
    else {
      resolvedPackagePaths[name] = path
    }
  }
  mergedConfig.packagePaths = resolvedPackagePaths

  return mergedConfig
}

export async function loadConfigAsync(rootDir: string): Promise<Config> {
  const { config: userConfig, path: usedConfigPath } = await loadConfigAsyncImpl(rootDir)
  const mergedConfig = mergeConfig(userConfig, rootDir)
  mergedConfig.usedConfigPath = usedConfigPath
  return mergedConfig
}

export function loadConfig(rootDir: string): Config {
  const { config: userConfig, path: usedConfigPath } = loadConfigSyncImpl(rootDir)
  const mergedConfig = mergeConfig(userConfig, rootDir)
  mergedConfig.usedConfigPath = usedConfigPath
  return mergedConfig
}

export default loadConfig
