import { describe, it, expect } from 'vitest'
import { isValidVersion, incrementVersion, compareVersions } from '@/utils/semver'

describe('semver utilities', () => {
  describe('isValidVersion', () => {
    it('should return true for valid semver versions', () => {
      expect(isValidVersion('1.0.0')).toBe(true)
      expect(isValidVersion('1.0.0-beta.1')).toBe(true)
      expect(isValidVersion('2.3.4-rc.0')).toBe(true)
      expect(isValidVersion('v1.0.0')).toBe(true) // semver accepts v prefix
    })

    it('should return false for invalid versions', () => {
      expect(isValidVersion('1.0')).toBe(false)
      expect(isValidVersion('invalid')).toBe(false)
      expect(isValidVersion('')).toBe(false)
    })
  })

  describe('incrementVersion', () => {
    it('should increment major version', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0')
    })

    it('should increment minor version', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0')
    })

    it('should increment patch version', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4')
    })

    it('should handle prerelease versions', () => {
      expect(incrementVersion('1.0.0-rc.0', 'prerelease')).toBe('1.0.0-rc.1')
    })
  })

  describe('compareVersions', () => {
    it('should compare versions correctly', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1)
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1)
    })
  })
})
