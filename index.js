const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'hello.txt');
try {
  const data = fs.readFileSync(filePath, 'utf8');
  console.log(data);
} catch (err) {
  console.error('Error reading file:', err);
}
