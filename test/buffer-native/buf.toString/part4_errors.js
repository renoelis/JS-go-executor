// Part 4: Error Paths
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
test('unknown encoding throws or returns string', () => {
  try {
    const r = Buffer.from('test').toString('unknown');
    return typeof r === 'string';
  } catch(e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});
test('empty encoding throws or returns string', () => {
  try {
    const r = Buffer.from('test').toString('');
    return typeof r === 'string';
  } catch(e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});
test('NaN start', () => typeof Buffer.from('hello').toString('utf8', NaN) === 'string');
test('Infinity start', () => typeof Buffer.from('hello').toString('utf8', Infinity) === 'string');
test('NaN end', () => typeof Buffer.from('hello').toString('utf8', 0, NaN) === 'string');
test('Infinity end', () => Buffer.from('hello').toString('utf8', 0, Infinity) === 'hello');
test('float start', () => Buffer.from('hello').toString('utf8', 1.7) === 'ello');
test('float end', () => Buffer.from('hello').toString('utf8', 0, 3.9) === 'hel');
test('non-Buffer this throws', () => {
  try { Buffer.prototype.toString.call({}, 'utf8'); return false; }
  catch(e) { return true; }
});
test('extra params ignored', () => Buffer.from('hello').toString('utf8', 0, 5, 'extra') === 'hello');
const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+'%'}, tests};
console.log('\n' + JSON.stringify(result, null, 2));
return result;
