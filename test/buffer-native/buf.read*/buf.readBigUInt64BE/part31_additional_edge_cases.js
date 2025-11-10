// buf.readBigUInt64BE() - 额外边界情况测试
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

// 测试 Buffer.allocUnsafe
test('从 Buffer.allocUnsafe 创建的 Buffer 可以读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64BE(123n, 0);
  return buf.readBigUInt64BE(0) === 123n;
});

test('Buffer.allocUnsafe 初始值不确定但可以覆盖', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);
  buf.writeBigUInt64BE(456n, 0);
  return buf.readBigUInt64BE(0) === 456n;
});

// 测试 Buffer.allocUnsafeSlow
test('从 Buffer.allocUnsafeSlow 创建的 Buffer 可以读取', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeBigUInt64BE(789n, 0);
  return buf.readBigUInt64BE(0) === 789n;
});

// 测试 Buffer.from 的各种重载
test('Buffer.from(array) 可以读取', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 10]);
  return buf.readBigUInt64BE(0) === 10n;
});

test('Buffer.from(buffer) 可以读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigUInt64BE(111n, 0);
  const buf2 = Buffer.from(buf1);
  return buf2.readBigUInt64BE(0) === 111n;
});

test('Buffer.from(string) 可以读取（如果长度足够）', () => {
  const buf = Buffer.from('12345678', 'utf8');
  if (buf.length < 8) return true; // 跳过长度不足的情况
  try {
    const result = buf.readBigUInt64BE(0);
    return typeof result === 'bigint';
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试 Buffer 的各种编码
test('Buffer.from hex 编码后读取', () => {
  const buf = Buffer.from('0000000000000064', 'hex');
  return buf.readBigUInt64BE(0) === 100n;
});

test('Buffer.from base64 编码后读取', () => {
  const buf = Buffer.from('AAAAAAAAAGQ=', 'base64');
  return buf.readBigUInt64BE(0) === 100n;
});

// 测试特殊的 Buffer 长度
test('Buffer 长度正好 8 字节时 offset=0 可以读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(222n, 0);
  return buf.readBigUInt64BE(0) === 222n;
});

test('Buffer 长度 16 字节时 offset=0 和 offset=8 可以读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(333n, 0);
  buf.writeBigUInt64BE(444n, 8);
  return buf.readBigUInt64BE(0) === 333n && buf.readBigUInt64BE(8) === 444n;
});

test('Buffer 长度 15 字节时最大 offset 为 7', () => {
  const buf = Buffer.alloc(15);
  buf.writeBigUInt64BE(555n, 7);
  return buf.readBigUInt64BE(7) === 555n;
});

test('Buffer 长度 15 字节时 offset=8 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(15);
    buf.readBigUInt64BE(8);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试 Buffer 的特殊操作
test('Buffer.fill 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigUInt64BE(0) === 18446744073709551615n;
});

test('Buffer.write 后读取', () => {
  const buf = Buffer.alloc(8);
  buf.write('\x00\x00\x00\x00\x00\x00\x01\x00', 0, 'binary');
  return buf.readBigUInt64BE(0) === 256n;
});

test('Buffer.copy 后读取', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeBigUInt64BE(666n, 0);
  const buf2 = Buffer.alloc(8);
  buf1.copy(buf2);
  return buf2.readBigUInt64BE(0) === 666n;
});

test('Buffer.copy 部分数据后读取', () => {
  const buf1 = Buffer.alloc(16);
  buf1.writeBigUInt64BE(777n, 0);
  buf1.writeBigUInt64BE(888n, 8);
  const buf2 = Buffer.alloc(8);
  buf1.copy(buf2, 0, 8, 16);
  return buf2.readBigUInt64BE(0) === 888n;
});

// 测试 offset 的特殊值
test('offset = -0 等同于 offset = 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(999n, 0);
  return buf.readBigUInt64BE(-0) === 999n;
});

test('offset = 0.0 等同于 offset = 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1010n, 0);
  return buf.readBigUInt64BE(0.0) === 1010n;
});

test('offset = Number("0") 可以工作', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1111n, 0);
  return buf.readBigUInt64BE(Number("0")) === 1111n;
});

// 测试与其他 read 方法的交互
test('writeBigUInt64BE + readBigUInt64BE 往返', () => {
  const buf = Buffer.alloc(8);
  const value = 12345678901234567890n;
  buf.writeBigUInt64BE(value, 0);
  return buf.readBigUInt64BE(0) === value;
});

test('writeBigInt64BE + readBigUInt64BE 读取相同字节', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-1n, 0);
  return buf.readBigUInt64BE(0) === 18446744073709551615n;
});

test('writeUInt32BE 两次 + readBigUInt64BE', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);
  return buf.readBigUInt64BE(0) === 0x123456789ABCDEF0n;
});

// 测试 Buffer 的特殊状态
test('新分配的 Buffer.alloc 填充为 0', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigUInt64BE(0) === 0n;
});

test('Buffer.alloc 指定 fill 值', () => {
  const buf = Buffer.alloc(8, 0xFF);
  return buf.readBigUInt64BE(0) === 18446744073709551615n;
});

test('Buffer.alloc 指定 fill 值为数组', () => {
  const buf = Buffer.alloc(8, Buffer.from([0x01]));
  return buf.readBigUInt64BE(0) === 0x0101010101010101n;
});

// 测试连续操作
test('连续读取不同位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(100n, 0);
  buf.writeBigUInt64BE(200n, 8);
  buf.writeBigUInt64BE(300n, 16);
  return buf.readBigUInt64BE(0) === 100n &&
         buf.readBigUInt64BE(8) === 200n &&
         buf.readBigUInt64BE(16) === 300n;
});

test('循环读取', () => {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    buf.writeBigUInt64BE(BigInt(i * 100), i * 8);
  }
  let allPass = true;
  for (let i = 0; i < 4; i++) {
    if (buf.readBigUInt64BE(i * 8) !== BigInt(i * 100)) {
      allPass = false;
    }
  }
  return allPass;
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
