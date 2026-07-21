const fs = require('fs');
let c = fs.readFileSync('src/main/index.ts', 'utf8');

const startStr = '    if (acc.proxy) {';
const endStr = '    return true;\n  });';
const start = c.indexOf(startStr);
const end = c.indexOf(endStr);

if (start > -1 && end > -1) {
  c = c.slice(0, start) + endStr + c.slice(end + endStr.length);
}

fs.writeFileSync('src/main/index.ts', c);
console.log('Fixed proxy TS errors!');
