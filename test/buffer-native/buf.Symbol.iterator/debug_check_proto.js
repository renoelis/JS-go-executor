const { Buffer } = require('buffer');

console.log('Buffer.prototype.values:', Buffer.prototype.values);
console.log('Buffer.prototype[Symbol.iterator]:', Buffer.prototype[Symbol.iterator]);
console.log('Are they the same on prototype?', Buffer.prototype.values === Buffer.prototype[Symbol.iterator]);

console.log('\nUint8Array.prototype.values:', Uint8Array.prototype.values);
console.log('Uint8Array.prototype[Symbol.iterator]:', Uint8Array.prototype[Symbol.iterator]);
console.log('Are they the same on Uint8Array prototype?', Uint8Array.prototype.values === Uint8Array.prototype[Symbol.iterator]);

const result = {
  bufferProtoSame: Buffer.prototype.values === Buffer.prototype[Symbol.iterator],
  uint8ArrayProtoSame: Uint8Array.prototype.values === Uint8Array.prototype[Symbol.iterator],
  success: Buffer.prototype.values === Buffer.prototype[Symbol.iterator]
};

console.log('\nResult:', JSON.stringify(result, null, 2));
return result;
