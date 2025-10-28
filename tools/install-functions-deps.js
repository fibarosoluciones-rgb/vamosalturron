#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const resourceDir = (() => {
  if (process.argv[2]) {
    return path.resolve(process.argv[2]);
  }
  if (process.env.RESOURCE_DIR) {
    return path.resolve(process.env.RESOURCE_DIR);
  }
  return path.resolve(__dirname, '..', 'functions');
})();

if (!fs.existsSync(resourceDir)) {
  console.error(`Cannot install dependencies: "${resourceDir}" does not exist.`);
  process.exit(1);
}

const lockfilePath = path.join(resourceDir, 'package-lock.json');
const manifestPath = path.join(resourceDir, 'package.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`Cannot install dependencies: missing package.json in ${resourceDir}`);
  process.exit(1);
}

const installArgs = fs.existsSync(lockfilePath) ? ['ci'] : ['install'];

const result = spawnSync('npm', installArgs, {
  cwd: resourceDir,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

