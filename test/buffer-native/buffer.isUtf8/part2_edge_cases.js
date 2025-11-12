// buffer.isUtf8() - Part 2: Edge Cases and Error Handling
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 错误处理测试
test('TypeError: null 参数', () => {
  try {
    isUtf8(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: undefined 参数', () => {
  try {
    isUtf8(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 字符串参数', () => {
  try {
    isUtf8('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 数字参数', () => {
  try {
    isUtf8(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 普通对象', () => {
  try {
    isUtf8({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 普通数组', () => {
  try {
    isUtf8([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 边界情况测试
test('UTF-8 边界 - 1 字节最大值 (U+007F)', () => {
  const buf = Buffer.from([0x7F]);
  return isUtf8(buf) === true;
});

test('UTF-8 边界 - 2 字节最小值 (U+0080)', () => {
  const buf = Buffer.from([0xC2, 0x80]);
  return isUtf8(buf) === true;
});

test('UTF-8 边界 - 2 字节最大值 (U+07FF)', () => {
  const buf = Buffer.from([0xDF, 0xBF]);
  return isUtf8(buf) === true;
});

test('UTF-8 边界 - 3 字节最小值 (U+0800)', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80]);
  return isUtf8(buf) === true;
});

test('UTF-8 边界 - 3 字节最大值 (U+FFFF)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

test('UTF-8 边界 - 4 字节最小值 (U+10000)', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('UTF-8 边界 - 4 字节最大值 (U+10FFFF)', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]);
  return isUtf8(buf) === true;
});

// 特殊字符测试
test('UTF-8 BOM (U+FEFF)', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF]);
  return isUtf8(buf) === true;
});

test('零宽度空格 (U+200B)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8B]);
  return isUtf8(buf) === true;
});

test('组合字符', () => {
  const buf = Buffer.from('é', 'utf8'); // e + 组合重音符
  return isUtf8(buf) === true;
});

// 大 Buffer 测试
test('大 Buffer - 全有效 UTF-8', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0x41); // ASCII 'A'
  return isUtf8(buf) === true;
});

test('大 Buffer - 最后字节损坏', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0x41); // ASCII 'A'
  buf[9999] = 0xC0; // 孤立的 UTF-8 起始字节
  return isUtf8(buf) === false;
});

test('大 Buffer - 中间字节损坏', () => {
  const str = '你好'.repeat(5000);
  const buf = Buffer.from(str, 'utf8');
  buf[buf.length / 2] = 0x80; // 损坏中间字节
  return isUtf8(buf) === false;
});

// 混合有效和无效序列
test('有效序列后跟无效序列', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x80]); // "Hello" + 无效字节
  return isUtf8(buf) === false;
});

test('无效序列后跟有效序列', () => {
  const buf = Buffer.from([0x80, 0x48, 0x65, 0x6C, 0x6C, 0x6F]); // 无效字节 + "Hello"
  return isUtf8(buf) === false;
});

// 控制字符
test('包含 NULL 字符', () => {
  const buf = Buffer.from([0x48, 0x00, 0x65]); // "H\0e"
  return isUtf8(buf) === true;
});

test('包含换行符', () => {
  const buf = Buffer.from('Hello\nWorld', 'utf8');
  return isUtf8(buf) === true;
});

test('包含制表符', () => {
  const buf = Buffer.from('Hello\tWorld', 'utf8');
  return isUtf8(buf) === true;
});

// DataView 测试（不支持）
test('DataView - 有效 UTF-8（不支持）', () => {
  const ab = new ArrayBuffer(5);
  const dv = new DataView(ab);
  const bytes = [0x48, 0x65, 0x6C, 0x6C, 0x6F];
  bytes.forEach((b, i) => dv.setUint8(i, b));
  try {
    isUtf8(dv);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('DataView');
  }
});

test('DataView - 无效 UTF-8（不支持）', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x80);
  dv.setUint8(1, 0x80);
  try {
    isUtf8(dv);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('DataView');
  }
});

// 全零测试
test('全零 Buffer', () => {
  const buf = Buffer.alloc(100, 0x00);
  return isUtf8(buf) === true;
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
