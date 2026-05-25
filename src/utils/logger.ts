import type { Ora } from 'ora'
import ora from 'ora'

// 简单的日志函数，直接输出到控制台
export function setLevel(_level: string): void {
  // 保留接口，但不实际使用
}

export function debug(message: string): void {
  console.log(`🐛 ${message}`)
}

export function info(message: string): void {
  console.log(`ℹ ${message}`)
}

export function success(message: string): void {
  console.log(`✔ ${message}`)
}

export function warn(message: string): void {
  console.log(`⚠ ${message}`)
}

export function error(message: string): void {
  console.log(`✖ ${message}`)
}

export function dryRun(message: string): void {
  console.log(`[dry-run] ${message}`)
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options: { succeedText?: string, failText?: string } = {},
): Promise<T> {
  const spinner = ora(text).start()

  try {
    const result = await fn()
    spinner.succeed(options.succeedText || text)
    console.log('') // 空行分隔
    return result
  }
  catch (error) {
    spinner.fail(options.failText || text)
    console.log('') // 空行分隔
    throw error
  }
}

export default {
  setLevel,
  debug,
  info,
  success,
  warn,
  error,
  dryRun,
  withSpinner,
}
