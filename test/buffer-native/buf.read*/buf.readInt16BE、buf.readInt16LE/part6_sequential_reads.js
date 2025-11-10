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
test('连续读取多个Int16BE值', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00, 0x03]);
  return buf.readInt16BE(0) === 1 &&
         buf.readInt16BE(2) === 2 &&
         buf.readInt16BE(4) === 3;
});

// 连续读取多个值 - LE
test('连续读取多个Int16LE值', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00, 0x03, 0x00]);
  return buf.readInt16LE(0) === 1 &&
         buf.readInt16LE(2) === 2 &&
         buf.readInt16LE(4) === 3;
});

// BE/LE同一buffer对比
test('同一buffer BE和LE读取不同', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const be = buf.readInt16BE(0);
  const le = buf.readInt16LE(0);
  return be === 0x1234 && le === 0x3412 && be !== le;
});

test('对称字节BE和LE结果相同', () => {
  const buf = Buffer.from([0x12, 0x12]);
  return buf.readInt16BE(0) === buf.readInt16LE(0);
});

test('全0字节BE和LE结果相同', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readInt16BE(0) === buf.readInt16LE(0) && buf.readInt16BE(0) === 0;
});

test('全FF字节BE和LE结果相同', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16BE(0) === buf.readInt16LE(0) && buf.readInt16BE(0) === -1;
});

// 重叠读取
test('重叠读取 - BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const v1 = buf.readInt16BE(0);
  const v2 = buf.readInt16BE(1);
  return v1 === 0x1234 && v2 === 0x3456;
});

test('重叠读取 - LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const v1 = buf.readInt16LE(0);
  const v2 = buf.readInt16LE(1);
  return v1 === 0x3412 && v2 === 0x5634;
});

// 循环读取
test('循环读取所有可能位置 - BE', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04]);
  let pass = true;
  for (let i = 0; i < buf.length - 1; i += 2) {
    const val = buf.readInt16BE(i);
    if (val !== (i / 2 + 1)) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('循环读取所有可能位置 - LE', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00, 0x03, 0x00, 0x04, 0x00]);
  let pass = true;
  for (let i = 0; i < buf.length - 1; i += 2) {
    const val = buf.readInt16LE(i);
    if (val !== (i / 2 + 1)) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 读取后buffer不变
test('读取不修改buffer - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const before = buf.toString('hex');
  buf.readInt16BE(0);
  const after = buf.toString('hex');
  return before === after;
});

test('读取不修改buffer - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const before = buf.toString('hex');
  buf.readInt16LE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 多次读取相同位置
test('多次读取相同位置结果一致 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const v1 = buf.readInt16BE(0);
  const v2 = buf.readInt16BE(0);
  const v3 = buf.readInt16BE(0);
  return v1 === v2 && v2 === v3 && v1 === 0x1234;
});

test('多次读取相同位置结果一致 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const v1 = buf.readInt16LE(0);
  const v2 = buf.readInt16LE(0);
  const v3 = buf.readInt16LE(0);
  return v1 === v2 && v2 === v3 && v1 === 0x1234;
});

// 写入后读取 - 完整往返测试
test('writeInt16BE -> readInt16BE 往返', () => {
  const buf = Buffer.alloc(2);
  const values = [-32768, -1, 0, 1, 32767];
  let pass = true;
  for (const val of values) {
    buf.writeInt16BE(val, 0);
    if (buf.readInt16BE(0) !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('writeInt16LE -> readInt16LE 往返', () => {
  const buf = Buffer.alloc(2);
  const values = [-32768, -1, 0, 1, 32767];
  let pass = true;
  for (const val of values) {
    buf.writeInt16LE(val, 0);
    if (buf.readInt16LE(0) !== val) {
      pass = false;
      break;
    }
  }
  return pass;
});

// 交叉写入读取
test('writeInt16BE -> readInt16LE 不一致', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(0x1234, 0);
  const le = buf.readInt16LE(0);
  return le === 0x3412;
});

test('writeInt16LE -> readInt16BE 不一致', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16LE(0x1234, 0);
  const be = buf.readInt16BE(0);
  return be === 0x3412;
});

// 大buffer中的多个读取
test('大buffer中多个位置读取 - BE', () => {
  const buf = Buffer.alloc(20);
  buf.writeInt16BE(100, 0);
  buf.writeInt16BE(200, 5);
  buf.writeInt16BE(300, 10);
  buf.writeInt16BE(400, 15);
  return buf.readInt16BE(0) === 100 &&
         buf.readInt16BE(5) === 200 &&
         buf.readInt16BE(10) === 300 &&
         buf.readInt16BE(15) === 400;
});

test('大buffer中多个位置读取 - LE', () => {
  const buf = Buffer.alloc(20);
  buf.writeInt16LE(100, 0);
  buf.writeInt16LE(200, 5);
  buf.writeInt16LE(300, 10);
  buf.writeInt16LE(400, 15);
  return buf.readInt16LE(0) === 100 &&
         buf.readInt16LE(5) === 200 &&
         buf.readInt16LE(10) === 300 &&
         buf.readInt16LE(15) === 400;
});

// 负数值的连续读取
test('连续读取负数 - BE', () => {
  const buf = Buffer.alloc(6);
  buf.writeInt16BE(-100, 0);
  buf.writeInt16BE(-200, 2);
  buf.writeInt16BE(-300, 4);
  return buf.readInt16BE(0) === -100 &&
         buf.readInt16BE(2) === -200 &&
         buf.readInt16BE(4) === -300;
});

test('连续读取负数 - LE', () => {
  const buf = Buffer.alloc(6);
  buf.writeInt16LE(-100, 0);
  buf.writeInt16LE(-200, 2);
  buf.writeInt16LE(-300, 4);
  return buf.readInt16LE(0) === -100 &&
         buf.readInt16LE(2) === -200 &&
         buf.readInt16LE(4) === -300;
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
