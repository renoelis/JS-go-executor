// 深度边界测试 - 极端场景和安全性验证
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

// === ArrayBuffer 和 SharedArrayBuffer 测试 ===

test('从 ArrayBuffer 创建的 Buffer - BE', () => {
  const ab = new ArrayBuffer(4);
  const view = new DataView(ab);
  view.setUint8(0, 0x12);
  view.setUint8(1, 0x34);
  const buf = Buffer.from(ab);
  return buf.readInt16BE(0) === 0x1234;
});

test('从 ArrayBuffer 创建的 Buffer - LE', () => {
  const ab = new ArrayBuffer(4);
  const view = new DataView(ab);
  view.setUint8(0, 0x34);
  view.setUint8(1, 0x12);
  const buf = Buffer.from(ab);
  return buf.readInt16LE(0) === 0x1234;
});

// === 带有 byteOffset 的 ArrayBuffer ===

test('从 ArrayBuffer slice 创建 Buffer - BE', () => {
  const ab = new ArrayBuffer(6);
  const fullView = new Uint8Array(ab);
  fullView[2] = 0x12;
  fullView[3] = 0x34;
  const slicedAb = ab.slice(2, 4);
  const buf = Buffer.from(slicedAb);
  return buf.readInt16BE(0) === 0x1234;
});

test('从 ArrayBuffer slice 创建 Buffer - LE', () => {
  const ab = new ArrayBuffer(6);
  const fullView = new Uint8Array(ab);
  fullView[2] = 0x34;
  fullView[3] = 0x12;
  const slicedAb = ab.slice(2, 4);
  const buf = Buffer.from(slicedAb);
  return buf.readInt16LE(0) === 0x1234;
});

// === 跨Buffer读取一致性验证 ===

test('不同方式创建的相同内容Buffer结果一致 - BE', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.alloc(2);
  buf2[0] = 0x12;
  buf2[1] = 0x34;
  const buf3 = Buffer.from('1234', 'hex');
  
  return buf1.readInt16BE(0) === buf2.readInt16BE(0) &&
         buf2.readInt16BE(0) === buf3.readInt16BE(0) &&
         buf1.readInt16BE(0) === 0x1234;
});

test('不同方式创建的相同内容Buffer结果一致 - LE', () => {
  const buf1 = Buffer.from([0x34, 0x12]);
  const buf2 = Buffer.alloc(2);
  buf2[0] = 0x34;
  buf2[1] = 0x12;
  const buf3 = Buffer.from('3412', 'hex');
  
  return buf1.readInt16LE(0) === buf2.readInt16LE(0) &&
         buf2.readInt16LE(0) === buf3.readInt16LE(0) &&
         buf1.readInt16LE(0) === 0x1234;
});

// === 边界计算精确性 ===

test('buf.length - 2 是最后合法offset - BE', () => {
  const sizes = [2, 3, 4, 10, 100];
  let pass = true;
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    buf[size - 2] = 0x12;
    buf[size - 1] = 0x34;
    try {
      buf.readInt16BE(size - 2); // 应该成功
      buf.readInt16BE(size - 1); // 应该失败
      pass = false;
      break;
    } catch (e) {
      if (e.name !== 'RangeError') {
        pass = false;
        break;
      }
    }
  }
  return pass;
});

test('buf.length - 2 是最后合法offset - LE', () => {
  const sizes = [2, 3, 4, 10, 100];
  let pass = true;
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    buf[size - 2] = 0x34;
    buf[size - 1] = 0x12;
    try {
      buf.readInt16LE(size - 2); // 应该成功
      buf.readInt16LE(size - 1); // 应该失败
      pass = false;
      break;
    } catch (e) {
      if (e.name !== 'RangeError') {
        pass = false;
        break;
      }
    }
  }
  return pass;
});

// === 数值转换精确性 ===

test('负数两个补码转换精确性 - BE', () => {
  const testCases = [
    { bytes: [0x80, 0x00], value: -32768 },
    { bytes: [0x80, 0x01], value: -32767 },
    { bytes: [0xFF, 0xFF], value: -1 },
    { bytes: [0xFF, 0xFE], value: -2 },
    { bytes: [0xFF, 0x00], value: -256 },
    { bytes: [0xFE, 0xFF], value: -257 },
  ];
  
  let pass = true;
  for (const tc of testCases) {
    const buf = Buffer.from(tc.bytes);
    if (buf.readInt16BE(0) !== tc.value) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('负数两个补码转换精确性 - LE', () => {
  const testCases = [
    { bytes: [0x00, 0x80], value: -32768 },
    { bytes: [0x01, 0x80], value: -32767 },
    { bytes: [0xFF, 0xFF], value: -1 },
    { bytes: [0xFE, 0xFF], value: -2 },
    { bytes: [0x00, 0xFF], value: -256 },
    { bytes: [0xFF, 0xFE], value: -257 },
  ];
  
  let pass = true;
  for (const tc of testCases) {
    const buf = Buffer.from(tc.bytes);
    if (buf.readInt16LE(0) !== tc.value) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 填充Buffer测试 ===

test('fill填充的Buffer读取 - BE', () => {
  const buf = Buffer.alloc(4).fill(0x12);
  return buf.readInt16BE(0) === 0x1212;
});

test('fill填充的Buffer读取 - LE', () => {
  const buf = Buffer.alloc(4).fill(0x12);
  return buf.readInt16LE(0) === 0x1212;
});

test('fill指定范围填充 - BE', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0x12, 0, 2);
  buf.fill(0x34, 2, 4);
  return buf.readInt16BE(0) === 0x1212 && buf.readInt16BE(2) === 0x3434;
});

test('fill指定范围填充 - LE', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0x12, 0, 2);
  buf.fill(0x34, 2, 4);
  return buf.readInt16LE(0) === 0x1212 && buf.readInt16LE(2) === 0x3434;
});

// === 大Buffer性能和边界 ===

test('大Buffer末尾读取 - BE', () => {
  const size = 1024;
  const buf = Buffer.alloc(size);
  buf[size - 2] = 0x12;
  buf[size - 1] = 0x34;
  return buf.readInt16BE(size - 2) === 0x1234;
});

test('大Buffer末尾读取 - LE', () => {
  const size = 1024;
  const buf = Buffer.alloc(size);
  buf[size - 2] = 0x34;
  buf[size - 1] = 0x12;
  return buf.readInt16LE(size - 2) === 0x1234;
});

test('大Buffer中间读取 - BE', () => {
  const size = 1024;
  const buf = Buffer.alloc(size);
  buf[500] = 0x12;
  buf[501] = 0x34;
  return buf.readInt16BE(500) === 0x1234;
});

test('大Buffer中间读取 - LE', () => {
  const size = 1024;
  const buf = Buffer.alloc(size);
  buf[500] = 0x34;
  buf[501] = 0x12;
  return buf.readInt16LE(500) === 0x1234;
});

// === 字节序交叉验证 ===

test('BE和LE互为字节反转 - 0x1234', () => {
  const bufBE = Buffer.from([0x12, 0x34]);
  const bufLE = Buffer.from([0x34, 0x12]);
  return bufBE.readInt16BE(0) === bufLE.readInt16LE(0) &&
         bufBE.readInt16BE(0) === 0x1234;
});

test('BE和LE互为字节反转 - 0x8000', () => {
  const bufBE = Buffer.from([0x80, 0x00]);
  const bufLE = Buffer.from([0x00, 0x80]);
  return bufBE.readInt16BE(0) === bufLE.readInt16LE(0) &&
         bufBE.readInt16BE(0) === -32768;
});

test('BE和LE互为字节反转 - 0x7FFF', () => {
  const bufBE = Buffer.from([0x7F, 0xFF]);
  const bufLE = Buffer.from([0xFF, 0x7F]);
  return bufBE.readInt16BE(0) === bufLE.readInt16LE(0) &&
         bufBE.readInt16BE(0) === 32767;
});

// === 零字节测试 ===

test('全零Buffer - BE', () => {
  const buf = Buffer.alloc(10);
  return buf.readInt16BE(0) === 0 &&
         buf.readInt16BE(4) === 0 &&
         buf.readInt16BE(8) === 0;
});

test('全零Buffer - LE', () => {
  const buf = Buffer.alloc(10);
  return buf.readInt16LE(0) === 0 &&
         buf.readInt16LE(4) === 0 &&
         buf.readInt16LE(8) === 0;
});

// === 部分零字节 ===

test('高字节为零 - BE', () => {
  const values = [0x00FF, 0x007F, 0x0001, 0x00AA];
  let pass = true;
  for (const val of values) {
    const buf = Buffer.alloc(2);
    buf[0] = (val >> 8) & 0xFF;
    buf[1] = val & 0xFF;
    if (buf.readInt16BE(0) !== (val > 0x7FFF ? val - 0x10000 : val)) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('低字节为零 - LE', () => {
  const values = [0xFF00, 0x7F00, 0x0100, 0xAA00];
  let pass = true;
  for (const val of values) {
    const buf = Buffer.alloc(2);
    buf[0] = val & 0xFF;
    buf[1] = (val >> 8) & 0xFF;
    if (buf.readInt16LE(0) !== (val > 0x7FFF ? val - 0x10000 : val)) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === this绑定测试 ===

test('使用箭头函数调用（this不改变） - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const read = () => buf.readInt16BE(0);
  return read() === 0x1234;
});

test('使用箭头函数调用（this不改变） - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const read = () => buf.readInt16LE(0);
  return read() === 0x1234;
});

// === 原型链测试 ===

test('通过 Buffer.prototype 调用 - BE', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return Buffer.prototype.readInt16BE.call(buf, 0) === 32767;
});

test('通过 Buffer.prototype 调用 - LE', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return Buffer.prototype.readInt16LE.call(buf, 0) === 32767;
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
