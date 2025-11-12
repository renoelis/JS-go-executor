// Part 3: Range Parameters
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
test('start parameter', () => Buffer.from('hello').toString('utf8', 2) === 'llo');
test('start and end', () => Buffer.from('hello').toString('utf8', 1, 4) === 'ell');
test('negative start', () => {
  try {
    const r = Buffer.from('hello').toString('utf8', -2);
    return typeof r === 'string';
  } catch(e) { return true; }
});
test('negative end', () => {
  try {
    const r = Buffer.from('hello').toString('utf8', 0, -1);
    return typeof r === 'string';
  } catch(e) { return true; }
});
test('start > length', () => Buffer.from('hello').toString('utf8', 100) === '');
test('end < start', () => Buffer.from('hello').toString('utf8', 3, 1) === '');
test('undefined start', () => Buffer.from('hello').toString('utf8', undefined) === 'hello');
test('undefined end', () => Buffer.from('hello').toString('utf8', 1, undefined) === 'ello');
test('hex with range', () => Buffer.from([1,2,3,4]).toString('hex', 1, 3) === '0203');
test('base64 with range', () => Buffer.from('hello').toString('base64', 1, 4) === 'ZWxs');
const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+'%'}, tests};
console.log('\n' + JSON.stringify(result, null, 2));
return result;
