// 测试 Uint8Array 原生迭代器的行为
const arr = new Uint8Array([1, 2, 3]);
const iter = arr[Symbol.iterator]();

console.log('=== Uint8Array 迭代器测试 ===');

// 1. Object.keys
console.log('Object.keys(iter):', Object.keys(iter));

// 2. hasOwnProperty
console.log('iter.hasOwnProperty("next"):', iter.hasOwnProperty('next'));

// 3. for...in
const keys = [];
for (const key in iter) {
  keys.push(key);
  console.log('Found key:', key);
}
console.log('Total for...in keys:', keys.length);

// 4. 测试 Buffer 迭代器
const { Buffer } = require('buffer');
const buf = Buffer.from([1, 2, 3]);
const bufIter = buf[Symbol.iterator]();

console.log('\n=== Buffer 迭代器测试 ===');
console.log('Object.keys(bufIter):', Object.keys(bufIter));
console.log('bufIter.hasOwnProperty("next"):', bufIter.hasOwnProperty('next'));

const bufKeys = [];
for (const key in bufIter) {
  bufKeys.push(key);
  console.log('Found key:', key);
}
console.log('Total for...in keys:', bufKeys.length);

return {
  uint8ArrayIterForIn: keys.length,
  bufferIterForIn: bufKeys.length,
  success: keys.length === 0 && bufKeys.length === 0
};
