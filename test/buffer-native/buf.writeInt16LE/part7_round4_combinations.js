// buf.writeInt16LE() - 第4轮补充：组合场景和交叉测试
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

// 与 readInt16LE 的往返测试
test('write 后 read 往返测试 - 正数', () => {
  const buf = Buffer.alloc(4);
  const values = [1, 100, 1000, 10000, 32767];
  for (let val of values) {
    buf.writeInt16LE(val, 0);
    if (buf.readInt16LE(0) !== val) return false;
  }
  return true;
});

test('write 后 read 往返测试 - 负数', () => {
  const buf = Buffer.alloc(4);
  const values = [-1, -100, -1000, -10000, -32768];
  for (let val of values) {
    buf.writeInt16LE(val, 0);
    if (buf.readInt16LE(0) !== val) return false;
  }
  return true;
});

test('write 后 read 往返测试 - 不同offset', () => {
  const buf = Buffer.alloc(20);
  const testData = [
    { val: 1234, offset: 0 },
    { val: -5678, offset: 2 },
    { val: 9012, offset: 10 },
    { val: -3456, offset: 18 }
  ];
  for (let {val, offset} of testData) {
    buf.writeInt16LE(val, offset);
    if (buf.readInt16LE(offset) !== val) return false;
  }
  return true;
});

// 与 writeInt16BE 对比
test('同一值 BE 和 LE 字节序相反', () => {
  const bufBE = Buffer.alloc(2);
  const bufLE = Buffer.alloc(2);
  const testValues = [258, 1234, -1000, 32767, -32768];
  for (let val of testValues) {
    bufBE.writeInt16BE(val, 0);
    bufLE.writeInt16LE(val, 0);
    if (bufBE[0] !== bufLE[1] || bufBE[1] !== bufLE[0]) return false;
  }
  return true;
});

// 连续紧密写入
test('连续写入填满整个 buffer', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16LE(0x0102, 0);
  buf.writeInt16LE(0x0304, 2);
  buf.writeInt16LE(0x0506, 4);
  buf.writeInt16LE(0x0708, 6);
  buf.writeInt16LE(0x090A, 8);
  return buf[0] === 0x02 && buf[1] === 0x01 &&
         buf[2] === 0x04 && buf[3] === 0x03 &&
         buf[4] === 0x06 && buf[5] === 0x05 &&
         buf[6] === 0x08 && buf[7] === 0x07 &&
         buf[8] === 0x0A && buf[9] === 0x09;
});

// 零值和非零值交替
test('零值和非零值交替写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16LE(1000, 0);
  buf.writeInt16LE(0, 2);
  buf.writeInt16LE(2000, 4);
  buf.writeInt16LE(0, 6);
  buf.writeInt16LE(3000, 8);
  return buf.readInt16LE(0) === 1000 &&
         buf.readInt16LE(2) === 0 &&
         buf.readInt16LE(4) === 2000 &&
         buf.readInt16LE(6) === 0 &&
         buf.readInt16LE(8) === 3000;
});

// 正负值交替
test('正负值交替写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16LE(100, 0);
  buf.writeInt16LE(-100, 2);
  buf.writeInt16LE(200, 4);
  buf.writeInt16LE(-200, 6);
  buf.writeInt16LE(300, 8);
  return buf.readInt16LE(0) === 100 &&
         buf.readInt16LE(2) === -100 &&
         buf.readInt16LE(4) === 200 &&
         buf.readInt16LE(6) === -200 &&
         buf.readInt16LE(8) === 300;
});

// 递增序列
test('写入递增序列', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeInt16LE(i * 100, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readInt16LE(i * 2) !== i * 100) return false;
  }
  return true;
});

// 递减序列
test('写入递减序列', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 10; i++) {
    buf.writeInt16LE(1000 - i * 100, i * 2);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readInt16LE(i * 2) !== 1000 - i * 100) return false;
  }
  return true;
});

// 与其他位宽的 write 方法配合
test('writeInt16LE 和 writeInt8 交织', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt8(0x11, 0);
  buf.writeInt16LE(0x2233, 1);
  buf.writeInt8(0x44, 3);
  buf.writeInt16LE(0x5566, 4);
  return buf[0] === 0x11 &&
         buf[1] === 0x33 && buf[2] === 0x22 &&
         buf[3] === 0x44 &&
         buf[4] === 0x66 && buf[5] === 0x55;
});

test('writeInt16LE 和 writeInt32LE 交织', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16LE(0x1122, 0);
  buf.writeInt32LE(0x33445566, 2);
  buf.writeInt16LE(0x7788, 6);
  return buf[0] === 0x22 && buf[1] === 0x11 &&
         buf[2] === 0x66 && buf[3] === 0x55 &&
         buf[4] === 0x44 && buf[5] === 0x33 &&
         buf[6] === 0x88 && buf[7] === 0x77;
});

// 在已有数据的 buffer 上部分更新
test('在已有数据上部分更新', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]);
  buf.writeInt16LE(-21846, 2); // 0xAAAA 作为有符号数
  return buf[0] === 0x11 && buf[1] === 0x22 &&
         buf[2] === 0xAA && buf[3] === 0xAA &&
         buf[4] === 0x55 && buf[5] === 0x66;
});

// 同一位置多次写入覆盖
test('同一位置多次写入最后一次生效', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(100, 0);
  buf.writeInt16LE(200, 0);
  buf.writeInt16LE(300, 0);
  buf.writeInt16LE(400, 0);
  return buf.readInt16LE(0) === 400;
});

// 大量连续写入
test('循环写入100次', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 100; i++) {
    buf.writeInt16LE(i, 0);
  }
  return buf.readInt16LE(0) === 99;
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
