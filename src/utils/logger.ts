import type { Ora } from 'ora'
import { consola } from 'consola'
import ora from 'ora'

const logger = consola

export function setLevel(level: string): void {
  logger.level = level === 'debug' ? 4 : 3
}

export function debug(message: string): void {
  logger.debug(message)
}

export function info(message: string): void {
  logger.info(message)
}

export function success(message: string): void {
  logger.success(message)
}

export function warn(message: string): void {
  logger.warn(message)
}

export function error(message: string): void {
  logger.error(message)
}

export function dryRun(message: string): void {
  logger.info(`[dry-run] ${message}`)
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options: { succeedText?: string, failText?: string } = {},
): Promise<T> {
  const spinner: Ora = ora(text).start()

  try {
    const result = await fn()
    spinner.succeed(options.succeedText || text)
    console.log('')
    return result
  }
  catch (error) {
    spinner.fail(options.failText || text)
    console.log('')
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
