import { resolve } from 'node:path'

export function isPathLike(arg: string): boolean {
  return (
    arg.startsWith('./')
    || arg.startsWith('../')
    || arg.startsWith('.\\')
    || arg.startsWith('..\\')
    || arg.startsWith('/')
    || arg.startsWith('\\')
    || /^[A-Z]:[\\/].*/i.test(arg)
    || arg.startsWith('~')
    || arg === '.'
    || arg.startsWith('\\\\')
    || arg.startsWith('//')
    || arg.includes('/')
    || arg.includes('\\')
    || arg.includes('.')
  )
}

export function resolvePath(basePath: string, targetPath: string): string {
  // const { resolve } = require('node:path')
  if (targetPath.startsWith('/') || /^[a-z]:\\/i.test(targetPath)) {
    return resolve(targetPath)
  }
  return resolve(basePath, targetPath)
}

export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[a-z]:\\/i.test(path) || path.startsWith('\\\\') || path.startsWith('//')
}
