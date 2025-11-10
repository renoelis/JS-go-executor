const { Buffer } = require('buffer');

const buf = Buffer.from([Infinity]);
console.log('Infinity result:', buf[0]);
console.log('Expected: 0, Got:', buf[0]);

return { expected: 0, got: buf[0], success: buf[0] === 0 };
