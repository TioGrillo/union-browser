const bytenode = require('bytenode');
const fs = require('fs');
const path = require('path');

const mainJsPath = path.resolve(__dirname, '../dist/main/index.js');
const mainJscPath = path.resolve(__dirname, '../dist/main/index.jsc');
const bootstrapPath = path.resolve(__dirname, '../dist/main/bootstrap.js');

if (!fs.existsSync(mainJsPath)) {
  console.error("main/index.js not found!");
  process.exit(1);
}

try {
  // Compile JS to V8 Bytecode
  bytenode.compileFile({
    filename: mainJsPath,
    output: mainJscPath,
    compileAsModule: true
  });

  // Delete the original plaintext JS file
  fs.unlinkSync(mainJsPath);

  // Create a bootstrap file that loads the bytecode
  const bootstrapCode = `
require('bytenode');
require('./index.jsc');
  `.trim();
  
  fs.writeFileSync(bootstrapPath, bootstrapCode);
  console.log("Bytenode compilation successful. Protected main process.");
  process.exit(0);
} catch (error) {
  console.error("Bytenode compilation failed:", error);
  process.exit(1);
}
