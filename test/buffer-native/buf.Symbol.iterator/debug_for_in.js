const { Buffer } = require('buffer');

const buf = Buffer.from([1, 2, 3]);
const iter = buf[Symbol.iterator]();

console.log('Object.keys:', Object.keys(iter));
console.log('Object.getOwnPropertyNames:', Object.getOwnPropertyNames(iter));

let keys = [];
for (const key in iter) {
  keys.push(key);
  console.log('for...in found key:', key);
}

console.log('Total for...in keys:', keys.length);
console.log('Keys:', keys);

// 检查属性描述符
if (keys.length > 0) {
  keys.forEach(key => {
    const desc = Object.getOwnPropertyDescriptor(iter, key);
    console.log(`Descriptor for "${key}":`, desc);
  });
}

return {
  ownKeys: Object.keys(iter),
  ownProps: Object.getOwnPropertyNames(iter),
  forInKeys: keys,
  success: keys.length === 0
};
