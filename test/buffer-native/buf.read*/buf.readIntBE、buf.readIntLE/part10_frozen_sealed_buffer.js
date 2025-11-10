// buf.readIntBE/readIntLE - 冻结和密封 Buffer 测试
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

// 冻结 Buffer 测试（Node.js 不允许冻结有元素的 TypedArray/Buffer）
test('尝试冻结非空 Buffer 会抛出 TypeError', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('freeze');
  }
});

test('冻结空 Buffer 可以创建（长度为0）', () => {
  try {
    const buf = Buffer.alloc(0);
    Object.freeze(buf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 密封 Buffer 测试（Node.js 不允许密封有元素的 TypedArray/Buffer）
test('尝试密封非空 Buffer 会抛出 TypeError', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('seal');
  }
});

test('密封空 Buffer 可以创建（长度为0）', () => {
  try {
    const buf = Buffer.alloc(0);
    Object.seal(buf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 不可扩展 Buffer 测试
test('不可扩展 Buffer 可以读取 readIntBE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  Object.preventExtensions(buf);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('不可扩展 Buffer 可以读取 readIntLE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  Object.preventExtensions(buf);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('不可扩展 Buffer 读取零', () => {
  const buf = Buffer.alloc(6);
  Object.preventExtensions(buf);
  return buf.readIntBE(0, 6) === 0 && buf.readIntLE(0, 6) === 0;
});

test('不可扩展 Buffer offset 越界仍抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    Object.preventExtensions(buf);
    buf.readIntBE(1, 4);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('不可扩展 Buffer byteLength 越界仍抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    Object.preventExtensions(buf);
    buf.readIntLE(0, 5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('不可扩展 Buffer 读取负数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  Object.preventExtensions(buf);
  return buf.readIntBE(0, 4) === -1 && buf.readIntLE(0, 4) === -1;
});

test('不可扩展 Buffer 读取不同 byteLength', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  Object.preventExtensions(buf);
  const r1 = buf.readIntBE(0, 1);
  const r2 = buf.readIntBE(0, 2);
  const r3 = buf.readIntBE(0, 3);
  const r4 = buf.readIntBE(0, 6);
  return r1 === 0x12 && r2 === 0x1234 && r3 === 0x123456 && r4 === 0x1234567890ab;
});

// 检查可扩展性
test('新 Buffer 默认是可扩展的', () => {
  const buf = Buffer.alloc(4);
  return Object.isExtensible(buf);
});

test('preventExtensions 后不可扩展', () => {
  const buf = Buffer.alloc(4);
  Object.preventExtensions(buf);
  return !Object.isExtensible(buf);
});

// 不可扩展但可修改
test('不可扩展 Buffer 可以修改后读取', () => {
  const buf = Buffer.alloc(4);
  Object.preventExtensions(buf);
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('不可扩展 Buffer 可以使用 write 方法', () => {
  const buf = Buffer.alloc(6);
  Object.preventExtensions(buf);
  buf.writeIntBE(0x123456, 0, 3);
  return buf.readIntBE(0, 3) === 0x123456;
});

// 混合字节序测试
test('不可扩展 Buffer BE 和 LE 混合读取', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  Object.preventExtensions(buf);
  const be = buf.readIntBE(0, 4);
  const le = buf.readIntLE(0, 4);
  return be === 0x12345678 && le === 0x78563412;
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
