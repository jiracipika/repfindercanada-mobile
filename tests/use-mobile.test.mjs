import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../client/src/hooks/use-mobile.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});

// Run only the initial render, before passive effects. This is precisely the
// lifecycle boundary that used to report desktop on a newly mounted phone sheet.
for (const [width, expected] of [[320, true], [390, true], [767, true], [768, false], [820, false], [1440, false]]) {
  test(`first render at ${width}px reports mobile=${expected} before effects`, () => {
    const exports = {};
    runInNewContext(outputText, {
      exports,
      window: { innerWidth: width },
      require(name) {
        assert.equal(name, 'react');
        return {
          useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
          useEffect: () => {},
        };
      },
    });
    assert.equal(exports.useIsMobile(), expected);
  });
}
