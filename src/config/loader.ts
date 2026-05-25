import type { Config } from '@/types'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import logger from '@/utils/logger'
import { BASE_CONFIG, isValidConfig } from './schema'

/**
 * 配置缓存 - 避免重复读取和解析配置文件
 * Key: 项目根目录的绝对路径
 * Value: 配置对象
 */
const configCache = new Map<string, Config>()

/**
 * 清除配置缓存
 * @param rootDir 可选，指定要清除的项目目录，不传则清除所有缓存
 */
export function clearConfigCache(rootDir?: string): void {
  if (rootDir) {
    const cacheKey = resolve(rootDir)
    configCache.delete(cacheKey)
    logger.debug(`已清除配置缓存: ${cacheKey}`)
  }
  else {
    configCache.clear()
    logger.debug('已清除所有配置缓存')
  }
}

/**
 * 获取缓存的配置
 * @param rootDir 项目根目录
 * @returns 缓存的配置，如果不存在则返回 null
 */
function getCachedConfig(rootDir: string): Config | null {
  const cacheKey = resolve(rootDir)
  return configCache.get(cacheKey) || null
}

/**
 * 设置配置缓存
 * @param rootDir 项目根目录
 * @param config 配置对象
 */
function setCachedConfig(rootDir: string, config: Config): void {
  const cacheKey = resolve(rootDir)
  configCache.set(cacheKey, config)
  logger.debug(`已缓存配置: ${cacheKey}`)
}

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
          return parsedConfig.mbump || parsedConfig.mvbump || parsedConfig.bump || null
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
  if (ext === 'cjs' || ext === 'mjs' || ext === 'ts' || ext === 'js')
    return 'js'
  if (ext === 'jsonc')
    return 'json'
  return ext || ''
}

async function loadConfigAsyncImpl(rootDir: string): Promise<{ config: Partial<Config>, path: string | null }> {
  // 定义配置文件优先级列表（从高到低）
  const configPaths = [
    // TypeScript 配置文件（需要 tsx 支持）
    join(rootDir, '.mbump.config.ts'),
    join(rootDir, '.zbump.config.ts'),
    // ES Module 配置文件（.mjs 和 .js with export default）
    join(rootDir, '.mbump.config.mjs'),
    join(rootDir, '.zbump.config.mjs'),
    join(rootDir, '.mbump.config.js'),
    join(rootDir, '.zbump.config.js'),
    // CommonJS 配置文件
    join(rootDir, '.mbump.config.cjs'),
    join(rootDir, '.zbump.config.cjs'),
    // JSON 格式配置文件
    join(rootDir, '.mbump.config.json'),
    join(rootDir, '.zbump.config.json'),
    join(rootDir, '.mbump.config.jsonc'),
    join(rootDir, '.zbump.config.jsonc'),
    // YAML 格式配置文件
    join(rootDir, '.mbump.config.yaml'),
    join(rootDir, '.zbump.config.yaml'),
    join(rootDir, '.mbump.config.yml'),
    join(rootDir, '.zbump.config.yml'),
    // TOML 格式配置文件
    join(rootDir, '.mbump.config.toml'),
    join(rootDir, '.zbump.config.toml'),
    // package.json 中的配置
    join(rootDir, 'package.json'),
  ]

  for (const configPath of configPaths) {
    try {
      const ext = getFileExtension(configPath)

      // 处理 JavaScript/TypeScript 类型的配置文件
      if (ext === 'js') {
        const absPath = resolve(rootDir, configPath)
        let config: any

        try {
          if (configPath.endsWith('.ts')) {
            // TypeScript 配置文件：使用 tsx 注册器
            const require = createRequire(import.meta.url)
            require('tsx')
            const tsModule = require(absPath)
            config = tsModule.default || tsModule
          }
          else if (configPath.endsWith('.mjs')) {
            // ES Module (.mjs)：使用动态 import
            const jsModule = await import(`file://${absPath}`)
            config = jsModule.default || jsModule
          }
          else if (configPath.endsWith('.js')) {
            // .js 文件：优先尝试 ES Module，失败后尝试 CommonJS
            try {
              const jsModule = await import(`file://${absPath}`)
              config = jsModule.default || jsModule
            }
            catch {
              // 如果 ES Module 导入失败，尝试 CommonJS
              const require = createRequire(import.meta.url)
              const cjsModule = require(absPath)
              config = cjsModule.default || cjsModule
            }
          }
          else if (configPath.endsWith('.cjs')) {
            // CommonJS (.cjs)：使用 require
            const require = createRequire(import.meta.url)
            const cjsModule = require(absPath)
            config = cjsModule.default || cjsModule
          }

          // 如果导出的是函数，则调用它获取配置
          if (typeof config === 'function') {
            config = config()
          }

          if (config && typeof config === 'object') {
            return { config, path: configPath }
          }
        }
        catch {
          // 记录错误但继续尝试下一个配置文件
          continue
        }
      }
      else {
        // 处理非 JS 类型的配置文件（JSON, YAML, TOML）
        const content = readFileSync(configPath, 'utf8')
        const parser = parsers[ext]
        if (parser) {
          const config = parser.parse(content, configPath)
          if (config && typeof config === 'object') {
            return { config, path: configPath }
          }
        }
      }
    }
    catch {
      // 文件不存在或读取失败，继续尝试下一个
      continue
    }
  }

  return { config: {}, path: null }
}

function loadConfigSyncImpl(rootDir: string): { config: Partial<Config>, path: string | null } {
  // 定义配置文件优先级列表（从高到低）
  // 注意：同步加载不支持 .ts 和 .mjs（因为它们需要异步导入）
  const configPaths = [
    // CommonJS 配置文件（优先）
    join(rootDir, '.mbump.config.cjs'),
    join(rootDir, '.zbump.config.cjs'),
    // JSON 格式配置文件
    join(rootDir, '.mbump.config.json'),
    join(rootDir, '.zbump.config.json'),
    join(rootDir, '.mbump.config.jsonc'),
    join(rootDir, '.zbump.config.jsonc'),
    // YAML 格式配置文件
    join(rootDir, '.mbump.config.yaml'),
    join(rootDir, '.zbump.config.yaml'),
    join(rootDir, '.mbump.config.yml'),
    join(rootDir, '.zbump.config.yml'),
    // TOML 格式配置文件
    join(rootDir, '.mbump.config.toml'),
    join(rootDir, '.zbump.config.toml'),
    // CommonJS .js 文件（可能包含 ES Module，会尝试兼容处理）
    join(rootDir, '.mbump.config.js'),
    join(rootDir, '.zbump.config.js'),
    // package.json 中的配置
    join(rootDir, 'package.json'),
  ]

  for (const configPath of configPaths) {
    try {
      const ext = getFileExtension(configPath)

      // 处理 JavaScript 类型的配置文件
      if (ext === 'js') {
        try {
          const require = createRequire(import.meta.url)
          const jsModule = require(configPath)
          let config = jsModule.default || jsModule

          // 如果导出的是函数，则调用它获取配置
          if (typeof config === 'function') {
            config = config()
          }

          if (config && typeof config === 'object') {
            return { config, path: configPath }
          }
        }
        catch {
          // 加载失败，继续尝试下一个配置文件
          continue
        }
      }
      else {
        // 处理非 JS 类型的配置文件（JSON, YAML, TOML）
        const content = readFileSync(configPath, 'utf8')
        const parser = parsers[ext]
        if (parser) {
          const config = parser.parse(content, configPath)
          if (config && typeof config === 'object') {
            return { config, path: configPath }
          }
        }
      }
    }
    catch {
      // 文件不存在或读取失败，继续尝试下一个
      continue
    }
  }

  return { config: {}, path: null }
}

function mergeConfig(userConfig: Partial<Config>, rootDir: string): Config {
  const userPackagePaths = userConfig?.packagePaths
  const hasUserPackagePaths = userPackagePaths && Object.keys(userPackagePaths).length > 0

  const mergedConfig: Config = {
    ...BASE_CONFIG,
    ...(userConfig || {}),
    packagePaths: hasUserPackagePaths
      ? { ...BASE_CONFIG.packagePaths, ...userPackagePaths }
      : BASE_CONFIG.packagePaths,
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
    if (path && typeof path === 'string' && !path.startsWith('/') && !/^[a-z]:\\/i.test(path)) {
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
  // 检查缓存
  const cached = getCachedConfig(rootDir)
  if (cached) {
    logger.debug('使用缓存的配置')
    return cached
  }

  const { config: userConfig, path: usedConfigPath } = await loadConfigAsyncImpl(rootDir)

  if (usedConfigPath) {
    logger.success(`配置加载完成 (配置文件: ${usedConfigPath})`)
  }
  else {
    logger.warn('未找到配置文件，将使用默认配置')
  }

  const mergedConfig = mergeConfig(userConfig, rootDir)
  mergedConfig.usedConfigPath = usedConfigPath

  // 设置缓存
  setCachedConfig(rootDir, mergedConfig)

  return mergedConfig
}

export function loadConfig(rootDir: string): Config {
  // 检查缓存
  const cached = getCachedConfig(rootDir)
  if (cached) {
    logger.debug('使用缓存的配置')
    return cached
  }

  const { config: userConfig, path: usedConfigPath } = loadConfigSyncImpl(rootDir)

  if (usedConfigPath) {
    logger.success(`配置加载完成 (配置文件: ${usedConfigPath})`)
  }
  else {
    logger.warn('未找到配置文件，将使用默认配置')
  }

  const mergedConfig = mergeConfig(userConfig, rootDir)
  mergedConfig.usedConfigPath = usedConfigPath

  // 设置缓存
  setCachedConfig(rootDir, mergedConfig)

  return mergedConfig
}

export default loadConfig
