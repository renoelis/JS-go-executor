// Round 4: Complex combinations and cross-checking
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

// Cross-encoding consistency
test('utf8 -> hex -> back consistency', () => {
  const original = 'hello';
  const buf = Buffer.from(original);
  const hex = buf.toString('hex');
  const restored = Buffer.from(hex, 'hex').toString('utf8');
  return restored === original;
});

test('utf8 -> base64 -> back consistency', () => {
  const original = 'test data';
  const buf = Buffer.from(original);
  const b64 = buf.toString('base64');
  const restored = Buffer.from(b64, 'base64').toString('utf8');
  return restored === original;
});

test('chinese utf8 -> base64 -> back', () => {
  const original = '你好世界';
  const buf = Buffer.from(original);
  const b64 = buf.toString('base64');
  const restored = Buffer.from(b64, 'base64').toString('utf8');
  return restored === original;
});

test('emoji utf8 -> hex -> back', () => {
  const original = '😀';
  const buf = Buffer.from(original);
  const hex = buf.toString('hex');
  const restored = Buffer.from(hex, 'hex').toString('utf8');
  return restored === original;
});

// Range combinations across encodings
test('hex with start boundary', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  return buf.toString('hex', 2) === '0304' + '05';
});

test('base64 with end boundary', () => {
  const buf = Buffer.from('hello world');
  const result = buf.toString('base64', 0, 5);
  return result === Buffer.from('hello').toString('base64');
});

test('latin1 with range', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  return buf.toString('latin1', 1, 3) === 'BC';
});

test('ucs2 with even boundaries', () => {
  const buf = Buffer.from('hello', 'ucs2');
  const result = buf.toString('ucs2', 0, 4);
  return result.length === 2;
});

// Multiple operations
test('concat then toString', () => {
  const parts = [Buffer.from('hel'), Buffer.from('lo')];
  return Buffer.concat(parts).toString() === 'hello';
});

test('slice then slice then toString', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = slice1.slice(1, 4);
  return slice2.toString() === 'ell';
});

test('allocUnsafe then fill then toString', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill('a');
  return buf.toString() === 'aaaaa';
});

// Buffer modification patterns
test('write then toString', () => {
  const buf = Buffer.alloc(10);
  buf.write('test', 0, 'utf8');
  return buf.toString('utf8', 0, 4) === 'test';
});

test('copy then toString', () => {
  const src = Buffer.from('source');
  const dst = Buffer.alloc(6);
  src.copy(dst);
  return dst.toString() === 'source';
});

// Special whitespace
test('all whitespace types', () => {
  const buf = Buffer.from(' \t\n\r\f\v');
  const result = buf.toString();
  return result.length === 6;
});

test('unicode whitespace', () => {
  const buf = Buffer.from('\u00A0\u2000\u2001');
  return buf.toString().length > 0;
});

// Encoding with different data patterns
test('alternating bytes hex', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55]);
  return buf.toString('hex') === 'aa55aa55';
});

test('sequential bytes hex', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  return buf.toString('hex') === '00010203';
});

// Buffer.from variants then toString
test('from string with encoding then toString', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.toString('utf8') === 'hello';
});

test('from arraybuffer then toString', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.set([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  const buf = Buffer.from(ab);
  return buf.toString() === 'hello';
});

test('from buffer then toString', () => {
  const buf1 = Buffer.from('test');
  const buf2 = Buffer.from(buf1);
  return buf2.toString() === 'test';
});

// Extreme range values
test('start=0 end=0', () => {
  return Buffer.from('test').toString('utf8', 0, 0) === '';
});

test('start=1 end=1', () => {
  return Buffer.from('test').toString('utf8', 1, 1) === '';
});

test('start=length-1 end=length', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 3, 4) === 't';
});

// Performance edge cases
test('very long string of same char', () => {
  const buf = Buffer.alloc(10000, 0x61);
  const result = buf.toString();
  return result.length === 10000 && result[0] === 'a' && result[9999] === 'a';
});

test('alternating pattern large buffer', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i % 2 === 0 ? 0x61 : 0x62;
  }
  const result = buf.toString();
  return result.length === 10000;
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
