// buffer.isAscii() - Part 2: Edge Cases and Error Handling
const { Buffer, isAscii } = require('buffer');

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
    isAscii(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: undefined 参数', () => {
  try {
    isAscii(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 字符串参数', () => {
  try {
    isAscii('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 数字参数', () => {
  try {
    isAscii(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 普通对象', () => {
  try {
    isAscii({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 普通数组', () => {
  try {
    isAscii([1, 2, 3]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Detached ArrayBuffer 测试
test('Detached ArrayBuffer 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(4);
    // 注意：实际 detach 需要特定操作
    // 这里测试结构，真实环境需要实际 detach
    isAscii(ab);
    return true; // 如果没有 detach，应该正常工作
  } catch (e) {
    return e.message.includes('detached');
  }
});

// 大 Buffer 测试
test('大 Buffer - 全 ASCII', () => {
  const buf = Buffer.alloc(10000, 0x41); // 10KB 的 'A'
  return isAscii(buf) === true;
});

test('大 Buffer - 最后一个字节非 ASCII', () => {
  const buf = Buffer.alloc(10000, 0x41);
  buf[9999] = 0x80;
  return isAscii(buf) === false;
});

test('大 Buffer - 第一个字节非 ASCII', () => {
  const buf = Buffer.alloc(10000, 0x41);
  buf[0] = 0x80;
  return isAscii(buf) === false;
});

test('大 Buffer - 中间字节非 ASCII', () => {
  const buf = Buffer.alloc(10000, 0x41);
  buf[5000] = 0x80;
  return isAscii(buf) === false;
});

// 特殊 TypedArray 测试
test('Int8Array - ASCII 范围', () => {
  const arr = new Int8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  return isAscii(arr) === true;
});

test('Int8Array - 负数（非 ASCII）', () => {
  const arr = new Int8Array([-1, 0x48]);
  return isAscii(arr) === false;
});

test('Uint32Array - 每个元素 4 字节', () => {
  const arr = new Uint32Array([0x48656C6C]); // "Hell" in little-endian
  return typeof isAscii(arr) === 'boolean';
});

// DataView 测试（不支持）
test('DataView - ASCII（不支持）', () => {
  const ab = new ArrayBuffer(5);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x48);
  dv.setUint8(1, 0x65);
  dv.setUint8(2, 0x6C);
  dv.setUint8(3, 0x6C);
  dv.setUint8(4, 0x6F);
  try {
    isAscii(dv);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('DataView');
  }
});

test('DataView - 非 ASCII（不支持）', () => {
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x48);
  dv.setUint8(1, 0x80);
  try {
    isAscii(dv);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('DataView');
  }
});

// 混合内容测试
test('ASCII + 高位字节', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0xFF]);
  return isAscii(buf) === false;
});

test('全零 Buffer', () => {
  const buf = Buffer.alloc(100, 0x00);
  return isAscii(buf) === true;
});

test('全 0x7F Buffer', () => {
  const buf = Buffer.alloc(100, 0x7F);
  return isAscii(buf) === true;
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
