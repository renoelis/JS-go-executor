// buf.readUInt8() - 方法完整性测试
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

// 方法存在性测试
test('readUInt8 方法存在于 Buffer 原型上', () => {
  const buf = Buffer.alloc(1);
  return typeof buf.readUInt8 === 'function';
});

// 返回值类型测试
test('readUInt8 返回 number 类型', () => {
  const buf = Buffer.from([100]);
  const result = buf.readUInt8(0);
  return typeof result === 'number';
});

test('readUInt8 返回值在有效范围内（0-255）', () => {
  const buf = Buffer.from([200]);
  const result = buf.readUInt8(0);
  return result >= 0 && result <= 255;
});

// 不修改 buffer 测试
test('readUInt8 不修改原 buffer', () => {
  const buf = Buffer.from([100, 200, 50]);
  const before = buf.toString('hex');
  buf.readUInt8(1);
  const after = buf.toString('hex');
  return before === after;
});

// 多次读取一致性测试
test('多次读取同一位置返回相同值', () => {
  const buf = Buffer.from([123]);
  const r1 = buf.readUInt8(0);
  const r2 = buf.readUInt8(0);
  const r3 = buf.readUInt8(0);
  return r1 === r2 && r2 === r3 && r1 === 123;
});

// offset 默认值测试
test('不传 offset 参数使用默认值 0', () => {
  const buf = Buffer.from([255, 128]);
  return buf.readUInt8() === 255;
});

// 链式调用测试
test('readUInt8 可以连续调用', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const r1 = buf.readUInt8(0);
  const r2 = buf.readUInt8(1);
  const r3 = buf.readUInt8(2);
  return r1 === 10 && r2 === 20 && r3 === 30;
});

// this 绑定测试
test('readUInt8 this 绑定正确', () => {
  const buf = Buffer.from([100]);
  const fn = buf.readUInt8;
  try {
    fn.call(buf, 0);
    return true;
  } catch (e) {
    return false;
  }
});

// 与 writeUInt8 往返测试
test('writeUInt8 + readUInt8 往返一致性', () => {
  const buf = Buffer.alloc(5);
  const values = [0, 50, 128, 200, 255];
  values.forEach((val, i) => buf.writeUInt8(val, i));
  return values.every((val, i) => buf.readUInt8(i) === val);
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
