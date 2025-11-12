// buf.values() - 不同类型输入测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
  }
}

// 测试 1：Buffer.from(Array) 创建的 Buffer
test('从数组创建的 Buffer 应正确迭代', () => {
  const buf = Buffer.from([65, 66, 67]);
  const values = [...buf.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 65 || values[1] !== 66 || values[2] !== 67) return false;
  return true;
});

// 测试 2：Buffer.from(String) 创建的 Buffer
test('从字符串创建的 Buffer 应正确迭代', () => {
  const buf = Buffer.from('ABC', 'utf8');
  const values = [...buf.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 65 || values[1] !== 66 || values[2] !== 67) return false;
  return true;
});

// 测试 3：Buffer.alloc 创建的 Buffer
test('Buffer.alloc 创建的 Buffer 应正确迭代', () => {
  const buf = Buffer.alloc(5, 42);
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  for (let i = 0; i < 5; i++) {
    if (values[i] !== 42) return false;
  }
  return true;
});

// 测试 4：Buffer.allocUnsafe 创建的 Buffer
test('Buffer.allocUnsafe 创建的 Buffer 应可迭代', () => {
  const buf = Buffer.allocUnsafe(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const values = [...buf.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[1] !== 2 || values[2] !== 3) return false;
  return true;
});

// 测试 5：Buffer.concat 创建的 Buffer
test('Buffer.concat 创建的 Buffer 应正确迭代', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const values = [...buf.values()];
  if (values.length !== 4) return false;
  if (values[0] !== 1 || values[3] !== 4) return false;
  return true;
});

// 测试 6：通过 slice 创建的 Buffer
test('通过 slice 创建的 Buffer 应正确迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const values = [...sliced.values()];
  if (values.length !== 3) return false;
  if (values[0] !== 2 || values[1] !== 3 || values[2] !== 4) return false;
  return true;
});

// 测试 7：通过 subarray 创建的 Buffer
test('通过 subarray 创建的 Buffer 应正确迭代', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 4);
  const values = [...sub.values()];
  if (values.length !== 2) return false;
  if (values[0] !== 30 || values[1] !== 40) return false;
  return true;
});

// 测试 8：不同编码的字符串 Buffer - UTF-8
test('UTF-8 编码的 Buffer 应正确迭代字节', () => {
  const buf = Buffer.from('你好', 'utf8');
  const values = [...buf.values()];
  // '你好' 在 UTF-8 中是 6 字节
  if (values.length !== 6) return false;
  // 检查所有值都是有效字节
  for (const val of values) {
    if (val < 0 || val > 255) return false;
  }
  return true;
});

// 测试 9：Hex 编码的 Buffer
test('Hex 编码的 Buffer 应正确迭代', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  if (values[0] !== 0x48 || values[4] !== 0x6f) return false;
  return true;
});

// 测试 10：Base64 编码的 Buffer
test('Base64 编码的 Buffer 应正确迭代', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  if (values[0] !== 72 || values[4] !== 111) return false; // H=72, o=111
  return true;
});

// 测试 11：包含 null 字节的 Buffer
test('包含 null 字节的 Buffer 应正确迭代', () => {
  const buf = Buffer.from([0, 1, 0, 2, 0]);
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  if (values[0] !== 0 || values[2] !== 0 || values[4] !== 0) return false;
  return true;
});

// 测试 12：全 0 的 Buffer
test('全 0 的 Buffer 应正确迭代', () => {
  const buf = Buffer.alloc(10);
  const values = [...buf.values()];
  if (values.length !== 10) return false;
  for (const val of values) {
    if (val !== 0) return false;
  }
  return true;
});

// 测试 13：全 255 的 Buffer
test('全 255 的 Buffer 应正确迭代', () => {
  const buf = Buffer.alloc(5, 255);
  const values = [...buf.values()];
  if (values.length !== 5) return false;
  for (const val of values) {
    if (val !== 255) return false;
  }
  return true;
});

// 测试 14：Uint8Array 上调用 values
test('Uint8Array 上调用 Buffer.prototype.values 应正常工作', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const iter = Buffer.prototype.values.call(uint8);
  const values = [];
  for (const val of iter) {
    values.push(val);
  }
  if (values.length !== 3) return false;
  if (values[0] !== 1 || values[2] !== 3) return false;
  return true;
});

// 测试 15：从 ArrayBuffer 创建的 Buffer
test('从 ArrayBuffer 创建的 Buffer 应正确迭代', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;
  view[3] = 40;
  const buf = Buffer.from(ab);
  const values = [...buf.values()];
  if (values.length !== 4) return false;
  if (values[0] !== 10 || values[3] !== 40) return false;
  return true;
});

const passed = tests.filter(t => t.passed === true).length;
const failed = tests.filter(t => t.passed === false).length;

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

return result