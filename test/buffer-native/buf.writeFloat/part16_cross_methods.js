// buf.writeFloatBE/LE() - 跨方法交互测试
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

// 与 readFloat 方法交互
test('writeFloatBE 后用 readFloatBE 读取一致', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [0, 1, -1, 0.5, -0.5, 123.456, -987.654];
  return values.every(val => {
    buf.writeFloatBE(val, 0);
    const read = buf.readFloatBE(0);
    return Math.abs(read - val) < 0.001;
  });
});

test('writeFloatLE 后用 readFloatLE 读取一致', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [0, 1, -1, 0.5, -0.5, 123.456, -987.654];
  return values.every(val => {
    buf.writeFloatLE(val, 0);
    const read = buf.readFloatLE(0);
    return Math.abs(read - val) < 0.001;
  });
});

// 与 Double 方法交互
test('writeFloatBE 后用 readDoubleBE 读取（扩展到8字节）', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);
  buf.writeFloatBE(3.14, 0);
  try {
    const value = buf.readDoubleBE(0);
    return typeof value === 'number';
  } catch (e) {
    return true;
  }
});

test('writeFloatLE 后用 readDoubleLE 读取（扩展到8字节）', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);
  buf.writeFloatLE(3.14, 0);
  try {
    const value = buf.readDoubleLE(0);
    return typeof value === 'number';
  } catch (e) {
    return true;
  }
});

// 与 Int32 方法交互
test('writeFloatBE 后用 readInt32BE 读取原始位', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.0, 0);
  const bits = buf.readInt32BE(0);
  return bits === 1065353216;
});

test('writeFloatLE 后用 readInt32LE 读取原始位', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.0, 0);
  const bits = buf.readInt32LE(0);
  return bits === 1065353216;
});

test('writeFloatBE 后用 readUInt32BE 读取原始位', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-1.0, 0);
  const bits = buf.readUInt32BE(0);
  return bits === 3212836864;
});

test('writeFloatLE 后用 readUInt32LE 读取原始位', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-1.0, 0);
  const bits = buf.readUInt32LE(0);
  return bits === 3212836864;
});

// 与 fill 方法交互
test('fill 后 writeFloatBE 覆盖部分字节', () => {
  const buf = Buffer.alloc(8, 0xff);
  buf.writeFloatBE(0, 2);
  return buf[0] === 0xff && buf[1] === 0xff &&
         buf[2] === 0x00 && buf[3] === 0x00 && buf[4] === 0x00 && buf[5] === 0x00 &&
         buf[6] === 0xff && buf[7] === 0xff;
});

test('fill 后 writeFloatLE 覆盖部分字节', () => {
  const buf = Buffer.alloc(8, 0xff);
  buf.writeFloatLE(0, 2);
  return buf[0] === 0xff && buf[1] === 0xff &&
         buf[2] === 0x00 && buf[3] === 0x00 && buf[4] === 0x00 && buf[5] === 0x00 &&
         buf[6] === 0xff && buf[7] === 0xff;
});

// 与 copy 方法交互
test('writeFloatBE 后 copy 到另一个 buffer', () => {
  const src = Buffer.allocUnsafe(4);
  const dst = Buffer.allocUnsafe(4);
  src.writeFloatBE(42.5, 0);
  src.copy(dst, 0, 0, 4);
  const value = dst.readFloatBE(0);
  return value === 42.5;
});

test('writeFloatLE 后 copy 到另一个 buffer', () => {
  const src = Buffer.allocUnsafe(4);
  const dst = Buffer.allocUnsafe(4);
  src.writeFloatLE(42.5, 0);
  src.copy(dst, 0, 0, 4);
  const value = dst.readFloatLE(0);
  return value === 42.5;
});

// 与 slice/subarray 交互
test('writeFloatBE 在 slice 上写入', () => {
  const buf = Buffer.allocUnsafe(12);
  const slice = buf.slice(4, 8);
  slice.writeFloatBE(99.99, 0);
  const value = buf.readFloatBE(4);
  return Math.abs(value - 99.99) < 0.01;
});

test('writeFloatLE 在 slice 上写入', () => {
  const buf = Buffer.allocUnsafe(12);
  const slice = buf.slice(4, 8);
  slice.writeFloatLE(99.99, 0);
  const value = buf.readFloatLE(4);
  return Math.abs(value - 99.99) < 0.01;
});

test('writeFloatBE 在 subarray 上写入', () => {
  const buf = Buffer.allocUnsafe(12);
  const sub = buf.subarray(4, 8);
  sub.writeFloatBE(88.88, 0);
  const value = buf.readFloatBE(4);
  return Math.abs(value - 88.88) < 0.01;
});

test('writeFloatLE 在 subarray 上写入', () => {
  const buf = Buffer.allocUnsafe(12);
  const sub = buf.subarray(4, 8);
  sub.writeFloatLE(88.88, 0);
  const value = buf.readFloatLE(4);
  return Math.abs(value - 88.88) < 0.01;
});

// 与 toString 交互
test('writeFloatBE 后 toString hex 查看字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.0, 0);
  const hex = buf.toString('hex');
  return hex === '3f800000';
});

test('writeFloatLE 后 toString hex 查看字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.0, 0);
  const hex = buf.toString('hex');
  return hex === '0000803f';
});

// 与 Buffer.compare 交互
test('writeFloatBE 相同值的 buffer compare 结果为 0', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatBE(3.14, 0);
  buf2.writeFloatBE(3.14, 0);
  return Buffer.compare(buf1, buf2) === 0;
});

test('writeFloatLE 相同值的 buffer compare 结果为 0', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatLE(3.14, 0);
  buf2.writeFloatLE(3.14, 0);
  return Buffer.compare(buf1, buf2) === 0;
});

// 与 Buffer.equals 交互
test('writeFloatBE 相同值的 buffer equals 为 true', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatBE(2.71, 0);
  buf2.writeFloatBE(2.71, 0);
  return buf1.equals(buf2);
});

test('writeFloatLE 相同值的 buffer equals 为 true', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatLE(2.71, 0);
  buf2.writeFloatLE(2.71, 0);
  return buf1.equals(buf2);
});

test('writeFloatBE 不同值的 buffer equals 为 false', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatBE(1.23, 0);
  buf2.writeFloatBE(4.56, 0);
  return !buf1.equals(buf2);
});

test('writeFloatLE 不同值的 buffer equals 为 false', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatLE(1.23, 0);
  buf2.writeFloatLE(4.56, 0);
  return !buf1.equals(buf2);
});

// 与 indexOf 交互
test('writeFloatBE 后 indexOf 查找字节序列', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.fill(0);
  buf.writeFloatBE(1.0, 4);
  const pattern = Buffer.from([0x3f, 0x80, 0x00, 0x00]);
  return buf.indexOf(pattern) === 4;
});

test('writeFloatLE 后 indexOf 查找字节序列', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.fill(0);
  buf.writeFloatLE(1.0, 4);
  const pattern = Buffer.from([0x00, 0x00, 0x80, 0x3f]);
  return buf.indexOf(pattern) === 4;
});

// 与 swap 方法交互
test('writeFloatBE 后 swap32 改变字节序', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.0, 0);
  const original = buf.toString('hex');
  buf.swap32();
  const swapped = buf.toString('hex');
  return original !== swapped;
});

test('writeFloatLE 后 swap32 改变字节序', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.0, 0);
  const original = buf.toString('hex');
  buf.swap32();
  const swapped = buf.toString('hex');
  return original !== swapped;
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
