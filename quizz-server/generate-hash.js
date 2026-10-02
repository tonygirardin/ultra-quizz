const bcrypt = require('bcryptjs');
const pwd = process.argv[2];
if (!pwd) {
  console.error('Usage : node generate-hash.js "TonMotDePasse"');
  process.exit(1);
}
console.log(bcrypt.hashSync(pwd, 10));
