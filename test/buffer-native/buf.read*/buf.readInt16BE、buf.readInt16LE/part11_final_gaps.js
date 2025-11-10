// 最终查缺补漏测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// BigInt offset
test('offset = 0n 抛出TypeError - BE', () => {
  try {
    Buffer.from([0x12, 0x34]).readInt16BE(0n);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 函数offset
test('offset = function 抛出TypeError - LE', () => {
  try {
    Buffer.from([0x34, 0x12]).readInt16LE(() => 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 错误恢复
test('错误后仍可读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  try { buf.readInt16BE(10); } catch (e) {}
  return buf.readInt16BE(0) === 0x1234;
});

// 位模式
test('交替位 0xAA55 - LE', () => {
  return Buffer.from([0x55, 0xAA]).readInt16LE(0) === -21931;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed/tests.length)*100).toFixed(2)+'%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
