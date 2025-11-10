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

// === ArrayBuffer 测试 ===

test('从 ArrayBuffer 创建的 Buffer - BE', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setUint8(0, 0x12);
  view.setUint8(1, 0x34);
  view.setUint8(2, 0x56);
  view.setUint8(3, 0x78);
  const buf = Buffer.from(ab);
  return buf.readInt32BE(0) === 0x12345678;
});

test('从 ArrayBuffer 创建的 Buffer - LE', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setUint8(0, 0x78);
  view.setUint8(1, 0x56);
  view.setUint8(2, 0x34);
  view.setUint8(3, 0x12);
  const buf = Buffer.from(ab);
  return buf.readInt32LE(0) === 0x12345678;
});

// === 带有 byteOffset 的 ArrayBuffer ===

test('从 ArrayBuffer slice 创建 Buffer - BE', () => {
  const ab = new ArrayBuffer(8);
  const fullView = new Uint8Array(ab);
  fullView[2] = 0x12;
  fullView[3] = 0x34;
  fullView[4] = 0x56;
  fullView[5] = 0x78;
  const slicedAb = ab.slice(2, 6);
  const buf = Buffer.from(slicedAb);
  return buf.readInt32BE(0) === 0x12345678;
});

test('从 ArrayBuffer slice 创建 Buffer - LE', () => {
  const ab = new ArrayBuffer(8);
  const fullView = new Uint8Array(ab);
  fullView[2] = 0x78;
  fullView[3] = 0x56;
  fullView[4] = 0x34;
  fullView[5] = 0x12;
  const slicedAb = ab.slice(2, 6);
  const buf = Buffer.from(slicedAb);
  return buf.readInt32LE(0) === 0x12345678;
});

// === 跨Buffer读取一致性验证 ===

test('不同方式创建的相同内容Buffer结果一致 - BE', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.alloc(4);
  buf2[0] = 0x12;
  buf2[1] = 0x34;
  buf2[2] = 0x56;
  buf2[3] = 0x78;
  const buf3 = Buffer.from('12345678', 'hex');
  
  return buf1.readInt32BE(0) === buf2.readInt32BE(0) &&
         buf2.readInt32BE(0) === buf3.readInt32BE(0) &&
         buf1.readInt32BE(0) === 0x12345678;
});

test('不同方式创建的相同内容Buffer结果一致 - LE', () => {
  const buf1 = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const buf2 = Buffer.alloc(4);
  buf2[0] = 0x78;
  buf2[1] = 0x56;
  buf2[2] = 0x34;
  buf2[3] = 0x12;
  const buf3 = Buffer.from('78563412', 'hex');
  
  return buf1.readInt32LE(0) === buf2.readInt32LE(0) &&
         buf2.readInt32LE(0) === buf3.readInt32LE(0) &&
         buf1.readInt32LE(0) === 0x12345678;
});

// === 边界计算精确性 ===

test('buf.length - 4 是最后合法offset - BE', () => {
  const sizes = [4, 5, 6, 10, 100];
  let pass = true;
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    buf[size - 4] = 0x12;
    buf[size - 3] = 0x34;
    buf[size - 2] = 0x56;
    buf[size - 1] = 0x78;
    try {
      buf.readInt32BE(size - 4); // 应该成功
      buf.readInt32BE(size - 3); // 应该失败
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

test('buf.length - 4 是最后合法offset - LE', () => {
  const sizes = [4, 5, 6, 10, 100];
  let pass = true;
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    buf[size - 4] = 0x78;
    buf[size - 3] = 0x56;
    buf[size - 2] = 0x34;
    buf[size - 1] = 0x12;
    try {
      buf.readInt32LE(size - 4); // 应该成功
      buf.readInt32LE(size - 3); // 应该失败
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

// === fill 填充后读取 ===

test('fill(0xFF) 后读取 - BE', () => {
  const buf = Buffer.alloc(4).fill(0xFF);
  return buf.readInt32BE(0) === -1;
});

test('fill(0xFF) 后读取 - LE', () => {
  const buf = Buffer.alloc(4).fill(0xFF);
  return buf.readInt32LE(0) === -1;
});

test('fill(0x00) 后读取 - BE', () => {
  const buf = Buffer.alloc(4).fill(0x00);
  return buf.readInt32BE(0) === 0;
});

test('fill(0x00) 后读取 - LE', () => {
  const buf = Buffer.alloc(4).fill(0x00);
  return buf.readInt32LE(0) === 0;
});

// === 大Buffer测试 ===

test('1024字节Buffer末尾读取 - BE', () => {
  const buf = Buffer.alloc(1024);
  buf[1020] = 0x12;
  buf[1021] = 0x34;
  buf[1022] = 0x56;
  buf[1023] = 0x78;
  return buf.readInt32BE(1020) === 0x12345678;
});

test('1024字节Buffer末尾读取 - LE', () => {
  const buf = Buffer.alloc(1024);
  buf[1020] = 0x78;
  buf[1021] = 0x56;
  buf[1022] = 0x34;
  buf[1023] = 0x12;
  return buf.readInt32LE(1020) === 0x12345678;
});

// === 字节序交叉验证 ===

test('BE写入数据，LE读取应该是字节反转 - 验证1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(0x12345678, 0);
  return buf.readInt32LE(0) === 0x78563412;
});

test('LE写入数据，BE读取应该是字节反转 - 验证1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(0x12345678, 0);
  return buf.readInt32BE(0) === 0x78563412;
});

// === 全零Buffer测试 ===

test('全零Buffer读取应该返回0 - BE', () => {
  const buf = Buffer.alloc(100);
  let pass = true;
  for (let i = 0; i <= 96; i++) {
    if (buf.readInt32BE(i) !== 0) {
      pass = false;
      break;
    }
  }
  return pass;
});

test('全零Buffer读取应该返回0 - LE', () => {
  const buf = Buffer.alloc(100);
  let pass = true;
  for (let i = 0; i <= 96; i++) {
    if (buf.readInt32LE(i) !== 0) {
      pass = false;
      break;
    }
  }
  return pass;
});

// === 部分零字节测试 ===

test('高3字节为0，低1字节非0 - BE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readInt32BE(0) === 0xFF;
});

test('低3字节为0，高1字节非0 - LE', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readInt32LE(0) === -16777216;
});

// === 原型链调用 ===

test('通过原型链调用 - BE', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  const readFunc = buf.readInt32BE;
  const bound = readFunc.bind(buf);
  return bound(0) === 2147483647;
});

test('通过原型链调用 - LE', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  const readFunc = buf.readInt32LE;
  const bound = readFunc.bind(buf);
  return bound(0) === 2147483647;
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
