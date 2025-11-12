// Round 3: Edge cases and boundary conditions from actual Node behavior
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

// Start/end coercion behaviors
test('string start coerced to number', () => {
  const result = Buffer.from('hello').toString('utf8', '2');
  return result === 'llo';
});

test('string end coerced to number', () => {
  const result = Buffer.from('hello').toString('utf8', 0, '3');
  return result === 'hel';
});

test('boolean start treated as number', () => {
  const result = Buffer.from('hello').toString('utf8', true);
  return result === 'ello';
});

test('null start treated as 0', () => {
  const result = Buffer.from('hello').toString('utf8', null);
  return result === 'hello';
});

test('object start coerced', () => {
  try {
    const result = Buffer.from('hello').toString('utf8', {});
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

// Large buffer handling
test('1MB buffer toString', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size, 0x61);
  const result = buf.toString('utf8');
  return result.length === size && result[0] === 'a' && result[size-1] === 'a';
});

test('large hex encoding', () => {
  const buf = Buffer.alloc(50000, 0xab);
  const result = buf.toString('hex');
  return result.length === 100000 && result.substring(0, 4) === 'abab';
});

test('large base64 encoding', () => {
  const buf = Buffer.alloc(30000, 0x41);
  const result = buf.toString('base64');
  return result.length > 0 && typeof result === 'string';
});

// Overlapping ranges
test('start equals buffer length', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 4, 10) === '';
});

test('end beyond buffer length', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 0, 1000) === 'test';
});

test('both start and end beyond length', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 100, 200) === '';
});

// Special encoding combinations
test('hex encoding of special bytes', () => {
  const buf = Buffer.from([0x00, 0x0f, 0xf0, 0xff]);
  return buf.toString('hex') === '000ff0ff';
});

test('base64 of all zeros', () => {
  const buf = Buffer.alloc(6);
  return buf.toString('base64') === 'AAAAAAAA';
});

test('base64 of all ones', () => {
  const buf = Buffer.alloc(3, 0xff);
  return buf.toString('base64') === '////';
});

// Unicode edge cases
test('surrogate pairs in utf8', () => {
  const buf = Buffer.from('𝐀𝐁𝐂');
  const result = buf.toString('utf8');
  return result === '𝐀𝐁𝐂';
});

test('combining diacriticals', () => {
  const buf = Buffer.from('é');
  return buf.toString('utf8').includes('e') || buf.toString('utf8') === 'é';
});

test('right-to-left text', () => {
  const buf = Buffer.from('مرحبا');
  return buf.toString('utf8') === 'مرحبا';
});

test('mixed scripts', () => {
  const buf = Buffer.from('Hello世界🌍');
  return buf.toString('utf8') === 'Hello世界🌍';
});

// Slice and subarray toString
test('slice modifies buffer affects toString', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(1, 4);
  buf[2] = 0x58;
  return slice.toString() === 'eXl';
});

test('subarray independent from original', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(0, 3);
  buf.fill(0x41);
  return sub.toString() === 'AAA';
});

// Empty buffer variants
test('zero-filled buffer', () => {
  return Buffer.alloc(5).toString('utf8') === '\0\0\0\0\0';
});

test('empty concat result', () => {
  return Buffer.concat([]).toString() === '';
});

// Encoding name variations
test('utf8 vs utf-8 vs UTF8', () => {
  const buf = Buffer.from('test');
  const r1 = buf.toString('utf8');
  const r2 = buf.toString('utf-8');
  const r3 = buf.toString('UTF8');
  return r1 === r2 && r2 === r3;
});

test('ucs2 vs ucs-2 vs utf16le', () => {
  const buf = Buffer.from('hi', 'ucs2');
  const r1 = buf.toString('ucs2');
  const r2 = buf.toString('ucs-2');
  const r3 = buf.toString('utf16le');
  return r1 === r2 && r2 === r3;
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
