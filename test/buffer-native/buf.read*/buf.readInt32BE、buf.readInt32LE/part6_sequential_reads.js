// 连续读取和BE/LE对比测试
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

// 连续读取多个值 - BE
test('连续读取多个Int32BE值', () => {
  const buf = Buffer.from([
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x02,
    0x00, 0x00, 0x00, 0x03
  ]);
  return buf.readInt32BE(0) === 1 &&
         buf.readInt32BE(4) === 2 &&
         buf.readInt32BE(8) === 3;
});

// 连续读取多个值 - LE
test('连续读取多个Int32LE值', () => {
  const buf = Buffer.from([
    0x01, 0x00, 0x00, 0x00,
    0x02, 0x00, 0x00, 0x00,
    0x03, 0x00, 0x00, 0x00
  ]);
  return buf.readInt32LE(0) === 1 &&
         buf.readInt32LE(4) === 2 &&
         buf.readInt32LE(8) === 3;
});

// BE/LE同一buffer对比
test('同一buffer BE和LE读取不同', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readInt32BE(0);
  const le = buf.readInt32LE(0);
  return be === 0x12345678 && le === 0x78563412 && be !== le;
});

test('对称字节BE和LE结果相同', () => {
  const buf = Buffer.from([0x12, 0x34, 0x34, 0x12]);
  return buf.readInt32BE(0) === buf.readInt32LE(0);
});

test('全0字节BE和LE结果相同', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readInt32BE(0) === buf.readInt32LE(0) && buf.readInt32BE(0) === 0;
});

test('全FF字节BE和LE结果相同', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readInt32BE(0) === buf.readInt32LE(0) && buf.readInt32BE(0) === -1;
});

// 重叠读取
test('重叠读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const v1 = buf.readInt32BE(0);
  const v2 = buf.readInt32BE(1);
  return v1 === 0x12345678 && v2 === 0x3456789A;
});

test('重叠读取 - LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const v1 = buf.readInt32LE(0);
  const v2 = buf.readInt32LE(1);
  return v1 === 0x78563412 && v2 === -1703389644;
});

// 循环读取
test('循环读取所有可能位置 - BE', () => {
  const buf = Buffer.from([
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x02,
    0x00, 0x00, 0x00, 0x03,
    0x00, 0x00, 0x00, 0x04
  ]);
  let pass = true;
  for (let i = 0; i < buf.length - 3; i += 4) {
    const val = buf.readInt32BE(i);
    if (val !== (i / 4 + 1)) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('循环读取所有可能位置 - LE', () => {
  const buf = Buffer.from([
    0x01, 0x00, 0x00, 0x00,
    0x02, 0x00, 0x00, 0x00,
    0x03, 0x00, 0x00, 0x00,
    0x04, 0x00, 0x00, 0x00
  ]);
  let pass = true;
  for (let i = 0; i < buf.length - 3; i += 4) {
    const val = buf.readInt32LE(i);
    if (val !== (i / 4 + 1)) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 读取后buffer不变
test('读取不修改buffer - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const before = buf.toString('hex');
  buf.readInt32BE(0);
  const after = buf.toString('hex');
  return before === after;
});

test('读取不修改buffer - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const before = buf.toString('hex');
  buf.readInt32LE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 多次读取相同位置
test('多次读取相同位置结果一致 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const v1 = buf.readInt32BE(0);
  const v2 = buf.readInt32BE(0);
  const v3 = buf.readInt32BE(0);
  return v1 === v2 && v2 === v3 && v1 === 0x12345678;
});

test('多次读取相同位置结果一致 - LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const v1 = buf.readInt32LE(0);
  const v2 = buf.readInt32LE(0);
  const v3 = buf.readInt32LE(0);
  return v1 === v2 && v2 === v3 && v1 === 0x12345678;
});

// 写入后读取 - 完整往返测试
test('writeInt32BE -> readInt32BE 往返', () => {
  const buf = Buffer.alloc(4);
  const values = [-2147483648, -1, 0, 1, 2147483647];
  let pass = true;
  for (const val of values) {
    buf.writeInt32BE(val, 0);
    if (buf.readInt32BE(0) !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('writeInt32LE -> readInt32LE 往返', () => {
  const buf = Buffer.alloc(4);
  const values = [-2147483648, -1, 0, 1, 2147483647];
  let pass = true;
  for (const val of values) {
    buf.writeInt32LE(val, 0);
    if (buf.readInt32LE(0) !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 交叉写入读取
test('writeInt32BE -> readInt32LE 不一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(0x12345678, 0);
  const le = buf.readInt32LE(0);
  return le === 0x78563412;
});

test('writeInt32LE -> readInt32BE 不一致', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(0x12345678, 0);
  const be = buf.readInt32BE(0);
  return be === 0x78563412;
});

// 大buffer中的多个读取
test('大buffer中多个位置读取 - BE', () => {
  const buf = Buffer.alloc(24);
  buf.writeInt32BE(100, 0);
  buf.writeInt32BE(200, 6);
  buf.writeInt32BE(300, 12);
  buf.writeInt32BE(400, 18);
  return buf.readInt32BE(0) === 100 &&
         buf.readInt32BE(6) === 200 &&
         buf.readInt32BE(12) === 300 &&
         buf.readInt32BE(18) === 400;
});

test('大buffer中多个位置读取 - LE', () => {
  const buf = Buffer.alloc(24);
  buf.writeInt32LE(100, 0);
  buf.writeInt32LE(200, 6);
  buf.writeInt32LE(300, 12);
  buf.writeInt32LE(400, 18);
  return buf.readInt32LE(0) === 100 &&
         buf.readInt32LE(6) === 200 &&
         buf.readInt32LE(12) === 300 &&
         buf.readInt32LE(18) === 400;
});

// 负数值的连续读取
test('连续读取负数 - BE', () => {
  const buf = Buffer.alloc(12);
  buf.writeInt32BE(-100, 0);
  buf.writeInt32BE(-200, 4);
  buf.writeInt32BE(-300, 8);
  return buf.readInt32BE(0) === -100 &&
         buf.readInt32BE(4) === -200 &&
         buf.readInt32BE(8) === -300;
});

test('连续读取负数 - LE', () => {
  const buf = Buffer.alloc(12);
  buf.writeInt32LE(-100, 0);
  buf.writeInt32LE(-200, 4);
  buf.writeInt32LE(-300, 8);
  return buf.readInt32LE(0) === -100 &&
         buf.readInt32LE(4) === -200 &&
         buf.readInt32LE(8) === -300;
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
