// buf.writeUInt8() - 第6轮补漏：offset参数类型转换深度测试
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

// offset 严格类型检查（不像 value，offset 不接受隐式转换）
test('offset 为字符串 "1" 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, "1");
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('type') && e.message.includes('number');
  }
});

test('offset 为字符串 "0" 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, "0");
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('type');
  }
});

test('offset 为数组 [1] 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, [1]);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Array');
  }
});

test('offset 为数组 [] 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, []);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Array');
  }
});

test('offset 为带 valueOf 的对象抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, { valueOf: () => 1 });
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Object');
  }
});

test('offset 为带 toString 的对象抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, { toString: () => '1' });
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Object');
  }
});

test('offset 为 true 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, true);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('boolean');
  }
});

test('offset 为 false 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, false);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('boolean');
  }
});

test('offset 为 Symbol 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, Symbol('test'));
    return false;
  } catch (e) {
    return e.message.includes('offset') && (e.message.includes('symbol') || e.message.includes('Symbol'));
  }
});

test('offset 为 BigInt 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, 1n);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('bigint');
  }
});

test('offset 为函数抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, () => 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('function');
  }
});

test('offset 为 Date 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, new Date(1000));
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Date');
  }
});

test('offset 为 RegExp 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, /test/);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('RegExp');
  }
});

test('offset 为 Buffer 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, Buffer.from([1]));
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Buffer');
  }
});

test('offset 为 Set 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, new Set([1]));
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Set');
  }
});

test('offset 为 Map 抛错', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeUInt8(100, new Map());
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('Map');
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
