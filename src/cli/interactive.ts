import type { Config, PackageVersionSelections, ReleaseType } from '@/types'
import inquirer from 'inquirer'
import semver from 'semver'
import { VersionManager } from '@/core/VersionManager'

export async function selectVersionInteractive(
  config: Config,
  _packageName: string,
  currentVersion: string,
): Promise<{ type: ReleaseType, customVersion: string | null }> {
  const choices = [
    { name: `major ${semver.inc(currentVersion, 'major')}`, value: 'major' },
    { name: `minor ${semver.inc(currentVersion, 'minor')}`, value: 'minor' },
    { name: `patch ${semver.inc(currentVersion, 'patch')}`, value: 'patch' },
    { name: `next ${semver.inc(currentVersion, 'patch')}`, value: 'next' },
    { name: `conventional ${semver.inc(currentVersion, 'patch')}`, value: 'conventional' },
    {
      name: `pre-patch ${
        semver.prerelease(currentVersion)
          ? semver.inc(currentVersion, 'prerelease')
          : semver.inc(semver.coerce(currentVersion)!.version, 'prepatch', 'beta')
      }`,
      value: 'pre-patch',
    },
    {
      name: `pre-minor ${semver.inc(semver.coerce(currentVersion)!.version, 'preminor', 'beta')}`,
      value: 'pre-minor',
    },
    {
      name: `pre-major ${semver.inc(semver.coerce(currentVersion)!.version, 'premajor', 'beta')}`,
      value: 'pre-major',
    },
    { name: `as-is ${currentVersion}`, value: 'as-is' },
    { name: 'custom ...', value: 'custom' },
  ]

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'versionType',
      message: `Current version ${currentVersion} »`,
      choices,
      default: config.defaults?.releaseType || 'patch',
    },
  ])

  const selectedType = answers.versionType as ReleaseType
  let customVersion: string | null = null

  if (selectedType === 'custom') {
    const customAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'customVersion',
        message: 'Enter custom version:',
        validate: (input: string) => (semver.valid(input) ? true : 'Please enter a valid semver version'),
      },
    ])
    customVersion = customAnswer.customVersion
  }

  return { type: selectedType, customVersion }
}

export async function selectAllVersionsInteractive(
  config: Config,
  rootDir: string,
): Promise<PackageVersionSelections> {
  const versionManager = new VersionManager({ config, rootDir })
  const allPackageNames = Object.keys(config.packagePaths)
  const selections: PackageVersionSelections = {}

  for (const packageName of allPackageNames) {
    const currentVersion = versionManager.getPackageVersion(packageName)
    if (currentVersion) {
      const selection = await selectVersionInteractive(config, packageName, currentVersion)
      selections[packageName] = selection
    }
  }

  return selections
}
