// buf.toJSON() - JSON.parse Reviver, structuredClone, and Advanced Integration Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// JSON.parse 还原
test('JSON.parse 不会自动还原 Buffer', () => {
  const original = Buffer.from([1, 2, 3]);
  const str = JSON.stringify(original);
  const parsed = JSON.parse(str);

  if (Buffer.isBuffer(parsed)) return false;
  if (parsed.type !== 'Buffer') return false;
  if (!Array.isArray(parsed.data)) return false;

  return true;
});

test('手动从 parsed 结果还原 Buffer', () => {
  const original = Buffer.from([10, 20, 30]);
  const str = JSON.stringify(original);
  const parsed = JSON.parse(str);
  const restored = Buffer.from(parsed.data);

  if (!Buffer.isBuffer(restored)) return false;
  if (restored.length !== original.length) return false;
  for (let i = 0; i < original.length; i++) {
    if (restored[i] !== original[i]) return false;
  }

  return true;
});

// JSON.parse reviver
test('使用 reviver 自动还原 Buffer', () => {
  const original = Buffer.from([100, 101, 102]);
  const str = JSON.stringify({ buf: original });

  const parsed = JSON.parse(str, (key, value) => {
    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  });

  if (!Buffer.isBuffer(parsed.buf)) return false;
  if (parsed.buf.length !== 3) return false;
  if (parsed.buf[0] !== 100) return false;

  return true;
});

test('reviver 处理嵌套 Buffer', () => {
  const obj = {
    level1: {
      buf: Buffer.from([1, 2]),
      level2: {
        buf: Buffer.from([3, 4])
      }
    }
  };

  const str = JSON.stringify(obj);
  const parsed = JSON.parse(str, (key, value) => {
    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  });

  if (!Buffer.isBuffer(parsed.level1.buf)) return false;
  if (!Buffer.isBuffer(parsed.level1.level2.buf)) return false;

  return true;
});

test('reviver 处理 Buffer 数组', () => {
  const arr = [
    Buffer.from([1, 2]),
    Buffer.from([3, 4]),
    Buffer.from([5, 6])
  ];

  const str = JSON.stringify(arr);
  const parsed = JSON.parse(str, (key, value) => {
    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
      return Buffer.from(value.data);
    }
    return value;
  });

  if (!Array.isArray(parsed)) return false;
  if (parsed.length !== 3) return false;
  for (let i = 0; i < 3; i++) {
    if (!Buffer.isBuffer(parsed[i])) return false;
  }

  return true;
});

// structuredClone
test('structuredClone 克隆 Buffer 为 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  const cloned = structuredClone(buf);

  // structuredClone 会将 Buffer 克隆为 Uint8Array
  if (Buffer.isBuffer(cloned)) return false;
  if (!(cloned instanceof Uint8Array)) return false;
  if (cloned.length !== 3) return false;

  return true;
});

test('structuredClone 的结果没有 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  const cloned = structuredClone(buf);

  // Uint8Array 没有 toJSON 方法
  if (typeof cloned.toJSON !== 'undefined') return false;

  return true;
});

test('structuredClone 的结果数据相同', () => {
  const buf = Buffer.from([10, 20, 30]);
  const cloned = structuredClone(buf);

  if (cloned.length !== buf.length) return false;
  for (let i = 0; i < buf.length; i++) {
    if (cloned[i] !== buf[i]) return false;
  }

  return true;
});

test('structuredClone 深拷贝,修改原 Buffer 不影响克隆', () => {
  const buf = Buffer.from([1, 2, 3]);
  const cloned = structuredClone(buf);

  buf[0] = 99;

  if (cloned[0] === 99) return false;
  if (cloned[0] !== 1) return false;

  return true;
});

test('structuredClone 包含 Buffer 的对象', () => {
  const obj = {
    buf: Buffer.from([1, 2, 3]),
    num: 42
  };

  const cloned = structuredClone(obj);

  if (cloned.num !== 42) return false;
  // Buffer 被克隆为 Uint8Array
  if (Buffer.isBuffer(cloned.buf)) return false;
  if (!(cloned.buf instanceof Uint8Array)) return false;

  return true;
});

// JSON.stringify replacer 详细测试
test('replacer 函数访问所有属性', () => {
  const obj = {
    name: 'test',
    buf: Buffer.from([1, 2, 3]),
    num: 42
  };

  const calls = [];
  JSON.stringify(obj, (key, value) => {
    calls.push(key);
    return value;
  });

  // replacer 应该访问根对象、name、buf、type、data、data[0]、data[1]、data[2]、num
  if (calls.length < 5) return false;
  if (!calls.includes('name')) return false;
  if (!calls.includes('buf')) return false;
  if (!calls.includes('num')) return false;

  return true;
});

test('replacer 可以修改 Buffer 序列化结果', () => {
  const buf = Buffer.from([1, 2, 3]);

  const str = JSON.stringify(buf, (key, value) => {
    if (value && value.type === 'Buffer') {
      return { type: 'CustomBuffer', data: value.data };
    }
    return value;
  });

  const parsed = JSON.parse(str);
  if (parsed.type !== 'CustomBuffer') return false;

  return true;
});

test('replacer 可以完全替换 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);

  const str = JSON.stringify(buf, (key, value) => {
    if (Buffer.isBuffer(value)) {
      return 'replaced';
    }
    return value;
  });

  if (str !== '"replaced"') return false;

  return true;
});

// JSON.stringify space 参数
test('space 参数为数字时添加缩进', () => {
  const buf = Buffer.from([1, 2]);
  const compact = JSON.stringify(buf);
  const pretty = JSON.stringify(buf, null, 2);

  if (pretty.length <= compact.length) return false;
  if (!pretty.includes('\n')) return false;
  if (!pretty.includes('  ')) return false; // 2 空格缩进

  return true;
});

test('space 参数为字符串时使用该字符串缩进', () => {
  const buf = Buffer.from([1, 2]);
  const pretty = JSON.stringify(buf, null, '\t');

  if (!pretty.includes('\n')) return false;
  if (!pretty.includes('\t')) return false;

  return true;
});

test('space 参数不影响 toJSON 调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  let callCount = 0;

  buf.toJSON = function() {
    callCount++;
    return { type: 'Buffer', data: [1, 2, 3] };
  };

  JSON.stringify(buf);
  const count1 = callCount;

  callCount = 0;
  JSON.stringify(buf, null, 2);
  const count2 = callCount;

  // 无论 space 参数如何,toJSON 都只调用一次
  if (count1 !== 1) return false;
  if (count2 !== 1) return false;

  return true;
});

// 索引访问一致性
test('Buffer 和 toJSON data 索引访问一致', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const json = buf.toJSON();

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== json.data[i]) return false;
  }

  return true;
});

test('负数索引在 Buffer 和 data 数组上都返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (buf[-1] !== undefined) return false;
  if (json.data[-1] !== undefined) return false;

  return true;
});

test('超出范围索引在 Buffer 和 data 数组上都返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (buf[100] !== undefined) return false;
  if (json.data[100] !== undefined) return false;

  return true;
});

test('浮点数索引在 Buffer 上返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  const json = buf.toJSON();

  if (buf[1.5] !== undefined) return false;
  if (json.data[1.5] !== undefined) return false;

  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
  console.log('\n' + JSON.stringify(result, null, 2));
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
