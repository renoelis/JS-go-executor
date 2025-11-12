// buffer.isAscii() - Part 12: Node.js Specific Behaviors and Final Edge Cases
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer pooling 相关
test('Buffer.allocUnsafe 池化行为 - 小 Buffer', () => {
  const buf1 = Buffer.allocUnsafe(10);
  buf1.fill(0x41);
  const buf2 = Buffer.allocUnsafe(10);
  buf2.fill(0x42);
  // 两个 Buffer 应该独立
  return isAscii(buf1) === true && isAscii(buf2) === true;
});

test('Buffer.allocUnsafeSlow 非池化', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0x43);
  return isAscii(buf) === true;
});

test('混合 allocUnsafe 和 alloc', () => {
  const buf1 = Buffer.alloc(10, 0x41);
  const buf2 = Buffer.allocUnsafe(10);
  buf2.fill(0x42);
  const buf3 = Buffer.alloc(10, 0x43);
  const result = Buffer.concat([buf1, buf2, buf3]);
  return isAscii(result) === true;
});

// Buffer 常量测试
test('Buffer.constants.MAX_LENGTH 相关', () => {
  // 不创建实际的超大 Buffer，只验证小 Buffer
  const buf = Buffer.alloc(100, 0x41);
  return isAscii(buf) === true;
});

// 特殊字符模式
test('连续 DEL 字符 (0x7F)', () => {
  const buf = Buffer.alloc(100, 0x7F);
  return isAscii(buf) === true;
});

test('连续 NUL 字符 (0x00)', () => {
  const buf = Buffer.alloc(100, 0x00);
  return isAscii(buf) === true;
});

test('NUL 终止字符串', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00]);
  return isAscii(buf) === true;
});

test('包含多个 NUL 的 Buffer', () => {
  const buf = Buffer.from([0x41, 0x00, 0x42, 0x00, 0x43]);
  return isAscii(buf) === true;
});

// ASCII 表完整性测试
test('ASCII 打印字符 0x20-0x7E', () => {
  const chars = [];
  for (let i = 0x20; i <= 0x7E; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === true;
});

test('ASCII 控制字符 0x00-0x1F', () => {
  const chars = [];
  for (let i = 0x00; i <= 0x1F; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === true;
});

test('完整 ASCII 表 0x00-0x7F', () => {
  const chars = [];
  for (let i = 0x00; i <= 0x7F; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === true;
});

test('ASCII 表 + 单个非 ASCII (0x80)', () => {
  const chars = [];
  for (let i = 0x00; i <= 0x7F; i++) {
    chars.push(i);
  }
  chars.push(0x80);
  const buf = Buffer.from(chars);
  return isAscii(buf) === false;
});

// 编码边界测试
test('UTF-8 BOM 完整测试', () => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  return isAscii(bom) === false;
});

test('UTF-16 BE BOM', () => {
  const bom = Buffer.from([0xFE, 0xFF]);
  return isAscii(bom) === false;
});

test('UTF-16 LE BOM', () => {
  const bom = Buffer.from([0xFF, 0xFE]);
  return isAscii(bom) === false;
});

test('UTF-32 BE BOM', () => {
  const bom = Buffer.from([0x00, 0x00, 0xFE, 0xFF]);
  return isAscii(bom) === false;
});

test('UTF-32 LE BOM', () => {
  const bom = Buffer.from([0xFF, 0xFE, 0x00, 0x00]);
  return isAscii(bom) === false;
});

// 字节模式测试
test('交替 0 和 1', () => {
  const arr = [];
  for (let i = 0; i < 100; i++) {
    arr.push(i % 2);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === true;
});

test('递增然后递减模式', () => {
  const arr = [];
  for (let i = 0; i < 64; i++) {
    arr.push(i);
  }
  for (let i = 63; i >= 0; i--) {
    arr.push(i);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === true;
});

test('斐波那契模式 (mod 128)', () => {
  const arr = [0, 1];
  for (let i = 2; i < 20; i++) {
    arr.push((arr[i - 1] + arr[i - 2]) % 128);
  }
  const buf = Buffer.from(arr);
  return isAscii(buf) === true;
});

// 位运算边界
test('所有位模式 0b0xxxxxxx', () => {
  const results = [];
  for (let i = 0; i <= 0x7F; i++) {
    const buf = Buffer.from([i]);
    results.push(isAscii(buf) === true);
  }
  return results.every(r => r === true);
});

test('所有位模式 0b1xxxxxxx', () => {
  const results = [];
  for (let i = 0x80; i <= 0xFF; i++) {
    const buf = Buffer.from([i]);
    results.push(isAscii(buf) === false);
  }
  return results.every(r => r === true);
});

test('高位 bit 测试 - 0x7F (0b01111111)', () => {
  const buf = Buffer.from([0x7F]);
  return isAscii(buf) === true;
});

test('高位 bit 测试 - 0x80 (0b10000000)', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

// 浮点数作为填充值的边界
test('Buffer.alloc 浮点数填充 - 自动转换', () => {
  const buf = Buffer.alloc(10, 65.7); // 应该转为 65 (0x41)
  return isAscii(buf) === true;
});

test('Buffer.alloc 负数填充 - 自动转换', () => {
  const buf = Buffer.alloc(10, -1); // 应该转为 255 (0xFF)
  return isAscii(buf) === false;
});

test('Buffer.alloc 大数填充 - 取模', () => {
  const buf = Buffer.alloc(10, 256); // 应该转为 0
  return isAscii(buf) === true;
});

test('Buffer.alloc 大数填充 - 取模到非 ASCII', () => {
  const buf = Buffer.alloc(10, 384); // 384 % 256 = 128 (0x80)
  return isAscii(buf) === false;
});

// 特殊 ArrayBuffer 操作
test('ArrayBuffer.transfer 后检查', () => {
  if (typeof ArrayBuffer.transfer === 'function') {
    const ab1 = new ArrayBuffer(10);
    const arr1 = new Uint8Array(ab1);
    arr1.fill(0x41);
    const ab2 = ArrayBuffer.transfer(ab1, 10);
    const arr2 = new Uint8Array(ab2);
    return isAscii(arr2) === true;
  }
  return true; // 跳过
});

// 内存对齐验证
test('4 字节对齐 - 全 ASCII', () => {
  const buf = Buffer.alloc(4, 0x41);
  return isAscii(buf) === true;
});

test('8 字节对齐 - 全 ASCII', () => {
  const buf = Buffer.alloc(8, 0x41);
  return isAscii(buf) === true;
});

test('16 字节对齐 - 前 4 字节非 ASCII', () => {
  const buf = Buffer.alloc(16, 0x41);
  buf[0] = 0x80;
  buf[1] = 0x81;
  buf[2] = 0x82;
  buf[3] = 0x83;
  return isAscii(buf) === false;
});

test('16 字节对齐 - 后 4 字节非 ASCII', () => {
  const buf = Buffer.alloc(16, 0x41);
  buf[12] = 0x80;
  buf[13] = 0x81;
  buf[14] = 0x82;
  buf[15] = 0x83;
  return isAscii(buf) === false;
});

// Buffer 迭代器相关（不直接测试迭代器，但测试内容）
test('可迭代 Buffer - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const values = Array.from(buf);
  const reconstructed = Buffer.from(values);
  return isAscii(reconstructed) === true;
});

test('可迭代 Buffer - 非 ASCII', () => {
  const buf = Buffer.from([0x80, 0xFF]);
  const values = Array.from(buf);
  const reconstructed = Buffer.from(values);
  return isAscii(reconstructed) === false;
});

// 边缘 length 组合
test('length 2^0 = 1', () => {
  const buf = Buffer.alloc(1, 0x41);
  return isAscii(buf) === true;
});

test('length 2^1 = 2', () => {
  const buf = Buffer.alloc(2, 0x41);
  return isAscii(buf) === true;
});

test('length 2^2 = 4', () => {
  const buf = Buffer.alloc(4, 0x41);
  return isAscii(buf) === true;
});

test('length 2^3 = 8', () => {
  const buf = Buffer.alloc(8, 0x41);
  return isAscii(buf) === true;
});

test('length 2^4 = 16', () => {
  const buf = Buffer.alloc(16, 0x41);
  return isAscii(buf) === true;
});

test('length 2^5 = 32', () => {
  const buf = Buffer.alloc(32, 0x41);
  return isAscii(buf) === true;
});

test('length 2^6 = 64', () => {
  const buf = Buffer.alloc(64, 0x41);
  return isAscii(buf) === true;
});

test('length 2^7 = 128', () => {
  const buf = Buffer.alloc(128, 0x41);
  return isAscii(buf) === true;
});

test('length 2^8 = 256', () => {
  const buf = Buffer.alloc(256, 0x41);
  return isAscii(buf) === true;
});

test('length 2^10 = 1024', () => {
  const buf = Buffer.alloc(1024, 0x41);
  return isAscii(buf) === true;
});

test('length 2^12 = 4096', () => {
  const buf = Buffer.alloc(4096, 0x41);
  return isAscii(buf) === true;
});

// 最终极端组合
test('所有 ASCII 白字符', () => {
  const whitespace = [0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20];
  const buf = Buffer.from(whitespace);
  return isAscii(buf) === true;
});

test('URL 安全字符', () => {
  const urlSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const buf = Buffer.from(urlSafe);
  return isAscii(buf) === true;
});

test('Base64 字符集', () => {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const buf = Buffer.from(base64Chars);
  return isAscii(buf) === true;
});

test('所有数字字符 0-9', () => {
  const digits = '0123456789';
  const buf = Buffer.from(digits);
  return isAscii(buf) === true;
});

test('所有小写字母 a-z', () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const buf = Buffer.from(lowercase);
  return isAscii(buf) === true;
});

test('所有大写字母 A-Z', () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const buf = Buffer.from(uppercase);
  return isAscii(buf) === true;
});

test('所有标点符号', () => {
  const punctuation = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
  const buf = Buffer.from(punctuation);
  return isAscii(buf) === true;
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
