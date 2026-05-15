const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const executablePath = resolveExecutablePath()

if (!fs.existsSync(executablePath)) {
  console.error(`Packaged app not found at ${executablePath}`)
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
env.FSPY_SMOKE_TEST = '1'
env.FSPY_SMOKE_IMAGE_PATH = path.resolve(__dirname, '..', 'test_data', 'box.jpg')
env.FSPY_SMOKE_EXPORT_PATH = path.join(os.tmpdir(), `fspy-smoke-camera-parameters-${process.pid}.json`)
const executableArgs = process.platform === 'linux' ? ['--no-sandbox'] : []

if (process.platform === 'linux') {
  env.ELECTRON_DISABLE_SANDBOX = env.ELECTRON_DISABLE_SANDBOX || '1'
}

if (fs.existsSync(env.FSPY_SMOKE_EXPORT_PATH)) {
  fs.unlinkSync(env.FSPY_SMOKE_EXPORT_PATH)
}

const child = spawn(executablePath, executableArgs, {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
})

let settled = false
let output = ''

const timeout = setTimeout(() => {
  settled = true
  child.kill()
  console.error('Packaged app smoke test timed out')
  if (output) {
    console.error(output)
  }
  process.exit(1)
}, 20000)

child.stdout.on('data', (chunk) => {
  output += chunk.toString()
})

child.stderr.on('data', (chunk) => {
  output += chunk.toString()
})

child.on('exit', (code, signal) => {
  clearTimeout(timeout)
  if (settled) {
    return
  }

  if (code !== 0) {
    console.error(`Packaged app smoke test failed with code ${code} and signal ${signal}`)
    if (output) {
      console.error(output)
    }
    process.exit(1)
  }

  if (!fs.existsSync(env.FSPY_SMOKE_EXPORT_PATH)) {
    console.error(`Smoke export was not created at ${env.FSPY_SMOKE_EXPORT_PATH}`)
    process.exit(1)
  }

  const exportData = JSON.parse(fs.readFileSync(env.FSPY_SMOKE_EXPORT_PATH, 'utf8'))
  fs.unlinkSync(env.FSPY_SMOKE_EXPORT_PATH)
  if (typeof exportData.horizontalFieldOfView !== 'number' || typeof exportData.verticalFieldOfView !== 'number') {
    console.error('Smoke export did not contain camera field of view values')
    process.exit(1)
  }

  console.log('Packaged app smoke test succeeded')
})

child.on('error', (error) => {
  clearTimeout(timeout)
  if (settled) {
    return
  }
  console.error(error)
  process.exit(1)
})

function resolveExecutablePath() {
  if (process.env.FSPY_SMOKE_EXECUTABLE_PATH) {
    return path.resolve(process.env.FSPY_SMOKE_EXECUTABLE_PATH)
  }

  const distPath = path.resolve(__dirname, '..', 'dist')
  const executableCandidates = candidatesForPlatform(distPath)
  const executablePath = executableCandidates.find((candidate) => fs.existsSync(candidate))
  if (executablePath) {
    return executablePath
  }

  console.error(`No packaged app executable found. Checked:\n${executableCandidates.join('\n')}`)
  process.exit(1)
}

function candidatesForPlatform(distPath) {
  if (process.platform === 'win32') {
    return [path.join(distPath, 'win-unpacked', 'fSpy Reframe.exe')]
  }

  if (process.platform === 'darwin') {
    const hostArch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const otherArch = hostArch === 'arm64' ? 'x64' : 'arm64'
    return [
      macExecutablePath(distPath, 'mac'),
      macExecutablePath(distPath, `mac-${hostArch}`),
      macExecutablePath(distPath, `mac-${otherArch}`)
    ]
  }

  return [
    path.join(distPath, 'linux-unpacked', 'fspy-reframe'),
    path.join(distPath, 'linux-unpacked', 'fSpy Reframe')
  ]
}

function macExecutablePath(distPath, appDirectory) {
  return path.join(distPath, appDirectory, 'fSpy Reframe.app', 'Contents', 'MacOS', 'fSpy Reframe')
}
