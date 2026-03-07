// Set n8n owner password using n8n's bcrypt + Python sqlite3
const bcrypt = require('/usr/local/lib/node_modules/n8n/node_modules/bcryptjs');
const { execSync } = require('child_process');

const EMAIL = 'jonathanperlin@gmail.com';
const PASSWORD = 'BeeN8n2026';
const DB_PATH = '/root/.n8n/database.sqlite';

// Hash the password
const hash = bcrypt.hashSync(PASSWORD, 10);
console.log('Generated hash:', hash.substring(0, 30) + '...');

// Verify hash works
const match = bcrypt.compareSync(PASSWORD, hash);
console.log('Hash verification:', match);

// Update database via sqlite3 CLI
const sql = `UPDATE user SET email='${EMAIL}', password='${hash}', firstName='Yonatan', lastName='Perlin';`;
execSync(`sqlite3 ${DB_PATH} "${sql}"`);
console.log('Database updated');

// Read back and verify
const row = execSync(`sqlite3 ${DB_PATH} "SELECT password FROM user;"`).toString().trim();
const finalMatch = bcrypt.compareSync(PASSWORD, row);
console.log('Final verification against DB:', finalMatch);

console.log('Done! Restart n8n and login with:', EMAIL, '/', PASSWORD);
