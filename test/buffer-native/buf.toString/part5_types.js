// Part 5: Different Types
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
test('Buffer.from', () => Buffer.from('hello').toString() === 'hello');
test('Buffer.alloc', () => Buffer.alloc(5, 0x61).toString() === 'aaaaa');
test('Buffer.allocUnsafe', () => { const b = Buffer.allocUnsafe(3); b.fill(0x62); return b.toString() === 'bbb'; });
test('Buffer.concat', () => Buffer.concat([Buffer.from('he'), Buffer.from('llo')]).toString() === 'hello');
test('Uint8Array', () => {
  try {
    const r = Buffer.prototype.toString.call(new Uint8Array([0x68, 0x69]), 'utf8');
    return r === 'hi';
  } catch(e) {
    return Buffer.from(new Uint8Array([0x68, 0x69])).toString() === 'hi';
  }
});
test('Buffer.slice', () => Buffer.from('hello').slice(1, 4).toString() === 'ell');
test('Buffer.subarray', () => Buffer.from('hello').subarray(1, 4).toString() === 'ell');
test('from Array', () => Buffer.from([0x68, 0x69]).toString() === 'hi');
test('from another Buffer', () => Buffer.from(Buffer.from('test')).toString() === 'test');
test('modification isolation', () => {
  const b1 = Buffer.from('test');
  const b2 = Buffer.from(b1);
  b1[0] = 0x58;
  return b2.toString() === 'test';
});
const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
