#!/usr/bin/env node
/**
 * Assigns or removes the `admin` custom claim for a Firebase Auth user.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json \
 *   node tools/set-admin-claim.js --uid <UID> [--project <projectId>] [--revoke]
 */

const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { revoke: false };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--uid') {
      args.uid = argv[++i];
    } else if (value === '--project') {
      args.project = argv[++i];
    } else if (value === '--revoke') {
      args.revoke = true;
    }
  }
  return args;
}

const options = parseArgs(process.argv.slice(2));

if (!options.uid) {
  console.error('Missing required flag: --uid <UID>');
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: options.project,
});

async function main() {
  const adminEnabled = !options.revoke;
  const record = await admin.auth().getUser(options.uid);
  const claims = { ...(record.customClaims || {}) };
  if (adminEnabled) {
    claims.admin = true;
  } else {
    delete claims.admin;
  }
  await admin.auth().setCustomUserClaims(options.uid, claims);
  console.log(`Updated ${options.uid}: admin=${adminEnabled}`);
}

main().catch((error) => {
  console.error('Failed to update custom claims:', error.message);
  process.exit(1);
});
