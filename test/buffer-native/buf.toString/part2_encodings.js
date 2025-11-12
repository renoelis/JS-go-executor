// Part 2: Encodings
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
test('hex encoding', () => Buffer.from([1,2,3]).toString('hex') === '010203');
test('base64 encoding', () => Buffer.from('hello').toString('base64') === 'aGVsbG8=');
test('base64url encoding', () => Buffer.from('hello').toString('base64url') === 'aGVsbG8');
test('ascii encoding', () => Buffer.from('test').toString('ascii') === 'test');
test('latin1 encoding', () => Buffer.from('test').toString('latin1') === 'test');
test('binary encoding', () => Buffer.from('test').toString('binary') === 'test');
test('ucs2 encoding', () => Buffer.from('hi', 'ucs2').toString('ucs2') === 'hi');
test('utf16le encoding', () => Buffer.from('hi', 'utf16le').toString('utf16le') === 'hi');
test('case insensitive UTF8', () => Buffer.from('test').toString('UTF8') === 'test');
test('case insensitive HEX', () => Buffer.from([255]).toString('HEX') === 'ff');
const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+'%'}, tests};
console.log('\n' + JSON.stringify(result, null, 2));
return result;
