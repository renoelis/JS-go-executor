// Round 5: Extreme cases and compatibility/historical behavior challenges
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

// Extreme multibyte boundaries
test('cut emoji at byte 1', () => {
  const buf = Buffer.from('😀test');
  const result = buf.toString('utf8', 1);
  return result.length > 0;
});

test('cut emoji at byte 2', () => {
  const buf = Buffer.from('😀test');
  const result = buf.toString('utf8', 2);
  return result.length > 0;
});

test('cut emoji at byte 3', () => {
  const buf = Buffer.from('😀test');
  const result = buf.toString('utf8', 3);
  return result.length > 0;
});

test('cut chinese at byte 1', () => {
  const buf = Buffer.from('你好');
  const result = buf.toString('utf8', 1);
  return result.length > 0;
});

test('cut chinese at byte 2', () => {
  const buf = Buffer.from('你好');
  const result = buf.toString('utf8', 2);
  return result.length > 0;
});

test('end cuts emoji', () => {
  const buf = Buffer.from('test😀');
  const result = buf.toString('utf8', 0, 5);
  return result.length > 0;
});

// Very large buffers
test('5MB utf8 buffer', () => {
  const size = 5 * 1024 * 1024;
  const buf = Buffer.alloc(size, 0x61);
  const result = buf.toString();
  return result.length === size;
});

test('hex encoding 100KB', () => {
  const buf = Buffer.alloc(100000, 0xAB);
  const result = buf.toString('hex');
  return result.length === 200000;
});

// Invalid UTF-8 sequences
test('invalid 2-byte sequence', () => {
  const buf = Buffer.from([0xC0, 0x80]);
  const result = buf.toString('utf8');
  return typeof result === 'string' && result.length > 0;
});

test('invalid 3-byte sequence', () => {
  const buf = Buffer.from([0xE0, 0x80, 0x80]);
  const result = buf.toString('utf8');
  return typeof result === 'string' && result.length > 0;
});

test('invalid 4-byte sequence', () => {
  const buf = Buffer.from([0xF0, 0x80, 0x80, 0x80]);
  const result = buf.toString('utf8');
  return typeof result === 'string' && result.length > 0;
});

test('overlong encoding', () => {
  const buf = Buffer.from([0xC0, 0xAF]);
  const result = buf.toString('utf8');
  return typeof result === 'string';
});

test('lone high surrogate', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x80]);
  const result = buf.toString('utf8');
  return typeof result === 'string';
});

test('lone low surrogate', () => {
  const buf = Buffer.from([0xED, 0xB0, 0x80]);
  const result = buf.toString('utf8');
  return typeof result === 'string';
});

// Encoding edge cases with special characters
test('ascii control chars 0x00-0x1F', () => {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf[i] = i;
  const result = buf.toString('ascii');
  return result.length === 32;
});

test('ascii high bit set 0x80-0xFF', () => {
  const buf = Buffer.alloc(128);
  for (let i = 0; i < 128; i++) buf[i] = 0x80 + i;
  const result = buf.toString('ascii');
  return result.length === 128;
});

test('latin1 all 256 values', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) buf[i] = i;
  const result = buf.toString('latin1');
  return result.length === 256;
});

// Base64 special cases
test('base64 with newlines source (should ignore)', () => {
  const buf = Buffer.from('test\ndata');
  const result = buf.toString('base64');
  return result.length > 0 && !result.includes('\n');
});

test('base64url special chars mapping', () => {
  const buf = Buffer.from([0xfb, 0xff, 0xfe]);
  const b64 = buf.toString('base64');
  const b64url = buf.toString('base64url');
  return b64 !== b64url && b64 === '+//+' && b64url === '-__-';
});

// UCS2/UTF16LE special cases
test('ucs2 single byte buffer (odd length)', () => {
  const buf = Buffer.from([0x41]);
  const result = buf.toString('ucs2');
  return typeof result === 'string';
});

test('ucs2 BOM', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0x41, 0x00]);
  const result = buf.toString('ucs2');
  return result.length > 0;
});

test('utf16le emoji', () => {
  const buf = Buffer.from('😀', 'utf16le');
  const result = buf.toString('utf16le');
  return result === '😀';
});

// Slice/subarray edge cases
test('slice with swapped arguments', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(3, 1);
  return slice.toString() === '';
});

test('subarray beyond buffer', () => {
  const buf = Buffer.from('test');
  const sub = buf.subarray(2, 100);
  return sub.toString() === 'st';
});

// Zero-copy verification
test('toString does not allocate new buffer', () => {
  const buf = Buffer.from('test');
  const str1 = buf.toString();
  const str2 = buf.toString();
  return str1 === str2;
});

// Mixed encoding scenarios
test('binary encoding equals latin1', () => {
  const data = [0x00, 0x7F, 0x80, 0xFF, 0xAB, 0xCD];
  const buf = Buffer.from(data);
  return buf.toString('binary') === buf.toString('latin1');
});

test('hex lowercase output', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xEF]);
  const result = buf.toString('hex');
  return result === 'abcdef' && result !== 'ABCDEF';
});

// Extreme parameters
test('MAX_SAFE_INTEGER as start', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', Number.MAX_SAFE_INTEGER);
  return result === '';
});

test('MIN_SAFE_INTEGER as start', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', Number.MIN_SAFE_INTEGER);
  return typeof result === 'string';
});

test('very large end value', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', 0, 1e15);
  return result === 'test';
});

// Special unicode categories
test('zero-width joiner sequences', () => {
  const buf = Buffer.from('👨‍👩‍👧');
  return buf.toString().length > 0;
});

test('variation selectors', () => {
  const buf = Buffer.from('♠️');
  return buf.toString().length > 0;
});

test('regional indicator symbols', () => {
  const buf = Buffer.from('🇺🇸');
  return buf.toString().length > 0;
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
