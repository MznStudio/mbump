import type { SemVer } from 'semver'
import semver from 'semver'

export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null
}

export function parseVersion(version: string): SemVer | null {
  return semver.parse(version)
}

export function parseVersionInfo(version: string): { major: number; minor: number; patch: number } | null {
  const parsed = semver.parse(version)
  if (!parsed)
    return null
  return { major: parsed.major, minor: parsed.minor, patch: parsed.patch }
}

export function incrementVersion(currentVersion: string, releaseType: string, identifier?: string): string | null {
  if (identifier) {
    return semver.inc(currentVersion, releaseType as semver.ReleaseType, identifier)
  }
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

/** @deprecated Use parseVersionInfo() instead */
export function getMajor(version: string): number | null {
  const parsed = semver.parse(version)
  return parsed?.major ?? null
}

/** @deprecated Use parseVersionInfo() instead */
export function getMinor(version: string): number | null {
  const parsed = semver.parse(version)
  return parsed?.minor ?? null
}

/** @deprecated Use parseVersionInfo() instead */
export function getPatch(version: string): number | null {
  const parsed = semver.parse(version)
  return parsed?.patch ?? null
}
