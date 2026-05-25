import { resolve } from 'node:path'

export function validatePath(path: string, rootDir: string): boolean {
  const resolvedPath = resolve(path)
  return resolvedPath.startsWith(rootDir)
}

export function validateCommand(command: string): boolean {
  const dangerousPatterns = [
    /;\s*[a-z0-9]/i,
    /\|\|\s*[a-z0-9]/i,
    /&&\s*[a-z0-9]/i,
    /\$\(.*\)/,
    /`.*`/,
    /\|\s*[a-z0-9]/i,
  ]

  return !dangerousPatterns.some(pattern => pattern.test(command))
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_')
}
