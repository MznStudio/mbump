import type { Ora } from 'ora'
import { consola } from 'consola'
import ora from 'ora'

const logger = consola

// 消息收集器，用于在 spinner 运行期间收集消息
let messageBuffer: string[] = []
let isBuffering = false

export function setLevel(level: string): void {
  logger.level = level === 'debug' ? 4 : 3
}

export function debug(message: string): void {
  logger.debug(message)
}

export function info(message: string): void {
  if (isBuffering) {
    messageBuffer.push(message)
  }
  else {
    logger.info(message)
  }
}

export function success(message: string): void {
  if (isBuffering) {
    messageBuffer.push(message)
  }
  else {
    logger.success(message)
  }
}

export function warn(message: string): void {
  logger.warn(message)
}

export function error(message: string): void {
  logger.error(message)
}

export function dryRun(message: string): void {
  if (isBuffering) {
    messageBuffer.push(`[dry-run] ${message}`)
  }
  else {
    logger.info(`[dry-run] ${message}`)
  }
}

function startBuffering(): void {
  messageBuffer = []
  isBuffering = true
}

function stopBuffering(): string[] {
  isBuffering = false
  const messages = [...messageBuffer]
  messageBuffer = []
  return messages
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options: { succeedText?: string, failText?: string } = {},
): Promise<T> {
  const spinner: Ora = ora(text).start()
  startBuffering()

  try {
    const result = await fn()
    spinner.succeed(options.succeedText || text)

    // 输出收集的消息
    const messages = stopBuffering()
    messages.forEach(msg => logger.info(msg))

    return result
  }
  catch (error) {
    stopBuffering()
    spinner.fail(options.failText || text)
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
