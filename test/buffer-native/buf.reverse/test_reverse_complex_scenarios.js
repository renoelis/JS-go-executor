// buf.reverse() - 复杂场景测试
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

// Case 1: SharedArrayBuffer 创建的 Buffer
test('SharedArrayBuffer 创建的 Buffer 反转', () => {
  // 跳过不支持 SharedArrayBuffer 的环境（如 goja）
  if (typeof SharedArrayBuffer === 'undefined') {
    return true; // 跳过测试
  }
  const sab = new SharedArrayBuffer(8);
  const buf = Buffer.from(sab);
  for (let i = 0; i < 8; i++) buf[i] = i + 1;

  buf.reverse();

  const expected = [8, 7, 6, 5, 4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 2: 多个 Buffer 共享 SharedArrayBuffer
test('多个 Buffer 共享 SharedArrayBuffer', () => {
  // 跳过不支持 SharedArrayBuffer 的环境（如 goja）
  if (typeof SharedArrayBuffer === 'undefined') {
    return true; // 跳过测试
  }
  const sab = new SharedArrayBuffer(8);
  const buf1 = Buffer.from(sab);
  const buf2 = Buffer.from(sab);

  for (let i = 0; i < 8; i++) buf1[i] = i + 1;

  buf1.reverse(); // 应该影响 buf2

  const expected = [8, 7, 6, 5, 4, 3, 2, 1];
  const actual1 = Array.from(buf1);
  const actual2 = Array.from(buf2);

  return JSON.stringify(actual1) === JSON.stringify(expected) &&
         JSON.stringify(actual2) === JSON.stringify(expected);
});

// Case 3: 包含 emoji 的 Buffer（UTF-8）
test('包含 emoji 的 Buffer 反转（字节级）', () => {
  const emoji = '😀👍🎉';
  const buf = Buffer.from(emoji, 'utf8');
  const originalBytes = Array.from(buf);

  buf.reverse();

  const reversedBytes = Array.from(buf);
  return reversedBytes.length === originalBytes.length &&
         reversedBytes[0] === originalBytes[originalBytes.length - 1];
});

// Case 4: 包含 BOM 的 UTF-16LE Buffer
test('包含 BOM 的 UTF-16LE Buffer 反转', () => {
  const str = '\uFEFFHello'; // BOM + Hello
  const buf = Buffer.from(str, 'utf16le');
  const originalBytes = Array.from(buf);

  buf.reverse();

  const reversedBytes = Array.from(buf);
  return reversedBytes.length === originalBytes.length &&
         reversedBytes[0] === originalBytes[originalBytes.length - 1];
});

// Case 5: 极深的嵌套 slice
test('极深的嵌套 slice 后 reverse', () => {
  const original = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) original[i] = i;

  let current = original;
  for (let i = 0; i < 10; i++) {
    current = current.slice(1, current.length - 1);
  }

  const beforeLength = current.length;
  current.reverse();
  const afterLength = current.length;

  return beforeLength === 80 && afterLength === 80;
});

// Case 6: 交叉的 slice
test('交叉的 slice - 反转一个影响另一个', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) buf[i] = i;

  const slice1 = buf.slice(0, 6); // [0, 1, 2, 3, 4, 5]
  const slice2 = buf.slice(4, 10); // [4, 5, 6, 7, 8, 9]

  slice1.reverse(); // 影响 buf[0-5]，变为 [5, 4, 3, 2, 1, 0]

  // buf 现在是 [5, 4, 3, 2, 1, 0, 6, 7, 8, 9]
  // slice2 看到的是 buf[4-9]，即 [1, 0, 6, 7, 8, 9]

  const expectedBuf = [5, 4, 3, 2, 1, 0, 6, 7, 8, 9];
  const expectedSlice2 = [1, 0, 6, 7, 8, 9];

  const actualBuf = Array.from(buf);
  const actualSlice2 = Array.from(slice2);

  return JSON.stringify(actualBuf) === JSON.stringify(expectedBuf) &&
         JSON.stringify(actualSlice2) === JSON.stringify(expectedSlice2);
});

// Case 7: 在循环中连续 reverse（偶数次）
test('循环 1000 次 reverse（偶数次）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    buf.reverse();
  }

  // 偶数次 reverse 应该恢复原样
  const expected = [1, 2, 3, 4, 5];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 8: 在循环中连续 reverse（奇数次）
test('循环 999 次 reverse（奇数次）', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const iterations = 999;

  for (let i = 0; i < iterations; i++) {
    buf.reverse();
  }

  // 奇数次 reverse 应该反转
  const expected = [40, 30, 20, 10];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 9: Buffer.allocUnsafeSlow 创建的 Buffer
test('Buffer.allocUnsafeSlow 创建的 Buffer 反转', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 10;
  buf[1] = 20;
  buf[2] = 30;
  buf[3] = 40;
  buf[4] = 50;

  buf.reverse();

  const expected = [50, 40, 30, 20, 10];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 10: 包含 null 终止符的 C 字符串
test('包含多个 null 终止符的 C 字符串', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0x57, 0x6F, 0x72, 0x6C, 0x64, 0x00]);
  // "Hello\0World\0"

  buf.reverse();

  // 反转后: [0x00, 0x64, 0x6C, 0x72, 0x6F, 0x57, 0x00, 0x6F, 0x6C, 0x6C, 0x65, 0x48]
  // "\0dlroW\0olleH"

  const expected = [0x00, 0x64, 0x6C, 0x72, 0x6F, 0x57, 0x00, 0x6F, 0x6C, 0x6C, 0x65, 0x48];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 11: base64 编码的 Buffer
test('base64 编码的 Buffer 反转', () => {
  const buf = Buffer.from('SGVsbG8tV29ybGQ', 'base64');
  const originalBytes = Array.from(buf);

  buf.reverse();

  const reversedBytes = Array.from(buf);
  const expected = originalBytes.slice().reverse();
  return JSON.stringify(reversedBytes) === JSON.stringify(expected);
});

// Case 12: latin1 编码的 Buffer
test('latin1 编码的 Buffer 反转', () => {
  const buf = Buffer.from('àéìòù', 'latin1');
  const originalBytes = Array.from(buf);

  buf.reverse();

  const reversedBytes = Array.from(buf);
  const expected = originalBytes.slice().reverse();
  return JSON.stringify(reversedBytes) === JSON.stringify(expected);
});

// Case 13: 包含中文字符的 Buffer（UTF-8）
test('包含中文字符的 Buffer 反转', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  const originalBytes = Array.from(buf);
  const originalLength = buf.length;

  buf.reverse();

  const reversedBytes = Array.from(buf);
  return reversedBytes.length === originalLength &&
         reversedBytes[0] === originalBytes[originalBytes.length - 1];
});

// Case 14: 非常大的 Buffer（10MB）
test('非常大的 Buffer（10MB）反转', () => {
  const size = 10 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  buf[0] = 0xAA;
  buf[size - 1] = 0xBB;

  buf.reverse();

  return buf[0] === 0xBB && buf[size - 1] === 0xAA;
});

// Case 15: Buffer 的不同视图同时反转
test('Buffer 和 Uint8Array 视图同时看到反转结果', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const uint8 = new Uint8Array(ab);

  for (let i = 0; i < 8; i++) buf[i] = i + 1;

  buf.reverse();

  // uint8 应该看到相同的反转结果
  const expectedBuf = [8, 7, 6, 5, 4, 3, 2, 1];
  const actualBuf = Array.from(buf);
  const actualUint8 = Array.from(uint8);

  return JSON.stringify(actualBuf) === JSON.stringify(expectedBuf) &&
         JSON.stringify(actualUint8) === JSON.stringify(expectedBuf);
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
