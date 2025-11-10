const crypto = require('crypto');

const hash = crypto.createHash('sha256')
  .update('hello world')
  .digest(); // 默认返回 Buffer

console.log(JSON.stringify(hash,null,2));            // <Buffer ...>
console.log(Buffer.isBuffer(hash)); // true
