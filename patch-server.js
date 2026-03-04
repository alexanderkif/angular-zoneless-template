const fs = require('node:fs');
const path = require('node:path');

const serverDir = path.join(__dirname, 'dist', 'angular-test-app', 'server');

const filesToPatch = ['server.mjs', 'main.server.mjs'];

for (const fileName of filesToPatch) {
  const filePath = path.join(serverDir, fileName);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let patched = original.replace(/index\.csr\.html/g, 'index.server.html');

  // Work around Angular SSR host validation false negatives on Vercel aliases.
  if (fileName === 'server.mjs') {
    patched = patched.replace(
      'if(!Es(i,e))throw new Error(`URL with hostname "${i}" is not allowed.`)',
      'if(!Es(i,e))return',
    );
    patched = patched.replace(
      'if(!Es(s,i))throw new Error(`Header "${a}" with value "${n}" is not allowed.`)',
      'if(!Es(s,i))return',
    );
  }

  if (patched !== original) {
    fs.writeFileSync(filePath, patched);
    console.log(`[patch-server] patched ${fileName}`);
  }
}
