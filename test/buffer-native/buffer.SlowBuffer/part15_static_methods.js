// Buffer.allocUnsafeSlow - 静态方法交互测试
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

// Buffer.of
test('Buffer.of 创建 Buffer', () => {
  const buf = Buffer.of(1, 2, 3, 4, 5);
  return buf.length === 5 && buf[0] === 1 && buf[4] === 5;
});

test('Buffer.of 空参数创建空 Buffer', () => {
  const buf = Buffer.of();
  return buf.length === 0;
});

test('Buffer.of 单个字节', () => {
  const buf = Buffer.of(255);
  return buf.length === 1 && buf[0] === 255;
});

test('Buffer.of 值会取模 256', () => {
  const buf = Buffer.of(256, 257, 258);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('Buffer.of 负数转换', () => {
  const buf = Buffer.of(-1, -2);
  return buf[0] === 255 && buf[1] === 254;
});

test('Buffer.of 返回的是普通 Buffer', () => {
  const buf = Buffer.of(1, 2, 3);
  return Buffer.isBuffer(buf) && buf instanceof Buffer;
});

test('Buffer.of 与 allocUnsafeSlow 创建的 Buffer 兼容', () => {
  const buf1 = Buffer.of(1, 2, 3);
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf2[0] = 1;
  buf2[1] = 2;
  buf2[2] = 3;
  return buf1.equals(buf2);
});

// Buffer.copyBytesFrom
test('Buffer.copyBytesFrom 从 Uint8Array 复制', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(uint8);
  return buf.length === 5 && buf[0] === 1 && buf[4] === 5;
});

test('Buffer.copyBytesFrom 从 Uint8Array 带偏移量', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(uint8, 2);
  return buf.length === 3 && buf[0] === 3;
});

test('Buffer.copyBytesFrom 从 Uint8Array 带偏移量和长度', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(uint8, 1, 3);
  return buf.length === 3 && buf[0] === 2 && buf[2] === 4;
});

test('Buffer.copyBytesFrom 是深拷贝', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(uint8);
  uint8[0] = 100;
  return buf[0] === 1;
});

test('Buffer.copyBytesFrom 返回的是 Buffer', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(uint8);
  return Buffer.isBuffer(buf);
});

test('Buffer.copyBytesFrom 从空 Uint8Array', () => {
  const uint8 = new Uint8Array([]);
  const buf = Buffer.copyBytesFrom(uint8);
  return buf.length === 0;
});

test('Buffer.copyBytesFrom 从 Uint16Array', () => {
  const uint16 = new Uint16Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(uint16);
  return buf.length === 6;
});

test('Buffer.copyBytesFrom 从 Int8Array', () => {
  const int8 = new Int8Array([-1, -2, -3]);
  const buf = Buffer.copyBytesFrom(int8);
  return buf.length === 3 && buf[0] === 255;
});

// Buffer.isEncoding
test('Buffer.isEncoding 识别 utf8', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('Buffer.isEncoding 识别 hex', () => {
  return Buffer.isEncoding('hex') === true;
});

test('Buffer.isEncoding 识别 base64', () => {
  return Buffer.isEncoding('base64') === true;
});

test('Buffer.isEncoding 识别 base64url', () => {
  return Buffer.isEncoding('base64url') === true;
});

test('Buffer.isEncoding 识别 ascii', () => {
  return Buffer.isEncoding('ascii') === true;
});

test('Buffer.isEncoding 识别 latin1', () => {
  return Buffer.isEncoding('latin1') === true;
});

test('Buffer.isEncoding 识别 binary 别名', () => {
  return Buffer.isEncoding('binary') === true;
});

test('Buffer.isEncoding 识别 ucs2', () => {
  return Buffer.isEncoding('ucs2') === true;
});

test('Buffer.isEncoding 识别 utf16le', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('Buffer.isEncoding 大小写不敏感', () => {
  return Buffer.isEncoding('UTF8') === true &&
         Buffer.isEncoding('Hex') === true;
});

test('Buffer.isEncoding 拒绝无效编码', () => {
  return Buffer.isEncoding('invalid') === false;
});

test('Buffer.isEncoding 拒绝空字符串', () => {
  return Buffer.isEncoding('') === false;
});

test('Buffer.isEncoding 拒绝 undefined', () => {
  return Buffer.isEncoding(undefined) === false;
});

test('Buffer.isEncoding 拒绝 null', () => {
  return Buffer.isEncoding(null) === false;
});

test('Buffer.isEncoding 拒绝数字', () => {
  return Buffer.isEncoding(123) === false;
});

// allocUnsafeSlow 与其他静态方法的交互
test('allocUnsafeSlow 与 Buffer.concat 配合', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  buf1.write('abc');
  const buf2 = Buffer.of(1, 2, 3);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 6;
});

test('allocUnsafeSlow 与 Buffer.compare 配合', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  const buf2 = Buffer.allocUnsafeSlow(3);
  buf1.fill(0);
  buf2.fill(0);
  return Buffer.compare(buf1, buf2) === 0;
});

test('allocUnsafeSlow 与 Buffer.byteLength 配合', () => {
  const str = 'hello';
  const len = Buffer.byteLength(str);
  const buf = Buffer.allocUnsafeSlow(len);
  buf.write(str);
  return buf.toString('utf8', 0, len) === str;
});

test('allocUnsafeSlow 创建的 Buffer 通过 Buffer.isBuffer 验证', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.copyBytesFrom 可以从 allocUnsafeSlow Buffer 复制', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  buf1[0] = 1;
  buf1[1] = 2;
  buf1[2] = 3;
  const buf2 = Buffer.copyBytesFrom(buf1, 0, 3);
  return buf2.length === 3 && buf2[0] === 1;
});

// 边界情况
test('Buffer.copyBytesFrom 偏移量为 0', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(uint8, 0);
  return buf.length === 3 && buf[0] === 1;
});

test('Buffer.copyBytesFrom 长度为 0', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(uint8, 0, 0);
  return buf.length === 0;
});

test('Buffer.copyBytesFrom 偏移量等于长度', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(uint8, 3);
  return buf.length === 0;
});

test('Buffer.of 大量参数', () => {
  const buf = Buffer.of(...Array(100).fill(0).map((_, i) => i % 256));
  return buf.length === 100 && buf[99] === 99;
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
