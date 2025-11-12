// buf.writeUInt8() - 返回值测试
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

// 返回值应该是 offset + 1
test('offset 0 返回 1', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 0);
  return ret === 1;
});

test('offset 1 返回 2', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 1);
  return ret === 2;
});

test('offset 2 返回 3', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 2);
  return ret === 3;
});

test('offset 3 返回 4', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 3);
  return ret === 4;
});

test('省略 offset 返回 1', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123);
  return ret === 1;
});

test('undefined offset 返回 1', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, undefined);
  return ret === 1;
});

// 返回值可以链式使用作为下一个 offset
test('链式使用返回值', () => {
  const buf = Buffer.alloc(4);
  let offset = 0;
  offset = buf.writeUInt8(11, offset);
  offset = buf.writeUInt8(22, offset);
  offset = buf.writeUInt8(33, offset);
  offset = buf.writeUInt8(44, offset);
  return buf[0] === 11 && buf[1] === 22 && buf[2] === 33 && buf[3] === 44 && offset === 4;
});

test('链式写入不指定初始 offset', () => {
  const buf = Buffer.alloc(4);
  let offset = buf.writeUInt8(100);
  offset = buf.writeUInt8(101, offset);
  offset = buf.writeUInt8(102, offset);
  return buf[0] === 100 && buf[1] === 101 && buf[2] === 102 && offset === 3;
});

// 不同值返回值都一样（只依赖 offset）
test('不同 value 不影响返回值', () => {
  const buf = Buffer.alloc(4);
  const ret1 = buf.writeUInt8(0, 0);
  const ret2 = buf.writeUInt8(255, 1);
  const ret3 = buf.writeUInt8(128, 2);
  return ret1 === 1 && ret2 === 2 && ret3 === 3;
});

// 大 offset 的返回值
test('大 offset 的返回值', () => {
  const buf = Buffer.alloc(1000);
  const ret = buf.writeUInt8(123, 500);
  return ret === 501;
});

test('最大合法 offset 的返回值', () => {
  const buf = Buffer.alloc(100);
  const ret = buf.writeUInt8(123, 99);
  return ret === 100;
});

// 返回值类型检查
test('返回值是数字类型', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 0);
  return typeof ret === 'number';
});

test('返回值是整数', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 0);
  return Number.isInteger(ret);
});

test('返回值大于等于 1', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123, 0);
  return ret >= 1;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
