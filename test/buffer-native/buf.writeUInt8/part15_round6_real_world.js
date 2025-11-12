// buf.writeUInt8() - 第6轮补漏：并发、内存和实际使用场景
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

// 同一 Buffer 多方法混合使用
test('writeUInt8 后 readUInt8 验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, 0);
  buf.writeUInt8(234, 1);
  return buf.readUInt8(0) === 123 && buf.readUInt8(1) === 234;
});

test('writeUInt8 和 writeInt8 混合后读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(200, 0);
  buf.writeInt8(-50, 1);
  return buf.readUInt8(0) === 200 && buf.readInt8(1) === -50;
});

test('writeUInt8 后 readUInt16LE 跨字节读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x34, 0);
  buf.writeUInt8(0x12, 1);
  return buf.readUInt16LE(0) === 0x1234;
});

test('writeUInt8 后 readUInt16BE 跨字节读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x12, 0);
  buf.writeUInt8(0x34, 1);
  return buf.readUInt16BE(0) === 0x1234;
});

test('writeUInt8 构造完整 32 位数', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x12, 0);
  buf.writeUInt8(0x34, 1);
  buf.writeUInt8(0x56, 2);
  buf.writeUInt8(0x78, 3);
  return buf.readUInt32BE(0) === 0x12345678;
});

// Buffer pool 相关
test('小 Buffer 独立性验证', () => {
  const buf1 = Buffer.allocUnsafe(1);
  const buf2 = Buffer.allocUnsafe(1);
  buf1.writeUInt8(100, 0);
  buf2.writeUInt8(200, 0);
  return buf1[0] === 100 && buf2[0] === 200;
});

test('连续分配小 Buffer 写入独立', () => {
  const bufs = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(i * 10, 0);
    bufs.push(buf);
  }
  return bufs[0][0] === 0 && bufs[5][0] === 50 && bufs[9][0] === 90;
});

// 真实使用场景
test('构造协议头字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x01, 0); // 版本号
  buf.writeUInt8(0x02, 1); // 消息类型
  buf.writeUInt8(0x00, 2); // 保留字段
  buf.writeUInt8(0xFF, 3); // 标志位
  return buf.toString('hex') === '010200ff';
});

test('构造 RGB 颜色值', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(255, 0); // R
  buf.writeUInt8(128, 1); // G
  buf.writeUInt8(64, 2);  // B
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 64;
});

test('构造状态码', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(200, 0); // HTTP 200
  return buf.readUInt8(0) === 200;
});

test('写入多个标志位', () => {
  const buf = Buffer.alloc(8);
  const flags = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
  flags.forEach((flag, i) => {
    buf.writeUInt8(flag, i);
  });
  let pass = true;
  flags.forEach((flag, i) => {
    if (buf[i] !== flag) pass = false;
  });
  return pass;
});

// 边界覆盖写入
test('先写入后部分覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0xFF, 0);
  buf.writeUInt8(0xFF, 1);
  buf.writeUInt8(0xFF, 2);
  buf.writeUInt8(0xFF, 3);
  buf.writeUInt8(0x00, 1);
  buf.writeUInt8(0x00, 2);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
});

test('循环覆盖写入', () => {
  const buf = Buffer.alloc(4);
  for (let round = 0; round < 10; round++) {
    for (let i = 0; i < 4; i++) {
      buf.writeUInt8((round * 10 + i) % 256, i);
    }
  }
  return buf[0] === 90 && buf[1] === 91 && buf[2] === 92 && buf[3] === 93;
});

// 与其他 Buffer 操作组合
test('copy 前后写入', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt8(10, 0);
  buf1.writeUInt8(20, 1);
  buf1.copy(buf2, 0, 0, 2);
  buf2.writeUInt8(30, 2);
  buf2.writeUInt8(40, 3);
  return buf2[0] === 10 && buf2[1] === 20 && buf2[2] === 30 && buf2[3] === 40;
});

test('writeUInt8 后 indexOf', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(100, 5);
  return buf.indexOf(100) === 5;
});

test('writeUInt8 后 includes', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(123, 3);
  return buf.includes(123);
});

test('writeUInt8 后 lastIndexOf', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(50, 2);
  buf.writeUInt8(50, 7);
  return buf.lastIndexOf(50) === 7;
});

// 多次分配和释放模拟
test('模拟多次分配写入场景', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(i % 256, 0);
    buffers.push(buf);
  }
  return buffers[0][0] === 0 && buffers[50][0] === 50 && buffers[99][0] === 99;
});

// 与 TypedArray 方法配合
test('writeUInt8 后使用 TypedArray.set', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt8(100, 0);
  buf.writeUInt8(200, 1);
  const arr = new Uint8Array([10, 20, 30]);
  buf.set(arr, 2);
  return buf[0] === 100 && buf[1] === 200 && buf[2] === 10 && buf[3] === 20 && buf[4] === 30;
});

test('writeUInt8 后使用 TypedArray.subarray', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(111, 5);
  const sub = buf.subarray(5, 6);
  return sub[0] === 111 && sub.length === 1;
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
