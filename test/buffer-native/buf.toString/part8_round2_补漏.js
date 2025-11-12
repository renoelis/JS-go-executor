// Round 2: Additional coverage based on Node.js docs
const { Buffer } = require('buffer');
const tests = [];
function test(n, f) {
  try {
    const p = f();
    tests.push({name: n, status: p ? '✅' : '❌', passed: p});
    console.log((p ? '✅' : '❌') + ' ' + n);
  } catch(e) {
    tests.push({name: n, status: '❌', passed: false, error: e.message});
    console.log('❌ ' + n + ': ' + e.message);
  }
}

// From Node docs: toString([encoding[, start[, end]]])
test('all params explicitly provided', () => {
  return Buffer.from('buffer').toString('utf8', 0, 6) === 'buffer';
});

test('encoding only', () => {
  return Buffer.from('test').toString('hex') === '74657374';
});

test('encoding + start', () => {
  return Buffer.from('test').toString('utf8', 1) === 'est';
});

// Base64url vs Base64
test('base64url no padding vs base64', () => {
  const buf = Buffer.from('a');
  return buf.toString('base64') === 'YQ==' && buf.toString('base64url') === 'YQ';
});

// Zero-length ranges
test('zero length range (start=end)', () => {
  return Buffer.from('test').toString('utf8', 2, 2) === '';
});

test('entire buffer via explicit range', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 0, buf.length) === 'test';
});

// Special byte sequences
test('null bytes in middle', () => {
  const buf = Buffer.from([0x41, 0x00, 0x00, 0x42]);
  const result = buf.toString('utf8');
  return result.length === 4 && result.charCodeAt(0) === 0x41 && result.charCodeAt(3) === 0x42;
});

test('consecutive null bytes', () => {
  const buf = Buffer.alloc(10);
  return buf.toString('utf8').length === 10;
});

// Encoding edge cases
test('ucs2 with BMP characters', () => {
  const buf = Buffer.from([0x41, 0x00, 0x42, 0x00]);
  return buf.toString('ucs2') === 'AB';
});

test('latin1 preserves all bytes', () => {
  const buf = Buffer.from([0x80, 0x90, 0xa0, 0xf0]);
  const result = buf.toString('latin1');
  return result.length === 4 && result.charCodeAt(0) === 0x80;
});

// Buffer state
test('toString on empty slice', () => {
  return Buffer.from('test').slice(2, 2).toString() === '';
});

test('toString on full slice', () => {
  const buf = Buffer.from('test');
  return buf.slice().toString() === 'test';
});

// Return value verification
test('always returns string type', () => {
  const results = [
    Buffer.from('test').toString(),
    Buffer.alloc(0).toString(),
    Buffer.from([0xff]).toString('hex')
  ];
  return results.every(r => typeof r === 'string');
});

// Idempotency
test('repeated calls are idempotent', () => {
  const buf = Buffer.from('test');
  const r1 = buf.toString();
  const r2 = buf.toString();
  const r3 = buf.toString();
  return r1 === r2 && r2 === r3;
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
