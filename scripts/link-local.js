import { spawnSync } from 'child_process';
import { existsSync, lstatSync, mkdirSync, symlinkSync } from 'fs';
import path from 'path';

/*
  Links the sibling checkouts into node_modules for local development, without touching package.json
  or the lock file (never commit a `file:` specifier).

  npm links the required ones. kempo-payments is not a peer of this package but commerce needs it, so it is linked too. The optional
  extensions commerce can use (kempo-credits, kempo-store-credit, kempo-tax) are linked directly. A directory junction is used because it needs no elevated rights on Windows; on
  other systems it is an ordinary symlink. Nothing here ever deletes anything: to unlink one, remove
  the link itself, not what it points to.
*/

const root = path.resolve(import.meta.dirname, '..');
const required = ['kempo', 'kempo-server', 'kempo-ui', 'kempo-products', 'kempo-payments', 'kempo-commerce'];
const optional = ['kempo-credits', 'kempo-store-credit', 'kempo-tax'];

const result = spawnSync('npm', ['install', ...required.map(name => `../${name}`), '--no-save', '--no-legacy-peer-deps', '--force'], { cwd: root, stdio: 'inherit', shell: true });
if(result.status !== 0) process.exit(result.status ?? 1);

mkdirSync(path.join(root, 'node_modules'), { recursive: true });
for(const name of optional){
  const target = path.resolve(root, '..', name);
  const link = path.join(root, 'node_modules', name);
  if(!existsSync(target)){
    console.warn(`[link-local] ${name} is not checked out next to this repository; skipped`);
    continue;
  }
  try {
    lstatSync(link);
    console.log(`[link-local] ${name} is already linked`);
    continue;
  } catch { /* not there yet */ }
  symlinkSync(target, link, 'junction');
  console.log(`[link-local] linked ${name}`);
}
