// buf.writeUInt8() - 极限场景和压力测试
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

// 超大 Buffer
test('超大 Buffer 10000 字节写入首尾', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt8(111, 0);
  buf.writeUInt8(222, 9999);
  return buf[0] === 111 && buf[9999] === 222 && buf[5000] === 0;
});

test('超大 Buffer 链式写入 1000 次', () => {
  const buf = Buffer.alloc(1000);
  let pos = 0;
  for (let i = 0; i < 1000; i++) {
    pos = buf.writeUInt8(i % 256, pos);
  }
  return pos === 1000 && buf[0] === 0 && buf[255] === 255 && buf[999] === 231;
});

// 错误恢复场景
test('越界写入后 Buffer 内容不变', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  try {
    buf.writeUInt8(99, 10);
  } catch (e) {
    // 越界错误
  }
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 4;
});

test('超范围值后 Buffer 内容不变', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  try {
    buf.writeUInt8(300, 1);
  } catch (e) {
    // 超范围错误
  }
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30 && buf[3] === 40;
});

test('错误后继续正常写入', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(300, 0);
  } catch (e) {
    // 忽略错误
  }
  buf.writeUInt8(100, 0);
  return buf[0] === 100;
});

// 冻结和密封对象相关
test('Object.freeze Buffer 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.freeze(buf);
    return false; // 应该抛错
  } catch (e) {
    return e.message.includes('freeze') || e.message.includes('array buffer');
  }
});

test('Object.seal Buffer 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    Object.seal(buf);
    return false; // 应该抛错
  } catch (e) {
    return e.message.includes('seal') || e.message.includes('array buffer');
  }
});

// 连续多种 write 方法混合
test('writeUInt8 和直接赋值混合', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(10, 0);
  buf[1] = 20;
  buf.writeUInt8(30, 2);
  buf[3] = 40;
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30 && buf[3] === 40;
});

test('writeUInt8 和 writeInt8 交替', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(200, 0);
  buf.writeInt8(-50, 1);
  buf.writeUInt8(100, 2);
  buf.writeInt8(50, 3);
  return buf[0] === 200 && buf[1] === 206 && buf[2] === 100 && buf[3] === 50;
});

// 性能压力：大量重复写入同一位置
test('同一位置重复写入 10000 次', () => {
  const buf = Buffer.alloc(1);
  for (let i = 0; i < 10000; i++) {
    buf.writeUInt8(i % 256, 0);
  }
  return buf[0] === (9999 % 256);
});

test('循环写入所有 256 个可能值', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf.writeUInt8(i, i);
  }
  let pass = true;
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) pass = false;
  }
  return pass;
});

// 边界组合极限
test('0 值填满整个 Buffer', () => {
  const buf = Buffer.allocUnsafe(100);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(0, i);
  }
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== 0) pass = false;
  }
  return pass;
});

test('255 值填满整个 Buffer', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(255, i);
  }
  let pass = true;
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== 255) pass = false;
  }
  return pass;
});

test('交替 0 和 255', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(i % 2 === 0 ? 0 : 255, i);
  }
  return buf[0] === 0 && buf[1] === 255 && buf[98] === 0 && buf[99] === 255;
});

// 与 Buffer.compare 配合
test('写入后 compare 验证', () => {
  const buf1 = Buffer.alloc(4);
  buf1.writeUInt8(10, 0);
  buf1.writeUInt8(20, 1);
  buf1.writeUInt8(30, 2);
  buf1.writeUInt8(40, 3);

  const buf2 = Buffer.from([10, 20, 30, 40]);
  return Buffer.compare(buf1, buf2) === 0;
});

// 与 Buffer.equals 配合
test('写入后 equals 验证', () => {
  const buf1 = Buffer.alloc(3);
  buf1.writeUInt8(100, 0);
  buf1.writeUInt8(150, 1);
  buf1.writeUInt8(200, 2);

  const buf2 = Buffer.from([100, 150, 200]);
  return buf1.equals(buf2);
});

// toString 验证写入结果
test('写入后 toString hex 验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x0A, 0);
  buf.writeUInt8(0x14, 1);
  buf.writeUInt8(0x1E, 2);
  buf.writeUInt8(0x28, 3);
  return buf.toString('hex') === '0a141e28';
});

// 写入后 toJSON 验证
test('写入后 toJSON 验证', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(1, 0);
  buf.writeUInt8(2, 1);
  buf.writeUInt8(3, 2);
  const json = buf.toJSON();
  return json.type === 'Buffer' &&
         json.data[0] === 1 &&
         json.data[1] === 2 &&
         json.data[2] === 3;
});

// offset 参数的精度
test('offset 浮点数被截断为整数', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeUInt8(123, 2.9);
    return false; // 应该抛错
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('offset 负浮点数抛错', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeUInt8(123, -0.1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

// 极端 offset 值
test('offset 为 Number.MAX_SAFE_INTEGER 抛错', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeUInt8(123, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('offset 为 Number.MIN_SAFE_INTEGER 抛错', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeUInt8(123, Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
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
