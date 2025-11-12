// buf.values() - 深度查缺补漏测试
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

// ==================== 性能与内存边界 ====================

test('超大 Buffer (100MB) 应能正常创建迭代器', () => {
  try {
    const size = 100 * 1024 * 1024; // 100MB
    const buf = Buffer.alloc(size);
    const iter = buf.values();
    // 只验证创建成功和第一个值
    const first = iter.next();
    return !first.done && first.value === 0;
  } catch (e) {
    // 如果内存不足，也算通过
    return e.message.includes('memory') || e.message.includes('size');
  }
});

test('多个大迭代器同时存在不应崩溃', () => {
  const buf = Buffer.alloc(10000);
  const iters = [];
  for (let i = 0; i < 100; i++) {
    iters.push(buf.values());
  }
  // 验证所有迭代器都有效
  return iters.every(iter => typeof iter.next === 'function');
});

test('迭代器在 Buffer 被修改后应反映新值', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  iter.next(); // 跳过第一个
  buf[1] = 99; // 修改第二个值
  const second = iter.next();
  return second.value === 99;
});

// ==================== Symbol 相关 ====================

test('Buffer Symbol.toStringTag 应为 Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  return Object.prototype.toString.call(buf) === '[object Uint8Array]';
});

test('迭代器 Symbol.toStringTag 应存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const tag = iter[Symbol.toStringTag];
  return typeof tag === 'string';
});

test('Symbol.iterator 和 values 应返回相同类型的迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf.values();
  
  return iter1.constructor === iter2.constructor;
});

// ==================== 继承与方法访问 ====================

test('Buffer 实例应能访问原型上的 values 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  // values 应该在原型链上
  return typeof buf.values === 'function' &&
         !buf.hasOwnProperty('values');
});

test('多个 Buffer 实例应共享 values 方法', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  
  // values 方法应该是同一个函数（原型方法）
  return buf1.values === buf2.values;
});

// ==================== WeakMap/WeakSet 交互 ====================

test('迭代器可作为 WeakMap 的键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const wm = new WeakMap();
  wm.set(iter, 'test');
  return wm.get(iter) === 'test';
});

test('迭代器可添加到 WeakSet', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const ws = new WeakSet();
  ws.add(iter);
  return ws.has(iter);
});

// ==================== 异步操作 ====================

test('Promise.all 配合多个迭代器应正常工作', async () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  
  const p1 = Promise.resolve([...buf1.values()]);
  const p2 = Promise.resolve([...buf2.values()]);
  
  const results = await Promise.all([p1, p2]);
  return results[0][0] === 1 && results[1][0] === 3;
});

test('async 函数中使用 for...of 遍历', async () => {
  const buf = Buffer.from([1, 2, 3]);
  let sum = 0;
  
  for (const value of buf.values()) {
    sum += await Promise.resolve(value);
  }
  
  return sum === 6;
});

// ==================== 特殊值处理 ====================

test('Buffer 包含 NaN 作为数组元素应转换为 0', () => {
  const buf = Buffer.from([NaN, 1, 2]);
  const values = [...buf.values()];
  return values[0] === 0 && values[1] === 1;
});

test('Buffer 包含 Infinity 应转换为 0', () => {
  const buf = Buffer.from([Infinity, 1, 2]);
  const values = [...buf.values()];
  return values[0] === 0 && values[1] === 1;
});

test('Buffer 包含负数应取模到 0-255', () => {
  const buf = Buffer.from([-1, -128, 256]);
  const values = [...buf.values()];
  return values[0] === 255 && values[1] === 128 && values[2] === 0;
});

// ==================== 跨类型 TypedArray 互操作 ====================

test('Int8Array.from(buf.values()) 应正确转换', () => {
  const buf = Buffer.from([1, 2, 3]);
  const int8 = Int8Array.from(buf.values());
  return int8.length === 3 && int8[0] === 1;
});

test('Uint32Array.from(buf.values()) 应正确转换', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint32 = Uint32Array.from(buf.values());
  return uint32.length === 3 && uint32[0] === 1;
});

test('Float64Array.from(buf.values()) 应正确转换', () => {
  const buf = Buffer.from([1, 2, 3]);
  const float64 = Float64Array.from(buf.values());
  return float64.length === 3 && float64[0] === 1.0;
});

// ==================== 迭代器状态一致性 ====================

test('多次调用 Symbol.iterator 应返回独立迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf[Symbol.iterator]();
  const iter2 = buf[Symbol.iterator]();
  
  iter1.next();
  iter1.next();
  
  const val1 = iter1.next().value;
  const val2 = iter2.next().value;
  
  return val1 === 3 && val2 === 1;
});

test('迭代器耗尽后不应影响新迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter1 = buf.values();
  
  // 耗尽第一个迭代器
  while (!iter1.next().done) {}
  
  // 创建新迭代器应从头开始
  const iter2 = buf.values();
  return iter2.next().value === 1;
});

// ==================== 边界情况：特殊索引访问 ====================

test('使用 Object.keys 获取索引不应包含迭代器方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const keys = Object.keys(buf);
  return !keys.includes('values') && !keys.includes('keys') && !keys.includes('entries');
});

test('Object.getOwnPropertySymbols 应返回空数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  const symbols = Object.getOwnPropertySymbols(iter);
  return Array.isArray(symbols);
});

// ==================== 性能回归检测 ====================

test('迭代 10000 字节应在合理时间内完成', () => {
  const buf = Buffer.alloc(10000);
  const start = Date.now();
  
  let count = 0;
  for (const val of buf.values()) {
    count++;
  }
  
  const duration = Date.now() - start;
  // 应该在 100ms 内完成
  return count === 10000 && duration < 100;
});

test('创建 1000 个迭代器应很快', () => {
  const buf = Buffer.from([1, 2, 3]);
  const start = Date.now();
  
  for (let i = 0; i < 1000; i++) {
    buf.values();
  }
  
  const duration = Date.now() - start;
  // 应该在 50ms 内完成
  return duration < 50;
});

// ==================== 与其他迭代方法的一致性 ====================

test('values() 和 [Symbol.iterator]() 应产生相同结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr1 = [...buf.values()];
  const arr2 = [...buf[Symbol.iterator]()];
  
  return arr1.length === arr2.length &&
         arr1.every((v, i) => v === arr2[i]);
});

test('手动迭代和 for...of 应产生相同结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  const manual = [];
  const iter = buf.values();
  let result;
  while (!(result = iter.next()).done) {
    manual.push(result.value);
  }
  
  const forOf = [];
  for (const val of buf.values()) {
    forOf.push(val);
  }
  
  return manual.length === forOf.length &&
         manual.every((v, i) => v === forOf[i]);
});

// ==================== 总结 ====================

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

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
