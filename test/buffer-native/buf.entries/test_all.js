// buf.entries() - 完整测试汇总
const { Buffer } = require('buffer');

const allTests = [];

function test(name, fn) {
  try {
    const pass = fn();
    allTests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    allTests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ==================== 基础测试（从 test_comprehensive.js） ====================
test('entries() 返回迭代器对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.entries();
  return typeof iter === 'object' && typeof iter.next === 'function';
});

test('完整迭代所有元素', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const results = [];
  for (const [index, value] of buf.entries()) {
    results.push([index, value]);
  }
  return results.length === 5 && 
         results[0][0] === 0 && results[0][1] === 10 &&
         results[4][0] === 4 && results[4][1] === 50;
});

test('空 Buffer 返回空迭代器', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.entries();
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('大尺寸 Buffer (1000 字节)', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf[i] = i % 256;
  }
  const entries = Array.from(buf.entries());
  return entries.length === 1000 && 
         entries[0][0] === 0 && entries[0][1] === 0 &&
         entries[999][0] === 999 && entries[999][1] === 231;
});

test('迭代过程中修改 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.entries();
  iter.next(); // [0, 1]
  buf[2] = 99; // 修改第3个元素
  iter.next(); // [1, 2]
  const third = iter.next(); // [2, ?]
  return third.value[0] === 2 && third.value[1] === 99;
});

// ==================== 补充测试（从 test_supplement.js） ====================
test('从 Uint8Array 创建的 Buffer', () => {
  const arr = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(arr);
  const entries = Array.from(buf.entries());
  return entries.length === 3 && entries[1][1] === 20;
});

test('latin1 编码的 Buffer', () => {
  const buf = Buffer.from('café', 'latin1');
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[3][1] === 233;
});

test('utf16le 编码的 Buffer', () => {
  const buf = Buffer.from('AB', 'utf16le');
  const entries = Array.from(buf.entries());
  return entries.length === 4;
});

test('concat 后的 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  const entries = Array.from(buf.entries());
  return entries.length === 4 && entries[2][1] === 3;
});

test('entries() 与 keys() 的索引一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesIndices = Array.from(buf.entries()).map(([i]) => i);
  const keys = Array.from(buf.keys());
  return JSON.stringify(entriesIndices) === JSON.stringify(keys);
});

test('entries() 与 values() 的值一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const entriesValues = Array.from(buf.entries()).map(([, v]) => v);
  const values = Array.from(buf.values());
  return JSON.stringify(entriesValues) === JSON.stringify(values);
});

test('包含 emoji 的 UTF-8 Buffer', () => {
  const buf = Buffer.from('😀', 'utf8');
  const entries = Array.from(buf.entries());
  return entries.length === 4;
});

test('迭代器可用于 Map 构造', () => {
  const buf = Buffer.from([10, 20, 30]);
  const map = new Map(buf.entries());
  return map.size === 3 && map.get(1) === 20;
});

test('在非 Buffer 对象上调用 entries 应该失败', () => {
  try {
    const notBuffer = { length: 3, 0: 1, 1: 2, 2: 3 };
    const entriesFunc = Buffer.from([]).entries;
    entriesFunc.call(notBuffer);
    return false;
  } catch (e) {
    return e.message.includes('typed array');
  }
});

test('10000 字节的 Buffer', () => {
  const buf = Buffer.alloc(10000);
  let count = 0;
  for (const [index] of buf.entries()) {
    count++;
    if (index !== count - 1) return false;
  }
  return count === 10000;
});

// ==================== 结果汇总 ====================
const passed = allTests.filter(t => t.status === '✅').length;
const failed = allTests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: allTests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / allTests.length) * 100).toFixed(2) + '%'
    },
    tests: allTests,
    message: failed === 0 ? 
      '✅ 所有测试通过！buf.entries() 在 Go + goja 环境中与 Node.js v25.0.0 完全一致' :
      '❌ 存在失败的测试，请检查详情'
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

