// buf.keys() - Part 4: 兼容性和集成测试
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

// 与其他迭代器方法的兼容性
test('keys() 与 values() 长度一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const values = Array.from(buf.values());
  return keys.length === values.length;
});

test('keys() 与 entries() 索引一致', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Array.from(buf.keys());
  const entries = Array.from(buf.entries());
  const entriesKeys = entries.map(([idx]) => idx);
  return JSON.stringify(keys) === JSON.stringify(entriesKeys);
});

test('keys() 与 Buffer.length 一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const keys = Array.from(buf.keys());
  return keys.length === buf.length;
});

test('keys() 最大索引等于 length - 1', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  const maxKey = Math.max(...keys);
  return maxKey === buf.length - 1;
});

// 与数组方法的兼容性
test('可以使用 Array.from()', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf.keys());
  return Array.isArray(keys) && keys.length === 3;
});

test('可以使用扩展运算符', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = [...buf.keys()];
  return Array.isArray(keys) && keys.length === 3;
});

test('可以使用 for...of', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  for (const key of buf.keys()) {
    count++;
  }
  return count === 3;
});

test('可以使用 Array.from 带映射函数', () => {
  const buf = Buffer.from([10, 20, 30]);
  const doubled = Array.from(buf.keys(), x => x * 2);
  return doubled[0] === 0 && doubled[1] === 2 && doubled[2] === 4;
});

// 与 TypedArray 的兼容性
test('Uint8Array 视图的 keys() 与 Buffer 一致', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  
  const bufKeys = Array.from(buf.keys());
  const uint8Keys = Array.from(uint8.keys());
  
  return JSON.stringify(bufKeys) === JSON.stringify(uint8Keys);
});

// slice 后的 Buffer
test('slice 后的 Buffer keys() 从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(2, 4);
  const keys = Array.from(sliced.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('slice 后的 Buffer keys() 长度正确', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sliced = buf.slice(3, 7);
  const keys = Array.from(sliced.keys());
  return keys.length === 4;
});

// subarray 后的 Buffer
test('subarray 后的 Buffer keys() 正确', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(1, 4);
  const keys = Array.from(sub.keys());
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

// concat 后的 Buffer
test('concat 后的 Buffer keys() 正确', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concatenated = Buffer.concat([buf1, buf2]);
  const keys = Array.from(concatenated.keys());
  return keys.length === 4 && keys[3] === 3;
});

// 特殊编码的 Buffer
test('UTF-8 编码 Buffer keys() 正确', () => {
  const buf = Buffer.from('hello', 'utf8');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0;
});

test('hex 编码 Buffer keys() 正确', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[4] === 4;
});

test('base64 编码 Buffer keys() 正确', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  const keys = Array.from(buf.keys());
  return keys.length === 5 && keys[0] === 0;
});

// 与索引访问的一致性
test('keys() 索引可用于访问 Buffer', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const keys = Array.from(buf.keys());
  let allValid = true;
  for (const key of keys) {
    if (buf[key] === undefined) {
      allValid = false;
      break;
    }
  }
  return allValid;
});

test('keys() 返回的索引都是有效的', () => {
  const buf = Buffer.from([100, 200, 50, 150]);
  const keys = Array.from(buf.keys());
  let allInRange = true;
  for (const key of keys) {
    if (key < 0 || key >= buf.length) {
      allInRange = false;
      break;
    }
  }
  return allInRange;
});

// 输出结果
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
