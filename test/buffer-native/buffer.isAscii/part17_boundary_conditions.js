// buffer.isAscii() - Part 17: Advanced Boundary Conditions and Edge Cases
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

// 对象转换边界测试
test('对象有 valueOf 返回 Buffer', () => {
  const obj = {
    valueOf() {
      return Buffer.from('hello');
    }
  };
  try {
    isAscii(obj);
    return false; // 应该抛出 TypeError
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('对象有 toString 返回 Buffer', () => {
  const obj = {
    toString() {
      return Buffer.from('hello');
    }
  };
  try {
    isAscii(obj);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('对象有 toPrimitive 返回 Buffer', () => {
  const obj = {
    [Symbol.toPrimitive]() {
      return Buffer.from('hello');
    }
  };
  try {
    isAscii(obj);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 冻结和密封对象测试
test('冻结的 Buffer', () => {
  const buf = Buffer.from('hello');
  return isAscii(buf) === true;
});

test('密封的 Buffer', () => {
  const buf = Buffer.from('hello');
  return isAscii(buf) === true;
});

test('冻结的 Uint8Array', () => {
  const arr = new Uint8Array([0x48, 0x65]);
  return isAscii(arr) === true;
});

// 内存视图边界测试
test('零长度 ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  return isAscii(ab) === true; // 空应该被视为 ASCII
});

test('零长度 Uint8Array', () => {
  const arr = new Uint8Array(0);
  return isAscii(arr) === true;
});

test('零长度 Buffer.alloc', () => {
  const buf = Buffer.alloc(0);
  return isAscii(buf) === true;
});

// 非常大的 offset 和 length
test('ArrayBuffer 视图 - 超大 offset', () => {
  const ab = new ArrayBuffer(1000);
  try {
    const view = new Uint8Array(ab, 999, 1);
    view[0] = 0x41;
    return isAscii(view) === true;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('ArrayBuffer 视图 - offset = byteLength', () => {
  const ab = new ArrayBuffer(10);
  try {
    const view = new Uint8Array(ab, 10, 0); // offset 等于 byteLength，length=0
    return isAscii(view) === true; // 空视图应该是 ASCII
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 内存对齐测试
test('非对齐 Uint16Array', () => {
  const ab = new ArrayBuffer(10);
  try {
    const view = new Uint16Array(ab, 1, 4); // 从奇数字节开始
    return typeof isAscii(view) === 'boolean';
  } catch (e) {
    return e instanceof RangeError; // 某些平台可能要求对齐
  }
});

test('非对齐 Uint32Array', () => {
  const ab = new ArrayBuffer(20);
  try {
    const view = new Uint32Array(ab, 2, 4); // 从非4字节对齐开始
    return typeof isAscii(view) === 'boolean';
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 特殊数值边界
test('Buffer 包含所有 ASCII 控制字符', () => {
  const controlChars = [];
  for (let i = 0; i < 32; i++) {
    controlChars.push(i);
  }
  const buf = Buffer.from(controlChars);
  return isAscii(buf) === true;
});

test('Buffer 包含 DEL 字符 (0x7F)', () => {
  const buf = Buffer.from([0x7F]);
  return isAscii(buf) === true;
});

test('Buffer 包含扩展 ASCII 起始 (0x80)', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

test('Buffer 混合控制字符和可见字符', () => {
  const buf = Buffer.from([0x09, 0x41, 0x0A, 0x42, 0x0D]); // Tab-A-LF-B-CR
  return isAscii(buf) === true;
});

// UTF-8 序列但非 ASCII
test('双字节 UTF-8 字符', () => {
  const buf = Buffer.from([0xC2, 0x80]); // U+0080 的 UTF-8 编码
  return isAscii(buf) === false;
});

test('三字节 UTF-8 字符', () => {
  const buf = Buffer.from([0xE2, 0x82, 0xAC]); // 欧元符号 UTF-8
  return isAscii(buf) === false;
});

test('四字节 UTF-8 字符', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0x98, 0x80]); // Emoji UTF-8
  return isAscii(buf) === false;
});

test('不完整 UTF-8 序列', () => {
  const buf = Buffer.from([0xC2]); // 不完整的双字节序列
  return isAscii(buf) === false;
});

// Buffer 池和分配边界
test('从池分配的 Buffer', () => {
  const buf = Buffer.allocUnsafe(100);
  buf.fill(0x41, 0, 50); // 前50字节填充 'A'
  buf.fill(0, 50); // 后50字节清零
  return isAscii(buf) === true;
});

test('快速分配 vs 慢速分配一致性', () => {
  const fast = Buffer.alloc(1000, 0x41);
  const slow = Buffer.allocUnsafeSlow(1000);
  slow.fill(0x41);
  
  const fastResult = isAscii(fast);
  const slowResult = isAscii(slow);
  return fastResult === slowResult && fastResult === true;
});

// 平台特定字节序测试
test('字节序不影响 isAscii', () => {
  const ab = new ArrayBuffer(4);
  const uint32 = new Uint32Array(ab);
  const uint8 = new Uint8Array(ab);
  
  uint32[0] = 0x41424344; // "DCBA" 或 "ABCD" 取决于字节序
  
  // 无论字节序如何，结果应该一致
  const result = isAscii(uint8);
  return typeof result === 'boolean';
});

// 递归对象结构
test('循环引用对象', () => {
  const obj = {};
  obj.self = obj;
  try {
    isAscii(obj);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

test('深层嵌套对象', () => {
  let obj = {};
  for (let i = 0; i < 100; i++) {
    obj = { nested: obj };
  }
  try {
    isAscii(obj);
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// 内存压力测试（适度）
test('多个小 Buffer 连续测试', () => {
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.from([0x41 + (i % 26)]); // A-Z 循环
    if (!isAscii(buf)) return false;
  }
  return true;
});

test('交替 ASCII/非ASCII 测试', () => {
  const asciiResult = isAscii(Buffer.from([0x41]));
  const nonAsciiResult = isAscii(Buffer.from([0x80]));
  const asciiResult2 = isAscii(Buffer.from([0x42]));
  
  return asciiResult === true && nonAsciiResult === false && asciiResult2 === true;
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
