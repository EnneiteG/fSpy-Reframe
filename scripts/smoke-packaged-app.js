const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const executableName = process.platform === 'win32' ? 'fSpy UE.exe' : 'fSpy UE'
const executablePath = path.resolve(__dirname, '..', 'dist', 'win-unpacked', executableName)

if (!fs.existsSync(executablePath)) {
  console.error(`Packaged app not found at ${executablePath}`)
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(executablePath, [], {
  env,
  stdio: 'ignore',
  detached: false
})

let settled = false

const timeout = setTimeout(() => {
  settled = true
  child.kill()
  console.log('Packaged app smoke launch succeeded')
}, 5000)

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  if (settled) {
    return
  }
  console.error(`Packaged app exited early with code ${code} and signal ${signal}`)
  process.exit(1)
})

child.on('error', (error) => {
  clearTimeout(timeout)
  if (settled) {
    return
  }
  console.error(error)
  process.exit(1)
})
