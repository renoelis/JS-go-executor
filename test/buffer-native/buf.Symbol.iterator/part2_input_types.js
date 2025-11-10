// buf[Symbol.iterator] - Part 2: Different Input Types Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅', passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 不同输入类型的迭代
test('Uint8Array 转换后迭代', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(uint8);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 10 || result[1] !== 20 || result[2] !== 30) {
    throw new Error('Uint8Array iteration failed');
  }
});

test('Uint16Array 转换后迭代', () => {
  const uint16 = new Uint16Array([256, 512]); // 会按字节展开
  const buf = Buffer.from(uint16.buffer);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  // Uint16Array [256, 512] 在 little-endian 下是 [0, 1, 0, 2]
  if (result.length !== 4) throw new Error('Length mismatch');
});

test('ArrayBuffer 转换后迭代', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  const buf = Buffer.from(ab);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 1 || result[3] !== 4) throw new Error('ArrayBuffer iteration failed');
});

test('Buffer.alloc() 创建的 Buffer 迭代', () => {
  const buf = Buffer.alloc(5, 42); // 填充 42
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 5) throw new Error('Length mismatch');
  for (let i = 0; i < 5; i++) {
    if (result[i] !== 42) throw new Error(`Value at ${i} should be 42`);
  }
});

test('Buffer.allocUnsafe() 创建后赋值迭代', () => {
  const buf = Buffer.allocUnsafe(3);
  buf[0] = 100;
  buf[1] = 150;
  buf[2] = 200;
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 100 || result[1] !== 150 || result[2] !== 200) {
    throw new Error('allocUnsafe iteration failed');
  }
});

test('Buffer.concat() 结果迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result.length !== 4 || result[0] !== 1 || result[3] !== 4) {
    throw new Error('concat iteration failed');
  }
});

test('Buffer.slice() 视图迭代', () => {
  const original = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = original.slice(1, 4); // [20, 30, 40]
  const result = [];
  for (const byte of sliced) {
    result.push(byte);
  }
  if (result.length !== 3 || result[0] !== 20 || result[2] !== 40) {
    throw new Error('slice iteration failed');
  }
});

test('Buffer.subarray() 视图迭代', () => {
  const original = Buffer.from([5, 10, 15, 20]);
  const sub = original.subarray(1, 3); // [10, 15]
  const result = [];
  for (const byte of sub) {
    result.push(byte);
  }
  if (result.length !== 2 || result[0] !== 10 || result[1] !== 15) {
    throw new Error('subarray iteration failed');
  }
});

test('数组转 Buffer 迭代', () => {
  const arr = [65, 66, 67]; // ABC
  const buf = Buffer.from(arr);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  if (result[0] !== 65 || result[1] !== 66 || result[2] !== 67) {
    throw new Error('Array to buffer iteration failed');
  }
});

test('包含超出 0-255 范围的数组转 Buffer 迭代', () => {
  const arr = [256, -1, 300]; // 应该被截断/取模
  const buf = Buffer.from(arr);
  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }
  // 256 % 256 = 0, -1 会变成 255, 300 % 256 = 44
  if (result[0] !== 0 || result[1] !== 255 || result[2] !== 44) {
    throw new Error('Out of range array iteration failed');
  }
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 2: Input Types',
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log('\n' + JSON.stringify(result, null, 2));
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
