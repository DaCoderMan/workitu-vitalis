// Set n8n owner password - writes hash to file, uses Python to update DB
const bcrypt = require('/usr/local/lib/node_modules/n8n/node_modules/bcryptjs');
const fs = require('fs');
const { execSync } = require('child_process');

const PASSWORD = 'BeeN8n2026';

// Hash the password
const hash = bcrypt.hashSync(PASSWORD, 10);
console.log('Generated hash:', hash);

// Write hash to temp file (avoid shell escaping issues)
fs.writeFileSync('/tmp/n8n-hash.txt', hash);
console.log('Hash written to /tmp/n8n-hash.txt');

// Use Python to update DB (avoids shell interpolation of $)
const pyScript = `
import sqlite3
with open('/tmp/n8n-hash.txt') as f:
    pw_hash = f.read().strip()
conn = sqlite3.connect('/root/.n8n/database.sqlite')
conn.execute("UPDATE user SET email=?, password=?, firstName=?, lastName=?",
    ("jonathanperlin@gmail.com", pw_hash, "Yonatan", "Perlin"))
conn.commit()
row = conn.execute("SELECT password FROM user").fetchone()
conn.close()
print("Stored hash:", row[0])
`;
fs.writeFileSync('/tmp/n8n-update-db.py', pyScript);
execSync('python3 /tmp/n8n-update-db.py', { stdio: 'inherit' });

// Read back from DB and verify
const pyVerify = `
import sqlite3
conn = sqlite3.connect('/root/.n8n/database.sqlite')
row = conn.execute("SELECT password FROM user").fetchone()
conn.close()
with open('/tmp/n8n-stored-hash.txt', 'w') as f:
    f.write(row[0])
`;
fs.writeFileSync('/tmp/n8n-verify-db.py', pyVerify);
execSync('python3 /tmp/n8n-verify-db.py');

const storedHash = fs.readFileSync('/tmp/n8n-stored-hash.txt', 'utf8').trim();
const finalMatch = bcrypt.compareSync(PASSWORD, storedHash);
console.log('Final verification:', finalMatch);
console.log('Original hash:', hash);
console.log('Stored hash:  ', storedHash);
console.log('Match:', hash === storedHash);
