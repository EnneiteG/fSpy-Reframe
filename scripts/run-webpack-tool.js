const { spawnSync } = require('child_process')
const path = require('path')

const toolName = process.argv[2]
const args = process.argv.slice(3)

if (!toolName) {
  console.error('Usage: node scripts/run-webpack-tool.js <tool> [...args]')
  process.exit(1)
}

const env = { ...process.env }
const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10)

if (nodeMajorVersion >= 17) {
  const legacyProviderFlag = '--openssl-legacy-provider'
  const existingNodeOptions = env.NODE_OPTIONS || ''
  if (!existingNodeOptions.includes(legacyProviderFlag)) {
    env.NODE_OPTIONS = existingNodeOptions
      ? existingNodeOptions + ' ' + legacyProviderFlag
      : legacyProviderFlag
  }
}

const executable = path.join(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? toolName + '.cmd' : toolName
)

const result = spawnSync(executable, args, {
  env: env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status === null ? 1 : result.status)
