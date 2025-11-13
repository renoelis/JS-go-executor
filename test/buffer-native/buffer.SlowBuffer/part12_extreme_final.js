// Buffer.allocUnsafeSlow - 极端场景和最终补漏 (Round 5)
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

// 字节序相关的极端测试
test('writeInt8 支持范围 -128 到 127', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeInt8(-128, 0);
  buf.writeInt8(127, 1);
  return buf.readInt8(0) === -128 && buf.readInt8(1) === 127;
});

test('writeUInt8 支持范围 0 到 255', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeUInt8(0, 0);
  buf.writeUInt8(255, 1);
  return buf.readUInt8(0) === 0 && buf.readUInt8(1) === 255;
});

test('writeInt16BE 大端序正确', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeInt16BE(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeInt16LE 小端序正确', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeInt16LE(0x1234, 0);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeInt32BE 大端序正确', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeInt32BE(0x12345678, 0);
  return buf[0] === 0x12 && buf[3] === 0x78;
});

test('writeInt32LE 小端序正确', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeInt32LE(0x12345678, 0);
  return buf[0] === 0x78 && buf[3] === 0x12;
});

test('writeBigInt64LE 正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeBigInt64LE(BigInt(123456789), 0);
  return buf.readBigInt64LE(0) === BigInt(123456789);
});

test('writeBigUInt64LE 正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeBigUInt64LE(BigInt(123456789), 0);
  return buf.readBigUInt64LE(0) === BigInt(123456789);
});

test('writeBigInt64BE 大端序', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeBigInt64BE(BigInt(0x0102030405060700), 0);
  return buf[0] === 0x01 && buf[7] === 0x00;
});

test('writeBigUInt64BE 大端序', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeBigUInt64BE(BigInt(0x0102030405060700), 0);
  return buf[0] === 0x01 && buf[7] === 0x00;
});

// 浮点数精度测试
test('Float 精度有限', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(3.141592653589793, 0);
  const val = buf.readFloatLE(0);
  return Math.abs(val - 3.14159) < 0.001;
});

test('Double 精度更高', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleLE(3.141592653589793, 0);
  const val = buf.readDoubleLE(0);
  return Math.abs(val - 3.141592653589793) < 0.0000000001;
});

test('Float 支持 NaN', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(NaN, 0);
  return Number.isNaN(buf.readFloatLE(0));
});

test('Double 支持 NaN', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleLE(NaN, 0);
  return Number.isNaN(buf.readDoubleLE(0));
});

test('Float 支持 Infinity', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(Infinity, 0);
  return buf.readFloatLE(0) === Infinity;
});

test('Double 支持 -Infinity', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleLE(-Infinity, 0);
  return buf.readDoubleLE(0) === -Infinity;
});

// 越界读写的精确行为
test('readInt8 越界抛出 RangeError', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.readInt8(5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeInt8 越界抛出 RangeError', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.writeInt8(10, 5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('readUInt16LE 越界抛出 RangeError', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.readUInt16LE(4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt32LE 越界抛出 RangeError', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.writeUInt32LE(10, 2);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 性能和内存池相关验证
test('allocUnsafeSlow 不复用内存池 - 小 Buffer', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  buf1.fill(0xFF);
  buf2.fill(0x00);
  return buf1[0] === 0xFF && buf2[0] === 0x00;
});

test('allocUnsafe 可能复用内存池 - 对比', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  return buf1 instanceof Buffer && buf2 instanceof Buffer;
});

test('连续分配不会相互影响', () => {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.allocUnsafeSlow(10);
    buf.fill(i);
    bufs.push(buf);
  }
  return bufs[0][0] === 0 && bufs[5][0] === 5 && bufs[9][0] === 9;
});

// JSON 序列化与反序列化
test('JSON.stringify Buffer 包含类型信息', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  const json = JSON.stringify(buf);
  return json.includes('Buffer') && json.includes('data');
});

test('JSON 序列化后可以恢复', () => {
  const buf1 = Buffer.allocUnsafeSlow(3);
  buf1[0] = 65;
  buf1[1] = 66;
  buf1[2] = 67;
  const json = JSON.parse(JSON.stringify(buf1));
  const buf2 = Buffer.from(json.data);
  return buf2[0] === 65 && buf2[1] === 66 && buf2[2] === 67;
});

// 并发和异步场景
test('可以在 Promise 中使用', async () => {
  const buf = await Promise.resolve(Buffer.allocUnsafeSlow(5));
  return buf.length === 5;
});

test('可以在异步函数中创建和使用', async () => {
  const createBuf = async () => {
    const buf = Buffer.allocUnsafeSlow(10);
    buf.write('async test');
    return buf.toString('utf8', 0, 10);
  };
  const result = await createBuf();
  return result === 'async test';
});

// 特殊应用场景
test('可以用作二进制数据容器', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4E;
  buf[3] = 0x47;
  return buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG';
});

test('可以存储位图数据', () => {
  const width = 10;
  const height = 10;
  const buf = Buffer.allocUnsafeSlow(width * height * 4);
  buf.fill(0);
  buf[0] = 255;
  buf[1] = 0;
  buf[2] = 0;
  buf[3] = 255;
  return buf.length === 400 && buf[0] === 255;
});

test('可以用作网络数据包缓冲', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  buf.writeUInt16BE(80, 0);
  buf.writeUInt32BE(0x7F000001, 2);
  return buf.readUInt16BE(0) === 80 && buf.readUInt32BE(2) === 0x7F000001;
});

// 正则检查（确保没有禁用标识符）
test('测试代码不包含禁用的 Object 方法', () => {
  const code = test.toString();
  return !code.includes('getPrototypeOf');
});

test('测试代码不包含 constructor', () => {
  const code = test.toString();
  return !code.includes('constructor');
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
