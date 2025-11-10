const { Buffer } = require('buffer');

const buf = Buffer.from([1, 2, 3]);

// 打印 Symbol.iterator 和 values
console.log('buf[Symbol.iterator]:', buf[Symbol.iterator]);
console.log('buf.values:', buf.values);
console.log('Are they the same?', buf[Symbol.iterator] === buf.values);

// 再次获取看是否是同一个引用
const iter1 = buf[Symbol.iterator];
const iter2 = buf[Symbol.iterator];
const values1 = buf.values;
const values2 = buf.values;

console.log('iter1 === iter2?', iter1 === iter2);
console.log('values1 === values2?', values1 === values2);
console.log('iter1 === values1?', iter1 === values1);

// 测试 Uint8Array
const uint8 = new Uint8Array([1, 2, 3]);
console.log('\nUint8Array:');
console.log('uint8[Symbol.iterator] === uint8.values?', uint8[Symbol.iterator] === uint8.values);

const result = {
  bufferIteratorEqualsValues: buf[Symbol.iterator] === buf.values,
  uint8ArrayIteratorEqualsValues: uint8[Symbol.iterator] === uint8.values,
  success: buf[Symbol.iterator] === buf.values && uint8[Symbol.iterator] === uint8.values
};

console.log('\nResult:', JSON.stringify(result, null, 2));
return result;
