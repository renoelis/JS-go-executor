// buf.writeUIntBE/LE() - 复杂组合场景测试
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

// 交叉混合写入场景
test('混合 BE 和 LE 交替写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUIntBE(0x1234, 0, 2);
  buf.writeUIntLE(0x5678, 2, 2);
  buf.writeUIntBE(0x9abc, 4, 2);
  buf.writeUIntLE(0xdef0, 6, 2);
  return buf[0] === 0x12 && buf[2] === 0x78 && buf[4] === 0x9a && buf[6] === 0xf0;
});

// 所有 byteLength 在同一 buffer 上的写入
test('writeUIntBE 所有 byteLength 1-6 连续写入', () => {
  const buf = Buffer.allocUnsafe(21);
  let offset = 0;
  offset = buf.writeUIntBE(0x11, offset, 1);
  offset = buf.writeUIntBE(0x2233, offset, 2);
  offset = buf.writeUIntBE(0x445566, offset, 3);
  offset = buf.writeUIntBE(0x778899aa, offset, 4);
  offset = buf.writeUIntBE(0xbbccddeeff, offset, 5);
  offset = buf.writeUIntBE(0x112233445566, offset, 6);
  return offset === 21 && buf[0] === 0x11 && buf[1] === 0x22 && buf[3] === 0x44;
});

test('writeUIntLE 所有 byteLength 1-6 连续写入', () => {
  const buf = Buffer.allocUnsafe(21);
  let offset = 0;
  offset = buf.writeUIntLE(0x11, offset, 1);
  offset = buf.writeUIntLE(0x2233, offset, 2);
  offset = buf.writeUIntLE(0x445566, offset, 3);
  offset = buf.writeUIntLE(0x778899aa, offset, 4);
  offset = buf.writeUIntLE(0xbbccddeeff, offset, 5);
  offset = buf.writeUIntLE(0x112233445566, offset, 6);
  return offset === 21 && buf[0] === 0x11 && buf[1] === 0x33 && buf[3] === 0x66;
});

// 边界对齐写入
test('writeUIntBE 4字节对齐边界写入', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUIntBE(0x11223344, 0, 4);
  buf.writeUIntBE(0x55667788, 4, 4);
  buf.writeUIntBE(0x99aabbcc, 8, 4);
  buf.writeUIntBE(0xddeeff00, 12, 4);
  return buf[0] === 0x11 && buf[4] === 0x55 && buf[8] === 0x99 && buf[12] === 0xdd;
});

// 非对齐边界写入
test('writeUIntBE 跨越自然对齐边界写入', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0x12345678, 1, 4);
  return buf[1] === 0x12 && buf[2] === 0x34 && buf[3] === 0x56 && buf[4] === 0x78;
});

test('writeUIntLE 跨越自然对齐边界写入', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntLE(0x12345678, 1, 4);
  return buf[1] === 0x78 && buf[2] === 0x56 && buf[3] === 0x34 && buf[4] === 0x12;
});

// 重叠写入测试
test('writeUIntBE 部分重叠写入', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0x11223344, 0, 4);
  buf.writeUIntBE(0xaabbccdd, 2, 4);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0xaa && buf[3] === 0xbb && buf[4] === 0xcc && buf[5] === 0xdd;
});

test('writeUIntLE 部分重叠写入', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntLE(0x11223344, 0, 4);
  buf.writeUIntLE(0xaabbccdd, 2, 4);
  return buf[0] === 0x44 && buf[1] === 0x33 && buf[2] === 0xdd && buf[3] === 0xcc && buf[4] === 0xbb && buf[5] === 0xaa;
});

// 全覆盖重写测试
test('writeUIntBE 完全覆盖写入多次', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0xffffffff, 0, 4);
  buf.writeUIntBE(0x00000000, 0, 4);
  buf.writeUIntBE(0x12345678, 0, 4);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

// 高低字节互换场景
test('同一数据 BE 和 LE 写入不同位置对比', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUIntBE(0x12345678, 0, 4);
  buf.writeUIntLE(0x12345678, 4, 4);
  const beBuf = buf.slice(0, 4);
  const leBuf = buf.slice(4, 8);
  return beBuf[0] === 0x12 && beBuf[3] === 0x78 && leBuf[0] === 0x78 && leBuf[3] === 0x12;
});

// 读回验证
test('writeUIntBE 写入后用 readUIntBE 读回', () => {
  const buf = Buffer.allocUnsafe(10);
  const value = 0x123456;
  buf.writeUIntBE(value, 0, 3);
  const read = buf.readUIntBE(0, 3);
  return read === value;
});

test('writeUIntLE 写入后用 readUIntLE 读回', () => {
  const buf = Buffer.allocUnsafe(10);
  const value = 0x123456;
  buf.writeUIntLE(value, 0, 3);
  const read = buf.readUIntLE(0, 3);
  return read === value;
});

// 不同byteLength相同value
test('相同value不同byteLength写入对比', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  const buf3 = Buffer.allocUnsafe(4);
  buf1.writeUIntBE(0x1234, 0, 2);
  buf2.writeUIntBE(0x1234, 0, 3);
  buf3.writeUIntBE(0x1234, 0, 4);
  return buf1[0] === 0x12 && buf1[1] === 0x34 &&
         buf2[0] === 0x00 && buf2[1] === 0x12 && buf2[2] === 0x34 &&
         buf3[0] === 0x00 && buf3[1] === 0x00 && buf3[2] === 0x12 && buf3[3] === 0x34;
});

// 零填充buffer上的写入
test('在零填充buffer上writeUIntBE', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntBE(0x123456, 3, 3);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0x12 && buf[4] === 0x34 && buf[5] === 0x56;
});

test('在零填充buffer上writeUIntLE', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntLE(0x123456, 3, 3);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0x56 && buf[4] === 0x34 && buf[5] === 0x12;
});

// 循环递增写入模式
test('writeUIntBE 循环递增值写入', () => {
  const buf = Buffer.allocUnsafe(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUIntBE(i * 0x11, i, 1);
  }
  return buf[0] === 0x00 && buf[1] === 0x11 && buf[5] === 0x55 && buf[9] === 0x99;
});

// slice 后的 slice 多层嵌套写入
test('writeUIntBE 三层slice嵌套写入', () => {
  const original = Buffer.alloc(30);
  const slice1 = original.slice(5, 25);
  const slice2 = slice1.slice(3, 18);
  const slice3 = slice2.slice(2, 12);
  slice3.writeUIntBE(0x123456, 2, 3);
  return original[12] === 0x12 && original[13] === 0x34 && original[14] === 0x56;
});

// 边界值递减
test('writeUIntBE 从最大值递减写入', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0xff, 0, 1);
  buf.writeUIntBE(0xfe, 1, 1);
  buf.writeUIntBE(0xfd, 2, 1);
  return buf[0] === 0xff && buf[1] === 0xfe && buf[2] === 0xfd;
});

// 位模式测试
test('writeUIntBE 交替位模式连续写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUIntBE(0xaaaa, 0, 2);
  buf.writeUIntBE(0x5555, 2, 2);
  buf.writeUIntBE(0xaaaa, 4, 2);
  buf.writeUIntBE(0x5555, 6, 2);
  return buf[0] === 0xaa && buf[2] === 0x55 && buf[4] === 0xaa && buf[6] === 0x55;
});

// 镜像写入
test('BE和LE镜像写入验证字节序', () => {
  const value = 0x12345678;
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeUIntBE(value, 0, 4);
  bufLE.writeUIntLE(value, 0, 4);
  return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] && bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
});

// 稀疏写入（跳跃写入）
test('writeUIntBE 跳跃式稀疏写入', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.fill(0);
  buf.writeUIntBE(0x11, 0, 1);
  buf.writeUIntBE(0x22, 5, 1);
  buf.writeUIntBE(0x33, 10, 1);
  buf.writeUIntBE(0x44, 15, 1);
  return buf[0] === 0x11 && buf[5] === 0x22 && buf[10] === 0x33 && buf[15] === 0x44;
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
