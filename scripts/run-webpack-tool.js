const { spawnSync } = require('child_process')
const path = require('path')

const toolName = process.argv[2]
const args = process.argv.slice(3)

if (!toolName) {
  console.error('Usage: node scripts/run-webpack-tool.js <tool> [...args]')
  process.exit(1)
}

const executable = path.join(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? toolName + '.cmd' : toolName
)

const result = spawnSync(executable, args, {
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status === null ? 1 : result.status)
