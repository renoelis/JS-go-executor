// buf.writeUInt8() - 参数组合和交叉场景测试
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

// value 和 offset 边界组合
test('最小 value (0) + 最小 offset (0)', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(0, 0);
  return buf[0] === 0 && ret === 1;
});

test('最大 value (255) + 最大 offset', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(255, 3);
  return buf[3] === 255 && ret === 4;
});

test('最大 value (255) + 最小 offset (0)', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(255, 0);
  return buf[0] === 255 && ret === 1;
});

test('最小 value (0) + 最大 offset', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(0, 3);
  return buf[3] === 0 && ret === 4;
});

test('中间 value (128) + 中间 offset', () => {
  const buf = Buffer.alloc(10);
  const ret = buf.writeUInt8(128, 5);
  return buf[5] === 128 && ret === 6;
});

// 浮点数 + 各种 offset
test('浮点数 value + offset 0', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(123.7, 0);
  return buf[0] === 123 && ret === 1;
});

test('浮点数 value + 最大 offset', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8(200.5, 3);
  return buf[3] === 200 && ret === 4;
});

// 类型转换 + 各种 offset
test('字符串 value + offset 0', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8("100", 0);
  return buf[0] === 100 && ret === 1;
});

test('字符串 value + 最大 offset', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeUInt8("200", 3);
  return buf[3] === 200 && ret === 4;
});

test('null value + 各种 offset', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(null, 0);
  buf.writeUInt8(null, 1);
  buf.writeUInt8(null, 2);
  buf.writeUInt8(null, 3);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

// Buffer 不同长度的极限 offset
test('长度 1 Buffer offset 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(100, 0);
  return buf[0] === 100;
});

test('长度 1 Buffer offset 1 越界', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(100, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('长度 2 Buffer 两个位置都写入', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt8(100, 0);
  buf.writeUInt8(200, 1);
  return buf[0] === 100 && buf[1] === 200;
});

// 多次调用返回值链式组合
test('3 次链式调用覆盖 3 字节', () => {
  const buf = Buffer.alloc(3);
  let pos = 0;
  pos = buf.writeUInt8(11, pos);
  pos = buf.writeUInt8(22, pos);
  pos = buf.writeUInt8(33, pos);
  return buf[0] === 11 && buf[1] === 22 && buf[2] === 33 && pos === 3;
});

test('链式调用检查每次返回值', () => {
  const buf = Buffer.alloc(5);
  const ret1 = buf.writeUInt8(1, 0);
  const ret2 = buf.writeUInt8(2, ret1);
  const ret3 = buf.writeUInt8(3, ret2);
  return ret1 === 1 && ret2 === 2 && ret3 === 3;
});

// 内存视图场景
test('两个 Buffer 共享同一 ArrayBuffer 不同 offset', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab, 0, 4);
  const buf2 = Buffer.from(ab, 4, 4);

  buf1.writeUInt8(111, 0);
  buf2.writeUInt8(222, 0);

  const fullView = new Uint8Array(ab);
  return fullView[0] === 111 && fullView[4] === 222;
});

test('修改 Buffer 影响 Uint8Array 视图', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const u8 = new Uint8Array(ab);

  buf.writeUInt8(123, 0);
  buf.writeUInt8(234, 1);

  return u8[0] === 123 && u8[1] === 234;
});

// 先写入后切片
test('写入后 slice 仍保留数据', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(111, 5);
  const sliced = buf.slice(5, 6);
  return sliced[0] === 111;
});

test('写入后 subarray 仍保留数据', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(222, 7);
  const sub = buf.subarray(7, 8);
  return sub[0] === 222;
});

// 切片后写入影响原 Buffer
test('slice 创建视图写入影响原 Buffer', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(3, 7);
  sliced.writeUInt8(99, 0);
  return buf[3] === 99;
});

test('subarray 创建视图写入影响原 Buffer', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 5);
  sub.writeUInt8(88, 1);
  return buf[3] === 88;
});

// 组合场景：fill 后 write
test('fill 后部分 write 覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xFF);
  buf.writeUInt8(0x00, 1);
  buf.writeUInt8(0x00, 2);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
});

// Buffer.concat 后 write
test('concat 后的 Buffer 写入', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concatenated = Buffer.concat([buf1, buf2]);
  concatenated.writeUInt8(99, 2);
  return concatenated[2] === 99 && concatenated[3] === 4;
});

// 极端长度
test('长度 1000 Buffer 随机位置写入', () => {
  const buf = Buffer.alloc(1000);
  buf.writeUInt8(77, 500);
  buf.writeUInt8(88, 0);
  buf.writeUInt8(99, 999);
  return buf[0] === 88 && buf[500] === 77 && buf[999] === 99;
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
