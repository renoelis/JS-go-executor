const { Buffer } = require('buffer');

const emptyBuf = Buffer.alloc(0);

console.log('emptyBuf.length:', emptyBuf.length);

const mapResult = emptyBuf.map(byte => byte * 2);
console.log('mapResult:', mapResult);
console.log('mapResult.length:', mapResult.length);
console.log('mapResult type:', typeof mapResult);
console.log('mapResult is Array:', Array.isArray(mapResult));

const filterResult = emptyBuf.filter(() => true);
console.log('filterResult:', filterResult);
console.log('filterResult.length:', filterResult.length);

return { success: true, mapResult, filterResult };
