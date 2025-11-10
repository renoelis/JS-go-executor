// buf.readBigInt64BE() - Buffer 池化和重用测试
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

// Buffer 重用 - allocUnsafe
test('allocUnsafe 后写入再读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(12345n, 0);
  return buf.readBigInt64BE(0) === 12345n;
});

// 多次 allocUnsafe
test('多次 allocUnsafe 独立性', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeBigInt64BE(111n, 0);
  buf2.writeBigInt64BE(222n, 0);
  return buf1.readBigInt64BE(0) === 111n && buf2.readBigInt64BE(0) === 222n;
});

// Buffer.concat 后读取
test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x64]);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readBigInt64BE(0) === 100n;
});

// Buffer.concat 多个 Buffer
test('Buffer.concat 多个 Buffer 后读取', () => {
  const bufs = [
    Buffer.from([0x00, 0x00]),
    Buffer.from([0x00, 0x00]),
    Buffer.from([0x00, 0x00]),
    Buffer.from([0x00, 0xC8])
  ];
  const combined = Buffer.concat(bufs);
  return combined.readBigInt64BE(0) === 200n;
});

// Buffer.concat 空数组
test('Buffer.concat 空数组', () => {
  try {
    const buf = Buffer.concat([]);
    buf.readBigInt64BE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer.concat 单个 Buffer
test('Buffer.concat 单个 Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(300n, 0);
  const combined = Buffer.concat([buf]);
  return combined.readBigInt64BE(0) === 300n;
});

// 重复使用同一 Buffer
test('重复写入和读取同一 Buffer', () => {
  const buf = Buffer.alloc(8);
  
  buf.writeBigInt64BE(100n, 0);
  const r1 = buf.readBigInt64BE(0);
  
  buf.writeBigInt64BE(200n, 0);
  const r2 = buf.readBigInt64BE(0);
  
  buf.writeBigInt64BE(300n, 0);
  const r3 = buf.readBigInt64BE(0);
  
  return r1 === 100n && r2 === 200n && r3 === 300n;
});

// Buffer.from 字符串后读取
test('Buffer.from 十六进制字符串', () => {
  const buf = Buffer.from('0000000000000064', 'hex');
  return buf.readBigInt64BE(0) === 100n;
});

// Buffer.from base64
test('Buffer.from base64 字符串', () => {
  const buf = Buffer.from('AAAAAAAAAGQ=', 'base64');
  return buf.readBigInt64BE(0) === 100n;
});

// Buffer 填充后读取
test('Buffer.fill 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigInt64BE(0) === -1n;
});

// Buffer 部分填充
test('Buffer 部分填充后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x00, 0, 7);
  buf.fill(0x64, 7, 8);
  return buf.readBigInt64BE(0) === 100n;
});

// Buffer copy 后读取
test('Buffer.copy 后读取', () => {
  const src = Buffer.alloc(8);
  src.writeBigInt64BE(12345n, 0);
  
  const dest = Buffer.alloc(8);
  src.copy(dest);
  
  return dest.readBigInt64BE(0) === 12345n;
});

// Buffer copy 部分
test('Buffer.copy 部分后读取', () => {
  const src = Buffer.alloc(16);
  src.writeBigInt64BE(11111n, 0);
  src.writeBigInt64BE(22222n, 8);
  
  const dest = Buffer.alloc(8);
  src.copy(dest, 0, 8, 16);
  
  return dest.readBigInt64BE(0) === 22222n;
});

// Buffer swap 字节序
test('Buffer.swap64 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  buf.swap64();
  return buf.readBigInt64BE(0) === 0x0807060504030201n;
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
