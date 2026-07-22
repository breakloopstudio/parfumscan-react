const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'migration-bg-run.log');
const logFd = fs.openSync(logPath, 'a');
fs.writeSync(logFd, `\n=== Started at ${new Date().toISOString()} ===\n`);

const child = spawn('cmd', ['/c', 'npx', 'tsx', 'scripts/migrate-bgremoval.ts'], {
  detached: true,
  stdio: ['ignore', logFd, logFd],
  cwd: __dirname,
});

child.unref();
console.log('Launched — check: node -p "JSON.parse(require(\'fs\').readFileSync(\'migration-bg-progress.json\',\'utf-8\')).converted.length"');
