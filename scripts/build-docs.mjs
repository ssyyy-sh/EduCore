// One command to update the GitHub Pages site: `npm run build:docs`.
// Builds the single-file version and copies it (with icons, manifest, your photos) into docs/.
import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'fs';

execSync('npx vite build --mode single', { stdio: 'inherit' });

rmSync('docs', { recursive: true, force: true });
mkdirSync('docs');
cpSync('dist-single', 'docs', { recursive: true });
writeFileSync('docs/.nojekyll', ''); // GitHub Pages: serve files as they are
// GitHub Pages sends unknown paths to 404.html — show the app there too.
cpSync('docs/index.html', 'docs/404.html');
if (existsSync('CNAME')) cpSync('CNAME', 'docs/CNAME'); // your own domain, if set

console.log(`\ndocs/ is ready: ${readdirSync('docs').join(', ')}`);
console.log('Next: git add . && git commit -m "Update site" && git push');
