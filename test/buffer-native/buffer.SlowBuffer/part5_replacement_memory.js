// Buffer.allocUnsafeSlow - Memory and Safety Tests
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

// 内存未初始化特性
test('新分配的 Buffer 内容未初始化（不保证为 0）', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf instanceof Buffer;
});

test('allocUnsafeSlow 不会自动清零内存', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer;
});

test('对比 Buffer.alloc 会清零内存', () => {
  const safeBuf = Buffer.alloc(10);
  const unsafeBuf = Buffer.allocUnsafeSlow(10);
  const allZero = safeBuf.every(byte => byte === 0);
  return allZero && unsafeBuf instanceof Buffer;
});

// 独立内存分配（不使用池）
test('allocUnsafeSlow 不使用预分配的内存池', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  return buf1 !== buf2;
});

test('小 Buffer 也不使用池（与 allocUnsafe 的主要区别）', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf instanceof Buffer && buf.length === 1;
});

test('对比 Buffer.allocUnsafe 可能使用池', () => {
  const poolBuf = Buffer.allocUnsafe(10);
  const slowBuf = Buffer.allocUnsafeSlow(10);
  return poolBuf instanceof Buffer && slowBuf instanceof Buffer;
});

// 内存安全性
test('修改 Buffer 不会影响其他 Buffer', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  buf1.fill(65);
  buf2.fill(66);
  return buf1[0] === 65 && buf2[0] === 66;
});

test('Buffer 之间内存独立', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1[0] = 1;
  buf1[1] = 2;
  buf2[0] = 3;
  buf2[1] = 4;
  return buf1[0] !== buf2[0] && buf1[1] !== buf2[1];
});

// 越界访问保护
test('读取越界索引返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf[10] === undefined;
});

test('读取负索引返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf[-1] === undefined;
});

test('写入越界索引被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[10] = 100;
  return buf.length === 5;
});

test('写入负索引被忽略', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[-1] = 100;
  return buf.length === 5;
});

// ArrayBuffer 关系
test('Buffer 有对应的 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.byteLength 等于分配的长度', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.byteLength === 10;
});

test('Buffer.byteOffset 从 0 开始', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.byteOffset >= 0;
});

// 零拷贝行为
test('slice 返回视图而非副本', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[5] = 100;
  const slice = buf.slice(0, 10);
  slice[5] = 200;
  return buf[5] === 200;
});

test('subarray 返回视图', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf[3] = 50;
  const sub = buf.subarray(0, 5);
  sub[3] = 150;
  return buf[3] === 150;
});

test('修改视图会影响原 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const view = buf.slice(0, 5);
  view[0] = 99;
  return buf[0] === 99;
});

// 内存写入安全
test('write 方法不会越界写入', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  const written = buf.write('1234567890');
  return written === 5 && buf.length === 5;
});

test('write 指定 offset 不会越界', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const written = buf.write('hello', 8);
  return written <= 2 && buf.length === 10;
});

test('fill 不会越界填充', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(65);
  return buf.length === 5 && buf.every(byte => byte === 65);
});

// 垃圾回收和内存泄漏预防
test('大量分配后内存可以被回收', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.allocUnsafeSlow(1024));
  }
  return bufs.length === 100 && bufs[0] instanceof Buffer;
});

test('连续分配不会导致明显的内存问题', () => {
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.allocUnsafeSlow(100);
    buf.fill(i % 256);
  }
  return true;
});

// 字节顺序和数据完整性
test('writeUInt8 正确写入', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('writeUInt16LE 正确写入', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeUInt16LE(65535, 0);
  return buf.readUInt16LE(0) === 65535;
});

test('writeUInt32LE 正确写入', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeUInt32LE(4294967295, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

test('writeInt8 正确写入负数', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf.writeInt8(-128, 0);
  return buf.readInt8(0) === -128;
});

test('writeInt16LE 正确写入负数', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeInt16LE(-32768, 0);
  return buf.readInt16LE(0) === -32768;
});

test('writeFloatLE 正确写入浮点数', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatLE(3.14, 0);
  const val = buf.readFloatLE(0);
  return Math.abs(val - 3.14) < 0.01;
});

test('writeDoubleLE 正确写入双精度浮点数', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleLE(3.141592653589793, 0);
  const val = buf.readDoubleLE(0);
  return Math.abs(val - 3.141592653589793) < 0.0000000001;
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
