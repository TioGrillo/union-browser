const fs = require('fs');
let c = fs.readFileSync('src/main/index.ts', 'utf8');

c = c.replace('{ type: "separator" }', '{ type: "separator" as const }');

const startStr = '    if (acc.proxy) {';
const endStr = '    return true;';
const start = c.indexOf(startStr);
const end = c.indexOf(endStr);

if (start > -1 && end > -1) {
  c = c.slice(0, start) + '    return true;' + c.slice(end + '    return true;'.length);
}

fs.writeFileSync('src/main/index.ts', c);
console.log('Fixed types!');
