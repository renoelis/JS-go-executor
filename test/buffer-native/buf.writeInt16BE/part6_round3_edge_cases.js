// buf.writeInt16BE() - 第3轮补充：参数缺省和特殊场景
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

// 参数缺省测试
test('缺省 offset 参数使用默认值 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt16BE(1000);
  return result === 2 && buf[0] === 0x03 && buf[1] === 0xE8;
});

test('只有 value 参数时写入到起始位置', () => {
  const buf = Buffer.alloc(10, 0xFF);
  buf.writeInt16BE(0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xFF;
});

// 正负零测试
test('写入 +0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(+0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

test('写入 -0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00;
});

// 边界值的精确测试
test('写入 1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1, 0);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('写入 -1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

test('写入 255', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(255, 0);
  return buf[0] === 0x00 && buf[1] === 0xFF;
});

test('写入 256', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(256, 0);
  return buf[0] === 0x01 && buf[1] === 0x00;
});

test('写入 -256', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-256, 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('写入 32766 (最大值-1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32766, 0);
  return buf[0] === 0x7F && buf[1] === 0xFE && buf.readInt16BE(0) === 32766;
});

test('写入 -32767 (最小值+1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32767, 0);
  return buf[0] === 0x80 && buf[1] === 0x01 && buf.readInt16BE(0) === -32767;
});

// 返回值测试
test('写入后返回值总是 offset + 2', () => {
  const buf = Buffer.alloc(10);
  let ret = buf.writeInt16BE(100, 0);
  if (ret !== 2) return false;
  ret = buf.writeInt16BE(200, 1);
  if (ret !== 3) return false;
  ret = buf.writeInt16BE(300, 7);
  if (ret !== 9) return false;
  return true;
});

test('返回值可以用作下一次写入的 offset', () => {
  const buf = Buffer.alloc(10);
  let offset = 0;
  offset = buf.writeInt16BE(100, offset);
  offset = buf.writeInt16BE(200, offset);
  offset = buf.writeInt16BE(300, offset);
  return offset === 6 &&
         buf.readInt16BE(0) === 100 &&
         buf.readInt16BE(2) === 200 &&
         buf.readInt16BE(4) === 300;
});

// 负offset测试（应该抛错）
test('offset 为小负数抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, -1);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('negative') || e.message.includes('out of range');
  }
});

test('offset 为大负数抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, -100);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('negative') || e.message.includes('out of range');
  }
});

// 数字字符串边界测试
test('值为包含空格的数字字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(' 100 ', 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16BE(100, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('值为十六进制字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('0x10', 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16BE(16, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

// 科学计数法
test('值为科学计数法字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE('1e3', 0);
  const expected = Buffer.alloc(4);
  expected.writeInt16BE(1000, 0);
  return buf[0] === expected[0] && buf[1] === expected[1];
});

test('值为科学计数法数字', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1e3, 0);
  return buf.readInt16BE(0) === 1000;
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
