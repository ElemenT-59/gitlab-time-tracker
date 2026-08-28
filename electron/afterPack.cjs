const { execFileSync } = require('child_process')
const path = require('path')

// electron-builder skips code signing entirely when no paid Apple Developer ID
// certificate is installed. An unsigned .app has no stable identity, so macOS
// can't reliably remember TCC/permission decisions (network access, etc.) —
// it re-prompts on every launch. Ad-hoc signing (no Apple account needed)
// gives the bundle a consistent signature so grants persist across launches
// of the same build. Rebuilding produces a new signature, so the very first
// launch after a rebuild may prompt again — that's expected.
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
}
