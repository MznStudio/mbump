import { VersionManager } from './src/core/VersionManager'
import { join, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import * as toml from 'toml'

const rootDir = resolve('./rust-test')
const cargoTomlPath = join(rootDir, 'Cargo.toml')

if (!existsSync(cargoTomlPath)) {
  console.error('Cargo.toml not found')
  process.exit(1)
}

const content = readFileSync(cargoTomlPath, 'utf8')
const parsed = toml.parse(content) as Record<string, any>
const packageName = parsed.package?.name || 'rust'

const versionManager = new VersionManager({
  rootDir,
  projectType: 'rust',
  config: {
    packagePaths: {
      [packageName]: cargoTomlPath,
    },
    defaults: {
      releaseType: 'patch',
    },
    git: {
      autoCommit: true,
      push: true,
      tag: true,
      changelog: true,
    },
  },
})

console.log('=== Rust Version Manager Flow Test ===')
console.log('currentVersion:', versionManager.getPackageVersion(packageName))
console.log('packageName:', packageName)