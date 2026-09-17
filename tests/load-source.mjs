import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

// Transpile in memory: no generated files and no browser/network bootstrap.
export function loadSource(url, overrides = {}) {
  const file = fileURLToPath(url);
  const require = createRequire(url);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)((id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.startsWith('.')) {
      const base = path.resolve(path.dirname(file), id);
      const target = [base, `${base}.ts`, `${base}.tsx`].find(candidate => /\.tsx?$/.test(candidate) && fs.existsSync(candidate));
      if (target) return loadSource(pathToFileURL(target), overrides);
    }
    return require(id);
  }, module, module.exports);
  return module.exports;
}
