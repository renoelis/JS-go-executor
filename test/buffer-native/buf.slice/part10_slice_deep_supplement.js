const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ 深度查缺补漏：Buffer.prototype.slice vs Uint8Array.prototype.slice ============

test('行为差异：Buffer.slice 返回视图，Uint8Array.slice 返回拷贝', () => {
  const buf = Buffer.from('hello');
  const bufSliced = buf.slice(0, 3);

  // Uint8Array.slice 会返回拷贝
  const uint8 = new Uint8Array(buf);
  const uint8Sliced = uint8.slice(0, 3);

  // 修改原数据
  buf[0] = 0x48; // 'H'

  // bufSliced 应该受影响，uint8Sliced 不应该
  return bufSliced[0] === 0x48 && uint8Sliced[0] === 0x68;
});

test('行为差异：Buffer.slice 与 Buffer.subarray 行为一致', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  const subarrayed = buf.subarray(0, 5);

  // 修改 sliced
  sliced[0] = 0x48; // 'H'

  // subarray 应该同样受影响
  return subarrayed[0] === 0x48;
});

// ============ slice 后的 Buffer 方法交互 ============

test('方法交互：slice 后调用 copy', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5); // 'hello'
  const target = Buffer.alloc(5);

  sliced.copy(target);
  return target.toString() === 'hello';
});

test('方法交互：slice 后调用 fill', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);

  sliced.fill(0x41); // 'A'

  // 原 buffer 前 5 个字节应该也被填充
  return buf.slice(0, 5).toString() === 'AAAAA';
});

test('方法交互：slice 后调用 write', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);

  const written = sliced.write('hello');

  return written === 5 && buf.slice(0, 5).toString() === 'hello';
});

test('方法交互：slice 后调用 writeInt16LE', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 4);

  sliced.writeInt16LE(0x1234, 0);

  // 原 buffer 应该也被修改
  return buf.readInt16LE(0) === 0x1234;
});

test('方法交互：slice 后调用 writeUInt32BE', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 4);

  sliced.writeUInt32BE(0x12345678, 0);

  return buf.readUInt32BE(0) === 0x12345678;
});

test('方法交互：slice 后调用 equals', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const sliced = buf1.slice(0, 5);

  return sliced.equals(buf2);
});

test('方法交互：slice 后调用 compare', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const sliced = buf1.slice(0, 5);

  return sliced.compare(buf2) < 0; // 'hello' < 'world'
});

test('方法交互：slice 后调用 swap16', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);

  sliced.swap16();

  // 字节序应该交换
  return buf[0] === 0x02 && buf[1] === 0x01;
});

test('方法交互：slice 后调用 swap32', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);

  sliced.swap32();

  return buf[0] === 0x04 && buf[3] === 0x01;
});

test('方法交互：slice 后调用 swap64', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const sliced = buf.slice(0, 8);

  sliced.swap64();

  return buf[0] === 0x08 && buf[7] === 0x01;
});

// ============ slice 后读取多字节数值 ============

test('多字节读取：slice 后 readInt8', () => {
  const buf = Buffer.from([0xff, 0x00, 0x7f]);
  const sliced = buf.slice(0, 3);

  return sliced.readInt8(0) === -1 && sliced.readInt8(2) === 127;
});

test('多字节读取：slice 后 readInt16LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);

  return sliced.readInt16LE(0) === 0x3412;
});

test('多字节读取：slice 后 readInt16BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);

  return sliced.readInt16BE(0) === 0x1234;
});

test('多字节读取：slice 后 readUInt32LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);

  return sliced.readUInt32LE(0) === 0x78563412;
});

test('多字节读取：slice 后 readUInt32BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);

  return sliced.readUInt32BE(0) === 0x12345678;
});

test('多字节读取：slice 后 readFloatLE', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  const sliced = buf.slice(0, 4);

  const value = sliced.readFloatLE(0);
  return Math.abs(value - 3.14) < 0.01;
});

test('多字节读取：slice 后 readDoubleLE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(3.141592653589793, 0);
  const sliced = buf.slice(0, 8);

  return sliced.readDoubleLE(0) === 3.141592653589793;
});

test('多字节读取：slice 后 readBigInt64LE', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123456789n, 0);
  const sliced = buf.slice(0, 8);

  return sliced.readBigInt64LE(0) === 123456789n;
});

test('多字节读取：slice 后 readBigUInt64BE', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(123456789n, 0);
  const sliced = buf.slice(0, 8);

  return sliced.readBigUInt64BE(0) === 123456789n;
});

// ============ 负数边界的细致测试 ============

test('负数边界：start = -length-1（超出负数范围）', () => {
  const buf = Buffer.from('hello'); // length = 5
  const sliced = buf.slice(-6, 3);
  // -6 会被限制为 0
  return sliced.toString() === 'hel';
});

test('负数边界：start = -length（恰好从头开始）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-5);
  return sliced.toString() === 'hello';
});

test('负数边界：start = -length+1（从第二个字节开始）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-4);
  return sliced.toString() === 'ello';
});

test('负数边界：end = -length（截止到开头）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, -5);
  return sliced.length === 0;
});

test('负数边界：end = -length+1（只保留第一个字节）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, -4);
  return sliced.toString() === 'h';
});

test('负数边界：start 和 end 都是 -length', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-5, -5);
  return sliced.length === 0;
});

test('负数边界：start = -1, end = -0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-1, -0);
  return sliced.length === 0;
});

// ============ 非原始类型参数的深入测试 ============

test('非原始类型：start 为 Symbol - 转为 NaN 再转为 0', () => {
  const buf = Buffer.from('hello');
  try {
    const sliced = buf.slice(Symbol('test'), 3);
    return sliced.toString() === 'hel';
  } catch (e) {
    // 如果抛错也是合理的
    return e.message.includes('Symbol') || e.message.includes('number');
  }
});

test('非原始类型：start 为函数 - 转为 NaN 再转为 0', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(() => 2, 3);
  return sliced.toString() === 'hel';
});

test('非原始类型：start 为 Date 对象', () => {
  const buf = Buffer.from('hello world');
  const date = new Date(2);
  const sliced = buf.slice(date, 5);
  // Date 会通过 valueOf 转为数字
  return sliced.toString() === 'llo';
});

test('非原始类型：start 为正则表达式', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(/test/, 3);
  // 正则转为 NaN 再转为 0
  return sliced.toString() === 'hel';
});

test('非原始类型：start 为多元素数组 - 转为 NaN', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice([1, 2], 3);
  return sliced.toString() === 'hel';
});

test('非原始类型：end 为带 toString 的对象', () => {
  const buf = Buffer.from('hello');
  const obj = { toString: () => '3' };
  const sliced = buf.slice(0, obj);
  return sliced.toString() === 'hel';
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
