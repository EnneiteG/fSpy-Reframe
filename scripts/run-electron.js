const { spawn } = require('child_process')
const path = require('path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const executable = path.join(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
)

const result = spawn(executable, process.argv.slice(2), {
  env: env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
})

result.on('close', (code) => {
  process.exit(code === null ? 1 : code)
})

result.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})
