const { Buffer } = require('buffer');
const tests = [];
function test(name, fn) {
  try { tests.push({ name, status: fn() ? '✅' : '❌' }); }
  catch (e) { tests.push({ name, status: '❌', error: e.message, stack: e.stack }); }
}
test('offset = NaN（应抛出错误）', () => { try { Buffer.from([0x12, 0x34, 0x56, 0x78]).readUInt32BE(NaN); return false; } catch (e) { return e.name === 'RangeError' || e.name === 'TypeError'; } });
test('offset = 字符串（应抛出错误）', () => { try { Buffer.from([0x12, 0x34, 0x56, 0x78]).readUInt32BE('0'); return false; } catch (e) { return e.name === 'TypeError'; } });
test('读取 4294967295（最大值）', () => Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]).readUInt32BE(0) === 4294967295);
test('offset = NaN（应抛出错误）', () => { try { Buffer.from([0x78, 0x56, 0x34, 0x12]).readUInt32LE(NaN); return false; } catch (e) { return e.name === 'RangeError' || e.name === 'TypeError'; } });
test('offset = 字符串（应抛出错误）', () => { try { Buffer.from([0x78, 0x56, 0x34, 0x12]).readUInt32LE('0'); return false; } catch (e) { return e.name === 'TypeError'; } });
test('读取 4294967295（最大值 LE）', () => Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]).readUInt32LE(0) === 4294967295);

const passed = tests.filter(t => t.status === '✅').length, failed = tests.filter(t => t.status === '❌').length;
console.log(JSON.stringify({ success: failed === 0, summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' }, tests }, null, 2));
return { success: failed === 0, summary: { total: tests.length, passed, failed }, tests };
