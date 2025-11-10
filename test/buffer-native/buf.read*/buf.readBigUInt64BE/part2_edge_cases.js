const { Buffer } = require('buffer');
const tests = [];
function test(name, fn) {
  try { tests.push({ name, status: fn() ? '✅' : '❌' }); }
  catch (e) { tests.push({ name, status: '❌', error: e.message, stack: e.stack }); }
}
test('offset = NaN（应抛出错误）', () => { try { Buffer.alloc(8).readBigUInt64BE(NaN); return false; } catch (e) { return e.name === 'RangeError' || e.name === 'TypeError'; } });
test('offset = 字符串（应抛出错误）', () => { try { Buffer.alloc(8).readBigUInt64BE('0'); return false; } catch (e) { return e.name === 'TypeError'; } });
test('offset = 浮点数（应抛出错误）', () => { try { Buffer.alloc(8).readBigUInt64BE(0.5); return false; } catch (e) { return e.name === 'RangeError'; } });
const passed = tests.filter(t => t.status === '✅').length, failed = tests.filter(t => t.status === '❌').length;
console.log(JSON.stringify({ success: failed === 0, summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' }, tests }, null, 2));
return { success: failed === 0, summary: { total: tests.length, passed, failed }, tests };
