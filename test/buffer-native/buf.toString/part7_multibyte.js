// Part 7: Multibyte Characters
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
test('3-byte UTF-8 (Chinese)', () => {
  const b = Buffer.from('中');
  return b.length === 3 && b.toString() === '中';
});
test('4-byte UTF-8 (emoji)', () => {
  const b = Buffer.from('😀');
  return b.length === 4 && b.toString() === '😀';
});
test('range on multibyte boundary', () => Buffer.from('你好').toString('utf8', 3) === '好');
test('range off multibyte boundary', () => {
  const r = Buffer.from('你好').toString('utf8', 1);
  return r.length > 0;
});
test('emoji range on boundary', () => Buffer.from('😀😃').toString('utf8', 4) === '😃');
test('multiple chinese chars', () => Buffer.from('你好世界').toString() === '你好世界');
test('multiple emojis', () => Buffer.from('😀😃😄😁').toString() === '😀😃😄😁');
test('mixed single and multibyte', () => Buffer.from('a你b').toString() === 'a你b');
test('ucs2 chinese', () => Buffer.from('你好', 'ucs2').toString('ucs2') === '你好');
test('ucs2 emoji', () => Buffer.from('😀', 'ucs2').toString('ucs2') === '😀');
const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
