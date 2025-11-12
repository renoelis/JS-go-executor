// Part 6: Edge Cases
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
test('size 1 buffer', () => Buffer.from([0x41]).toString() === 'A');
test('large buffer (10KB)', () => Buffer.alloc(10240, 0x61).toString().length === 10240);
test('all single bytes (hex)', () => {
  const b = Buffer.alloc(256);
  for(let i=0;i<256;i++) b[i]=i;
  return b.toString('hex').length === 512;
});
test('invalid UTF-8 sequence', () => {
  const r = Buffer.from([0xff, 0xfe]).toString('utf8');
  return r.length > 0;
});
test('truncated multibyte', () => {
  const r = Buffer.from([0xe4, 0xb8]).toString('utf8');
  return r.length > 0;
});
test('latin1 full range', () => {
  const b = Buffer.alloc(256);
  for(let i=0;i<256;i++) b[i]=i;
  return b.toString('latin1').length === 256;
});
test('base64 padding (mod 3 = 0)', () => Buffer.from('abc').toString('base64') === 'YWJj');
test('base64 padding (mod 3 = 1)', () => Buffer.from('a').toString('base64') === 'YQ==');
test('base64 padding (mod 3 = 2)', () => Buffer.from('ab').toString('base64') === 'YWI=');
test('repeated chars', () => Buffer.alloc(1000, 0x61).toString() === 'a'.repeat(1000));
const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
