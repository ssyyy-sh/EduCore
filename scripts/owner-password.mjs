// Set the hidden Owner account's email and password.
//   npm run owner-password -- "New-Password-Here"
//   npm run owner-password -- "New-Password-Here" owner@myschool.uz
// Only a hash of the password is written to src/config.js. Then run `npm run build:docs` and push.
import { readFileSync, writeFileSync } from 'fs';
import { hashPassword } from '../src/lib/hash.js';

const [password, emailArg] = process.argv.slice(2);
if (!password || password.length < 12) {
  console.error('Give a password of at least 12 characters:  npm run owner-password -- "Your-Password"');
  process.exit(1);
}
const file = 'src/config.js';
let src = readFileSync(file, 'utf8');
const email = (emailArg || src.match(/OWNER_ACCOUNT = \{[^}]*email: '([^']+)'/s)?.[1] || '').trim().toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Email not found or not valid.');
  process.exit(1);
}
src = src.replace(/(OWNER_ACCOUNT = \{[^}]*email: ')[^']*(')/s, `$1${email}$2`).replace(/(OWNER_ACCOUNT = \{[^}]*passHash: ')[^']*(')/s, `$1${hashPassword(email, password)}$2`);
writeFileSync(file, src);
console.log(`Owner account updated: ${email}\nNow run: npm run build:docs  (then git add . / commit / push)`);
