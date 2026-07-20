import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', 'build'], {
  cwd: process.cwd(),
  env: { ...process.env, ANALYZE: 'true' },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
