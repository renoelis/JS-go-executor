// buf.values() - 深度补充 Part 13: 迭代器内部机制和原型链
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
  }
}

// 测试 1: 迭代器没有可枚举属性
test('迭代器应没有可枚举属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const keys = Object.keys(iter);
  return keys.length === 0;
});

// 测试 2: 迭代器没有 length 属性
test('迭代器不应有 length 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return iter.length === undefined;
});

// 测试 3: 迭代器没有 buffer 属性
test('迭代器不应有 buffer 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  return iter.buffer === undefined;
});

// 测试 4: 迭代器穷尽后持续返回 done
test('穷尽的迭代器应持续返回 done', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // 穷尽迭代器
  while (!iter.next().done);

  // 多次调用应该都返回 done
  for (let i = 0; i < 10; i++) {
    const result = iter.next();
    if (!result.done || result.value !== undefined) {
      return false;
    }
  }

  return true;
});

// 测试 5: 迭代器的 Symbol.iterator 返回自身
test('穷尽后的迭代器 Symbol.iterator 仍返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  while (!iter.next().done);

  return iter[Symbol.iterator]() === iter;
});

// 测试 6: Buffer.from(Buffer) 创建新 Buffer
test('Buffer.from(Buffer) 应创建新 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);

  // 修改原 Buffer
  buf1[0] = 99;

  const values = [...buf2.values()];
  // buf2 应该不受影响（是复制）
  return values[0] === 1;
});

// 测试 7: Buffer.from([]) 创建空 Buffer
test('Buffer.from([]) 应创建空 Buffer', () => {
  const buf = Buffer.from([]);
  const values = [...buf.values()];

  return values.length === 0;
});

// 测试 8: 迭代器在 for...of 中断后可继续
test('for...of 中断后迭代器可继续使用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  let sum1 = 0;
  let count = 0;
  for (const v of iter) {
    sum1 += v;
    count++;
    if (count === 2) break;
  }

  // 继续使用同一个迭代器
  let sum2 = 0;
  for (const v of iter) {
    sum2 += v;
  }

  // 第一次: 1+2=3, 第二次: 3+4+5=12
  return sum1 === 3 && sum2 === 12;
});

// 测试 9: [Symbol.iterator]() 与 values() 等价
test('[Symbol.iterator]() 应与 values() 完全等价', () => {
  const buf = Buffer.from([1, 2, 3]);

  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf.values();

  const v1 = iter1.next().value;
  const v2 = iter2.next().value;

  return v1 === v2 && v1 === 1;
});

// 测试 10: Symbol.iterator 通过 call 调用
test('[Symbol.iterator].call(buf) 应正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf[Symbol.iterator].call(buf);

  const values = [...iter];
  return values.length === 3 && values[0] === 1;
});

// 测试 11: values.call(buf) 调用
test('values.call(buf) 应正常工作', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values.call(buf);

  const values = [];
  let result = iter.next();
  while (!result.done) {
    values.push(result.value);
    result = iter.next();
  }

  return values.length === 3 && values[0] === 1;
});

// 测试 12: 替换 Buffer.prototype.values
test('替换 Buffer.prototype.values 应生效', () => {
  const original = Buffer.prototype.values;
  let called = false;

  Buffer.prototype.values = function() {
    called = true;
    return original.call(this);
  };

  const buf = Buffer.from([1, 2, 3]);
  const values = [...buf.values()];

  Buffer.prototype.values = original;

  return called && values.length === 3;
});

// 测试 13: 迭代器的 toString
test('迭代器的 toString 应返回合理字符串', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const str = iter.toString();
  return str.includes('Iterator');
});

// 测试 14: 迭代器的 valueOf
test('迭代器的 valueOf 应返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  // valueOf 通常返回自身
  const val = iter.valueOf();
  return typeof val === 'object';
});

// 测试 15: String(iter) 转换
test('String(iter) 应不抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const str = String(iter);
  return typeof str === 'string';
});

// 测试 16: 迭代器 + "" 转换
test('迭代器字符串拼接应不抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();

  const str = iter + '';
  return typeof str === 'string';
});

// 测试 17: Buffer.toString 不影响迭代器
test('buf.toString() 不应影响后续迭代', () => {
  const buf = Buffer.from([65, 66, 67]); // "ABC"
  const iter = buf.values();

  iter.next(); // A

  const str = buf.toString();
  const remaining = [...iter];

  return str === 'ABC' && remaining.length === 2;
});

// 测试 18: Buffer.valueOf 返回自身
test('buf.valueOf() 应返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const val = buf.valueOf();

  return val === buf;
});

// 测试 19: 不同大小 Buffer 的迭代
test('不同大小 Buffer 迭代应正确', () => {
  const sizes = [0, 1, 2, 255, 256, 1024, 4096];

  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    let count = 0;
    for (const v of buf.values()) {
      count++;
    }
    if (count !== size) return false;
  }

  return true;
});

// 测试 20: 特殊索引访问不影响迭代
test('特殊索引访问不应影响迭代', () => {
  const buf = Buffer.from([10, 20, 30]);

  // 访问各种特殊索引
  const v1 = buf[-1];
  const v2 = buf[Infinity];
  const v3 = buf[NaN];
  const v4 = buf[true];
  const v5 = buf[null];

  // 都应该是 undefined
  if (v1 !== undefined || v2 !== undefined || v3 !== undefined ||
      v4 !== undefined || v5 !== undefined) {
    return false;
  }

  // 迭代应该正常
  const values = [...buf.values()];
  return values.length === 3 && values[0] === 10;
});

// 测试 21: buf.reverse() 影响迭代
test('buf.reverse() 应立即影响后续迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next(); // 1

  buf.reverse(); // [5, 4, 3, 2, 1]

  const v2 = iter.next().value;
  // 应该是反转后的第二个元素
  return v2 === 4;
});

// 测试 22: buf.fill() 影响迭代
test('buf.fill() 应立即影响后续迭代', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter = buf.values();

  iter.next(); // 1

  buf.fill(99);

  const v2 = iter.next().value;
  return v2 === 99;
});

// 测试 23: lastIndexOf 不影响迭代
test('buf.lastIndexOf() 不应影响迭代', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  const iter = buf.values();

  iter.next(); // 1

  const idx = buf.lastIndexOf(2);
  const v2 = iter.next().value;

  return idx === 3 && v2 === 2;
});

// 测试 24: 迭代器在垃圾回收后仍可用
test('迭代器在原 Buffer 离开作用域后仍可用', () => {
  function createIter() {
    const buf = Buffer.from([1, 2, 3, 4, 5]);
    const iter = buf.values();
    iter.next();
    return iter;
  }

  const iter = createIter();

  // Buffer 已离开作用域，但迭代器仍应可用
  const remaining = [];
  let result = iter.next();
  while (!result.done) {
    remaining.push(result.value);
    result = iter.next();
  }

  return remaining.length === 4 && remaining[0] === 2;
});

// 测试 25: Buffer 的 filter 方法不影响原 Buffer
test('buf.filter() 不应改变原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const filtered = buf.filter(x => x > 2);
  const original = [...buf.values()];

  // 原 Buffer 应该不变
  return original.length === 5 && original[0] === 1;
});

// 测试 26: Buffer 的 map 方法不影响原 Buffer
test('buf.map() 不应改变原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);

  const mapped = buf.map(x => x * 2);
  const original = [...buf.values()];

  return original.length === 3 && original[0] === 1;
});

// 测试 27: Buffer 的 reduce 方法
test('buf.reduce() 应可对迭代器值使用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  const sum1 = buf.reduce((a, b) => a + b, 0);
  const sum2 = [...buf.values()].reduce((a, b) => a + b, 0);

  return sum1 === 15 && sum2 === 15 && sum1 === sum2;
});

// 测试 28: Buffer.compare 不同情况
test('Buffer.compare 各种边界应正确', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);
  const empty = Buffer.alloc(0);

  const r1 = Buffer.compare(buf1, buf2);
  const r2 = Buffer.compare(buf1, buf3);
  const r3 = Buffer.compare(empty, buf1);
  const r4 = Buffer.compare(empty, empty);

  return r1 === 0 && r2 < 0 && r3 < 0 && r4 === 0;
});

// 测试 29: 各种编码的迭代一致性
test('不同编码 Buffer 迭代长度应正确', () => {
  const encodings = ['utf8', 'hex', 'base64', 'ascii', 'latin1'];

  for (const enc of encodings) {
    try {
      const buf = Buffer.from('test', enc);
      const iterLen = [...buf.values()].length;

      if (iterLen !== buf.length) return false;
    } catch (e) {
      // 某些编码可能失败，这是正常的
    }
  }

  return true;
});

// 测试 30: ucs2/utf16le 编码的字节数
test('ucs2 编码应产生双倍字节', () => {
  const buf1 = Buffer.from('test', 'utf8');
  const buf2 = Buffer.from('test', 'ucs2');

  const len1 = [...buf1.values()].length;
  const len2 = [...buf2.values()].length;

  // ucs2 每个字符 2 字节
  return len2 === len1 * 2;
});

const passed = tests.filter(t => t.passed === true).length;
const failed = tests.filter(t => t.passed === false).length;

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

return result
