const { Buffer } = require('buffer');

// 测试 Infinity
const buf1 = Buffer.from([Infinity]);
console.log('Buffer.from([Infinity]):', [...buf1]);

const buf2 = Buffer.from([-Infinity]);
console.log('Buffer.from([-Infinity]):', [...buf2]);

const buf3 = Buffer.from([NaN]);
console.log('Buffer.from([NaN]):', [...buf3]);

const buf4 = Buffer.from([1.5, 2.9, 3.1]);
console.log('Buffer.from([1.5, 2.9, 3.1]):', [...buf4]);

const buf5 = Buffer.from([-1, -128, -255]);
console.log('Buffer.from([-1, -128, -255]):', [...buf5]);

const result = {
  infinityToZero: buf1[0] === 0,
  negInfinityToZero: buf2[0] === 0,
  nanToZero: buf3[0] === 0,
  decimals: buf4[0] === 1 && buf4[1] === 2 && buf4[2] === 3,
  negatives: buf5[0] === 255 && buf5[1] === 128 && buf5[2] === 1,
  success: buf1[0] === 0 && buf2[0] === 0 && buf3[0] === 0
};

console.log('\nResult:', JSON.stringify(result, null, 2));
return result;
