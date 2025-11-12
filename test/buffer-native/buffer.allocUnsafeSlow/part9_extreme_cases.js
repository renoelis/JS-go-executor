// Buffer.allocUnsafeSlow - 极端场景与压力测试
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

// 极小值测试
test('size = 0 创建空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && Buffer.isBuffer(buf);
});

test('size = 1 最小非空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1;
});

test('空 Buffer 支持所有方法', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return typeof buf.slice === 'function' &&
         typeof buf.toString === 'function';
});

test('空 Buffer 的 slice 返回空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  const sliced = buf.slice();
  return sliced.length === 0;
});

test('空 Buffer 的 toString 返回空字符串', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.toString() === '';
});

// 大 Buffer 测试
test('分配 1MB Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1024 * 1024);
  return buf.length === 1024 * 1024;
});

test('分配 10MB Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10 * 1024 * 1024);
  return buf.length === 10 * 1024 * 1024;
});

test('大 Buffer 可以正确索引', () => {
  const buf = Buffer.allocUnsafeSlow(1024 * 1024);
  buf[0] = 100;
  buf[1024 * 1024 - 1] = 200;
  return buf[0] === 100 && buf[1024 * 1024 - 1] === 200;
});

test('大 Buffer 可以填充', () => {
  const buf = Buffer.allocUnsafeSlow(100000);
  buf.fill(255);
  return buf[0] === 255 && buf[99999] === 255;
});

// 连续分配压力测试
test('连续分配 100 个小 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.allocUnsafeSlow(100));
  }
  return bufs.length === 100 && bufs[99].length === 100;
});

test('连续分配 100 个中等 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.allocUnsafeSlow(10240));
  }
  return bufs.length === 100;
});

test('连续分配 50 个大 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 50; i++) {
    bufs.push(Buffer.allocUnsafeSlow(102400));
  }
  return bufs.length === 50;
});

test('交替分配不同大小 Buffer', () => {
  const sizes = [10, 100, 1000, 10000, 100000];
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    const size = sizes[i % sizes.length];
    bufs.push(Buffer.allocUnsafeSlow(size));
  }
  return bufs.length === 100;
});

// 边界值组合测试
test('0.0 等于 0', () => {
  const buf = Buffer.allocUnsafeSlow(0.0);
  return buf.length === 0;
});

test('1.0 等于 1', () => {
  const buf = Buffer.allocUnsafeSlow(1.0);
  return buf.length === 1;
});

test('正浮点数截断', () => {
  const testCases = [
    [0.1, 0], [0.5, 0], [0.9, 0],
    [1.1, 1], [1.5, 1], [1.9, 1],
    [10.9, 10], [100.9, 100]
  ];
  for (const [input, expected] of testCases) {
    const buf = Buffer.allocUnsafeSlow(input);
    if (buf.length !== expected) return false;
  }
  return true;
});

test('布尔值不被接受', () => {
  try {
    Buffer.allocUnsafeSlow(true);
    return false;
  } catch (e) {
    if (e.name !== 'TypeError') return false;
  }
  try {
    Buffer.allocUnsafeSlow(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 特殊 size 值测试
test('2^10 = 1024', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return buf.length === 1024;
});

test('2^12 = 4096', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  return buf.length === 4096;
});

test('2^16 = 65536', () => {
  const buf = Buffer.allocUnsafeSlow(65536);
  return buf.length === 65536;
});

test('2^20 = 1048576 (1MB)', () => {
  const buf = Buffer.allocUnsafeSlow(1048576);
  return buf.length === 1048576;
});

// 内存操作极端测试
test('大量连续写入', () => {
  const buf = Buffer.allocUnsafeSlow(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i % 256;
  }
  return buf[9999] === 9999 % 256;
});

test('大量连续读取', () => {
  const buf = Buffer.allocUnsafeSlow(10000);
  buf.fill(100);
  let sum = 0;
  for (let i = 0; i < 10000; i++) {
    sum += buf[i];
  }
  return sum === 1000000;
});

test('反复修改同一位置', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  for (let i = 0; i < 1000; i++) {
    buf[5] = i % 256;
  }
  return buf[5] === 999 % 256;
});

test('全 Buffer 扫描', () => {
  const buf = Buffer.allocUnsafeSlow(10000);
  buf.fill(50);
  let allMatch = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 50) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

// 复制与切片极端测试
test('切片空 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('切片单字节 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  buf[0] = 100;
  const sliced = buf.slice(0, 1);
  return sliced.length === 1 && sliced[0] === 100;
});

test('多层切片', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  buf.fill(0);
  buf[50] = 255;
  const s1 = buf.slice(40, 60);
  const s2 = s1.slice(5, 15);
  return s2[5] === 255;
});

test('切片后修改原 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const sliced = buf.slice(0, 5);
  buf[2] = 100;
  return sliced[2] === 100;
});

test('切片后修改切片', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const sliced = buf.slice(0, 5);
  sliced[2] = 200;
  return buf[2] === 200;
});

// 编码操作极端测试
test('写入超长字符串会截断', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  const written = buf.write('Hello World', 0, 'utf8');
  return written === 5;
});

test('写入空字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(255);
  const written = buf.write('', 0, 'utf8');
  return written === 0 && buf[0] === 255;
});

test('toString 空范围', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('test', 0);
  const str = buf.toString('utf8', 0, 0);
  return str === '';
});

test('toString 完整 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.fill(0);
  buf.write('hello', 0);
  const str = buf.toString('utf8');
  return str.startsWith('hello');
});

// 数值读写边界测试
test('writeUInt8 最大值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('writeUInt8 最小值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeUInt8(0, 0);
  return buf.readUInt8(0) === 0;
});

test('writeInt8 最大值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeInt8(127, 0);
  return buf.readInt8(0) === 127;
});

test('writeInt8 最小值', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.writeInt8(-128, 0);
  return buf.readInt8(0) === -128;
});

test('写入多个数值不互相影响', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.writeUInt8(100, 0);
  buf.writeUInt16LE(1000, 2);
  buf.writeUInt32LE(100000, 4);
  return buf.readUInt8(0) === 100 &&
         buf.readUInt16LE(2) === 1000 &&
         buf.readUInt32LE(4) === 100000;
});

// 并发操作模拟
test('模拟并发修改', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  buf.fill(0);
  for (let i = 0; i < 100; i++) {
    buf[i] = i;
  }
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== i) return false;
  }
  return true;
});

test('多次 fill 覆盖', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  buf.fill(0);
  buf.fill(100);
  buf.fill(200);
  return buf[0] === 200 && buf[99] === 200;
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
