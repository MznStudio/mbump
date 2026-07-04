import type { SemVer } from 'semver'
import semver from 'semver'

export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null
}

export function parseVersion(version: string): SemVer | null {
  return semver.parse(version)
}

export function incrementVersion(currentVersion: string, releaseType: string): string | null {
  return semver.inc(currentVersion, releaseType as semver.ReleaseType)
}

export function compareVersions(v1: string, v2: string): number {
  return semver.compare(v1, v2)
}

export function getVersionDiff(oldVersion: string, newVersion: string): string | null {
  if (!semver.valid(oldVersion) || !semver.valid(newVersion)) {
    return null
  }

  if (semver.major(newVersion) > semver.major(oldVersion))
    return 'major'
  if (semver.minor(newVersion) > semver.minor(oldVersion))
    return 'minor'
  if (semver.patch(newVersion) > semver.patch(oldVersion))
    return 'patch'
  return null
}

export function isPrerelease(version: string): boolean {
  return semver.prerelease(version) !== null
}

export function coerceVersion(version: string): string | null {
  const coerced = semver.coerce(version)
  return coerced?.version || null
}

export function getMajor(version: string): number | null {
  const parsed = semver.parse(version)
  return parsed?.major ?? null
}

export function getMinor(version: string): number | null {
  const parsed = semver.parse(version)
  return parsed?.minor ?? null
}

export function getPatch(version: string): number | null {
  const parsed = semver.parse(version)
  return parsed?.patch ?? null
}
