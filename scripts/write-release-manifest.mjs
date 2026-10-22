// Embed auditable source identity in both Capacitor native payloads.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const feature = '13578c843e998ec8f2cc388c830c9d9dfba3342e';
git('merge-base', '--is-ancestor', feature, 'HEAD');
const version = JSON.parse(readFileSync('package.json')).version;
const gradle = readFileSync('android/app/build.gradle', 'utf8');
const versionCode = Number(gradle.match(/versionCode (\d+)/)[1]);
const versionTs = readFileSync('client/src/version.ts', 'utf8');
// Pins are per-release on purpose (the versionCode line has no clean formula:
// 3.3.x = 503000+patch, older codes were sequential). Bump BOTH pins with the
// version bump or this script fails the build with this message.
const expected = { version: '3.3.7', versionCode: 503007 };
assert.equal(version, expected.version,
  `package.json is ${version} — update the 'expected' pins in scripts/write-release-manifest.mjs when bumping the release version`);
assert.equal(versionCode, expected.versionCode,
  `versionCode is ${versionCode} — update the 'expected' pins in scripts/write-release-manifest.mjs when bumping the release version`);
assert.ok(gradle.includes(`versionName "${version}"`));
assert.ok(versionTs.includes(`'${version}'`));
assert.ok(existsSync('dist/public/index.html'), 'Build web assets first');
const manifest = {
  version, androidVersionCode: versionCode,
  iosBuildNumber: process.env.BUILD_NUMBER ? Number(process.env.BUILD_NUMBER) + 1 : null,
  sourceCommit: git('rev-parse', 'HEAD'), requiredFeatureCommit: feature,
  codemagicBuildId: process.env.CM_BUILD_ID || null,
  destinations: ['play:alpha', 'play:internal', 'play:beta', 'apple:TestFlight'],
  productionSubmission: false,
};
writeFileSync('dist/public/release-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
