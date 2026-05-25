import { describe, it, expect } from 'vitest'
import { validatePath, validateCommand, sanitizeFileName } from '../src/utils/security'

describe('security utilities', () => {
  describe('validatePath', () => {
    it('should validate safe paths', () => {
      // 使用resolve后的路径测试
      expect(validatePath('D:\\project\\src\\index.ts', 'D:\\project')).toBe(true)
      expect(validatePath('D:\\project\\packages\\foo\\package.json', 'D:\\project')).toBe(true)
    })

    it('should reject path traversal attacks', () => {
      expect(validatePath('D:\\etc\\passwd', 'D:\\project')).toBe(false)
      expect(validatePath('D:\\project\\..\\etc\\passwd', 'D:\\project')).toBe(false)
      expect(validatePath('D:\\project\\src\\..\\..\\root', 'D:\\project')).toBe(false)
    })
  })

  describe('validateCommand', () => {
    it('should allow safe commands', () => {
      expect(validateCommand('pnpm publish --access public')).toBe(true)
      expect(validateCommand('npm publish')).toBe(true)
      expect(validateCommand('git push origin main')).toBe(true)
    })

    it('should reject dangerous commands with operators', () => {
      // 只检查危险的命令连接符模式
      expect(validateCommand('rm -rf /; ls')).toBe(false)
      expect(validateCommand('cat /etc/passwd && whoami')).toBe(false)
    })
  })

  describe('sanitizeFileName', () => {
    it('should sanitize dangerous characters', () => {
      expect(sanitizeFileName('file<name>.txt')).toBe('file_name_.txt')
      expect(sanitizeFileName('file:name.txt')).toBe('file_name.txt')
    })
  })
})
