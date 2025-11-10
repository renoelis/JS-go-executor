// buf.readInt8() - 方法完整性测试
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
test('readInt8 方法存在', () => {
  const buf = Buffer.alloc(1);
  return typeof buf.readInt8 === 'function';
});

// 返回值类型测试
test('返回值类型为 number', () => {
  const buf = Buffer.from([127]);
  const result = buf.readInt8(0);
  return typeof result === 'number';
});

test('返回值不是 NaN', () => {
  const buf = Buffer.from([100]);
  const result = buf.readInt8(0);
  return !isNaN(result);
});

test('返回值是整数', () => {
  const buf = Buffer.from([100]);
  const result = buf.readInt8(0);
  return Number.isInteger(result);
});

test('返回值在有效范围内（-128 到 127）', () => {
  const buf = Buffer.from([255]);
  const result = buf.readInt8(0);
  return result >= -128 && result <= 127;
});

// 方法调用一致性
test('多次调用返回相同结果', () => {
  const buf = Buffer.from([100]);
  const r1 = buf.readInt8(0);
  const r2 = buf.readInt8(0);
  const r3 = buf.readInt8(0);
  return r1 === r2 && r2 === r3 && r3 === 100;
});

test('不同 offset 返回正确结果', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  return buf.readInt8(0) === 10 && buf.readInt8(2) === 30 && buf.readInt8(4) === 50;
});

// 不修改 Buffer
test('读取不修改 Buffer 内容', () => {
  const buf = Buffer.from([100, 50, 25]);
  const before = buf.toString('hex');
  buf.readInt8(0);
  buf.readInt8(1);
  buf.readInt8(2);
  const after = buf.toString('hex');
  return before === after;
});

// this 绑定测试
test('方法可以正常调用', () => {
  const buf = Buffer.from([127]);
  const fn = buf.readInt8;
  return fn.call(buf, 0) === 127;
});

test('apply 调用测试', () => {
  const buf = Buffer.from([100]);
  const fn = buf.readInt8;
  return fn.apply(buf, [0]) === 100;
});

// 大型 Buffer 性能测试
test('大型 Buffer 读取正常工作', () => {
  const buf = Buffer.alloc(1000);
  buf.writeInt8(127, 999);
  return buf.readInt8(999) === 127;
});

test('连续大量读取', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeInt8((i % 256) - 128, i);
  }
  let success = true;
  for (let i = 0; i < 100; i++) {
    const expected = (i % 256) - 128;
    if (buf.readInt8(i) !== expected) {
      success = false;
      break;
    }
  }
  return success;
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
