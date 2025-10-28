#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const functionsDir = path.resolve(__dirname, "..", "functions");
const sdkPackageJson = path.join(functionsDir, "node_modules", "firebase-functions", "package.json");

if (existsSync(sdkPackageJson)) {
  console.log("Firebase Functions dependencies already installed. Skipping npm install.");
  process.exit(0);
}

const hasLockFile = existsSync(path.join(functionsDir, "package-lock.json"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmArgs = hasLockFile ? ["ci"] : ["install"];

console.log(`Installing Firebase Functions dependencies with npm ${npmArgs[0]}...`);
execFileSync(npmCommand, npmArgs, { cwd: functionsDir, stdio: "inherit" });

