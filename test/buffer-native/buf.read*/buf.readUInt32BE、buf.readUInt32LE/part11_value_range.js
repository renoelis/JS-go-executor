// 完整数值范围测试 - 32位无符号整数
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

// 边界值测试
test('BE: 读取 0（最小值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0, 0);
  return buf.readUInt32BE(0) === 0;
});

test('LE: 读取 0（最小值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0, 0);
  return buf.readUInt32LE(0) === 0;
});

test('BE: 读取 4294967295（最大值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(4294967295, 0);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 读取 4294967295（最大值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(4294967295, 0);
  return buf.readUInt32LE(0) === 4294967295;
});

test('BE: 读取 1（最小值 + 1）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readUInt32BE(0) === 1;
});

test('LE: 读取 1（最小值 + 1）', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 1;
});

test('BE: 读取 4294967294（最大值 - 1）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFE]);
  return buf.readUInt32BE(0) === 4294967294;
});

test('LE: 读取 4294967294（最大值 - 1）', () => {
  const buf = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(0) === 4294967294;
});

// 中间值测试
test('BE: 读取 2147483648（中点）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2147483648, 0);
  return buf.readUInt32BE(0) === 2147483648;
});

test('LE: 读取 2147483648（中点）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2147483648, 0);
  return buf.readUInt32LE(0) === 2147483648;
});

test('BE: 读取 2147483647（最大有符号32位整数）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2147483647, 0);
  return buf.readUInt32BE(0) === 2147483647;
});

test('LE: 读取 2147483647（最大有符号32位整数）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2147483647, 0);
  return buf.readUInt32LE(0) === 2147483647;
});

test('BE: 读取 2147483649', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2147483649, 0);
  return buf.readUInt32BE(0) === 2147483649;
});

test('LE: 读取 2147483649', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2147483649, 0);
  return buf.readUInt32LE(0) === 2147483649;
});

// 小值测试
test('BE: 读取 2', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2, 0);
  return buf.readUInt32BE(0) === 2;
});

test('LE: 读取 2', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2, 0);
  return buf.readUInt32LE(0) === 2;
});

test('BE: 读取 10', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(10, 0);
  return buf.readUInt32BE(0) === 10;
});

test('LE: 读取 10', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(10, 0);
  return buf.readUInt32LE(0) === 10;
});

test('BE: 读取 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(100, 0);
  return buf.readUInt32BE(0) === 100;
});

test('LE: 读取 100', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(100, 0);
  return buf.readUInt32LE(0) === 100;
});

test('BE: 读取 256', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(256, 0);
  return buf.readUInt32BE(0) === 256;
});

test('LE: 读取 256', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(256, 0);
  return buf.readUInt32LE(0) === 256;
});

test('BE: 读取 1000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1000, 0);
  return buf.readUInt32BE(0) === 1000;
});

test('LE: 读取 1000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1000, 0);
  return buf.readUInt32LE(0) === 1000;
});

test('BE: 读取 65536', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(65536, 0);
  return buf.readUInt32BE(0) === 65536;
});

test('LE: 读取 65536', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(65536, 0);
  return buf.readUInt32LE(0) === 65536;
});

// 大值测试
test('BE: 读取 16777216（2^24）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(16777216, 0);
  return buf.readUInt32BE(0) === 16777216;
});

test('LE: 读取 16777216（2^24）', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(16777216, 0);
  return buf.readUInt32LE(0) === 16777216;
});

test('BE: 读取 1000000000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1000000000, 0);
  return buf.readUInt32BE(0) === 1000000000;
});

test('LE: 读取 1000000000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1000000000, 0);
  return buf.readUInt32LE(0) === 1000000000;
});

test('BE: 读取 3000000000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(3000000000, 0);
  return buf.readUInt32BE(0) === 3000000000;
});

test('LE: 读取 3000000000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(3000000000, 0);
  return buf.readUInt32LE(0) === 3000000000;
});

test('BE: 读取 4000000000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(4000000000, 0);
  return buf.readUInt32BE(0) === 4000000000;
});

test('LE: 读取 4000000000', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(4000000000, 0);
  return buf.readUInt32LE(0) === 4000000000;
});

// 十六进制值系列
test('BE: 读取 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x00000000;
});

test('LE: 读取 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0x00000000;
});

test('BE: 读取 0x10000000', () => {
  const buf = Buffer.from([0x10, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x10000000;
});

test('LE: 读取 0x10000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x10]);
  return buf.readUInt32LE(0) === 0x10000000;
});

test('BE: 读取 0x20000000', () => {
  const buf = Buffer.from([0x20, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x20000000;
});

test('LE: 读取 0x20000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x20]);
  return buf.readUInt32LE(0) === 0x20000000;
});

test('BE: 读取 0x40000000', () => {
  const buf = Buffer.from([0x40, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x40000000;
});

test('LE: 读取 0x40000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x40]);
  return buf.readUInt32LE(0) === 0x40000000;
});

test('BE: 读取 0x80000000', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x80000000;
});

test('LE: 读取 0x80000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readUInt32LE(0) === 0x80000000;
});

test('BE: 读取 0xC0000000', () => {
  const buf = Buffer.from([0xC0, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0xC0000000;
});

test('LE: 读取 0xC0000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xC0]);
  return buf.readUInt32LE(0) === 0xC0000000;
});

test('BE: 读取 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 0xFFFFFFFF;
});

test('LE: 读取 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

// 2的幂次测试
test('BE: 读取 2^0 = 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(1, 0);
  return buf.readUInt32BE(0) === 1;
});

test('LE: 读取 2^0 = 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(1, 0);
  return buf.readUInt32LE(0) === 1;
});

test('BE: 读取 2^8 = 256', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(256, 0);
  return buf.readUInt32BE(0) === 256;
});

test('LE: 读取 2^8 = 256', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(256, 0);
  return buf.readUInt32LE(0) === 256;
});

test('BE: 读取 2^16 = 65536', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(65536, 0);
  return buf.readUInt32BE(0) === 65536;
});

test('LE: 读取 2^16 = 65536', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(65536, 0);
  return buf.readUInt32LE(0) === 65536;
});

test('BE: 读取 2^24 = 16777216', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(16777216, 0);
  return buf.readUInt32BE(0) === 16777216;
});

test('LE: 读取 2^24 = 16777216', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(16777216, 0);
  return buf.readUInt32LE(0) === 16777216;
});

test('BE: 读取 2^31 = 2147483648', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(2147483648, 0);
  return buf.readUInt32BE(0) === 2147483648;
});

test('LE: 读取 2^31 = 2147483648', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(2147483648, 0);
  return buf.readUInt32LE(0) === 2147483648;
});

// 连续值读取
test('BE: 连续值 0-9', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32BE(i, i * 4);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32BE(i * 4) !== i) return false;
  }
  return true;
});

test('LE: 连续值 0-9', () => {
  const buf = Buffer.alloc(40);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt32LE(i, i * 4);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readUInt32LE(i * 4) !== i) return false;
  }
  return true;
});

test('BE: 连续大值', () => {
  const buf = Buffer.alloc(20);
  const values = [1000000000, 2000000000, 3000000000, 4000000000, 4294967295];
  for (let i = 0; i < values.length; i++) {
    buf.writeUInt32BE(values[i], i * 4);
  }
  for (let i = 0; i < values.length; i++) {
    if (buf.readUInt32BE(i * 4) !== values[i]) return false;
  }
  return true;
});

test('LE: 连续大值', () => {
  const buf = Buffer.alloc(20);
  const values = [1000000000, 2000000000, 3000000000, 4000000000, 4294967295];
  for (let i = 0; i < values.length; i++) {
    buf.writeUInt32LE(values[i], i * 4);
  }
  for (let i = 0; i < values.length; i++) {
    if (buf.readUInt32LE(i * 4) !== values[i]) return false;
  }
  return true;
});

// 特殊模式
test('BE: 全 0xFF 模式', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readUInt32BE(0) === 0xFFFFFFFF && buf.readUInt32BE(4) === 0xFFFFFFFF;
});

test('LE: 全 0xFF 模式', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readUInt32LE(0) === 0xFFFFFFFF && buf.readUInt32LE(4) === 0xFFFFFFFF;
});

test('BE: 全 0x00 模式', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x00);
  return buf.readUInt32BE(0) === 0x00000000 && buf.readUInt32BE(4) === 0x00000000;
});

test('LE: 全 0x00 模式', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0x00);
  return buf.readUInt32LE(0) === 0x00000000 && buf.readUInt32LE(4) === 0x00000000;
});

test('BE: 交替 0xAA 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xAA);
  return buf.readUInt32BE(0) === 0xAAAAAAAA;
});

test('LE: 交替 0xAA 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xAA);
  return buf.readUInt32LE(0) === 0xAAAAAAAA;
});

test('BE: 交替 0x55 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0x55);
  return buf.readUInt32BE(0) === 0x55555555;
});

test('LE: 交替 0x55 模式', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0x55);
  return buf.readUInt32LE(0) === 0x55555555;
});

// 字节位置重要性测试
test('BE: 只有最高字节非零', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0xFF000000;
});

test('LE: 只有最高字节非零', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readUInt32LE(0) === 0xFF000000;
});

test('BE: 只有第二字节非零', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x00FF0000;
});

test('LE: 只有第二字节非零', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0x00]);
  return buf.readUInt32LE(0) === 0x00FF0000;
});

test('BE: 只有第三字节非零', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0x00]);
  return buf.readUInt32BE(0) === 0x0000FF00;
});

test('LE: 只有第三字节非零', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0x0000FF00;
});

test('BE: 只有最低字节非零', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readUInt32BE(0) === 0x000000FF;
});

test('LE: 只有最低字节非零', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0x000000FF;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
