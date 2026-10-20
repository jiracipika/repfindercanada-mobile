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
assert.equal(version, '3.3.6');
assert.equal(versionCode, 503006);
assert.ok(gradle.includes(`versionName "${version}"`));
assert.ok(readFileSync('client/src/version.ts', 'utf8').includes(`'${version}'`));
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
