// buf.values() - 极端场景与边界压力测试
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

// ==================== 极限数值测试 ====================

test('最大索引值访问', () => {
  const buf = Buffer.from([1, 2, 3]);
  const maxIndex = buf.length - 1;
  
  return buf[maxIndex] === 3;
});

test('Number.MAX_SAFE_INTEGER 作为循环边界', () => {
  const buf = Buffer.from([1, 2, 3]);
  let count = 0;
  
  // 模拟极大循环（实际只迭代3次）
  for (let i = 0; i < Number.MAX_SAFE_INTEGER && count < 3; i++) {
    const iter = buf.values();
    const result = iter.next();
    if (!result.done) count++;
    break; // 防止真的循环那么多次
  }
  
  return count === 1;
});

test('零值字节的特殊处理', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  const values = [...buf.values()];
  
  return values.length === 4 && values.every(v => v === 0);
});

test('0xFF 最大单字节值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  const values = [...buf.values()];
  
  return values.every(v => v === 255);
});

// ==================== 特殊 Buffer 构造 ====================

test('Buffer.from 空数组', () => {
  const buf = Buffer.from([]);
  const values = [...buf.values()];
  
  return values.length === 0;
});

test('Buffer.from 单元素数组', () => {
  const buf = Buffer.from([42]);
  const values = [...buf.values()];
  
  return values.length === 1 && values[0] === 42;
});

test('Buffer.from 负数数组应转换', () => {
  const buf = Buffer.from([-1, -128, -255]);
  const values = [...buf.values()];
  
  // 负数应该被转换为对应的无符号值
  return values[0] === 255 && values[1] === 128 && values[2] === 1;
});

test('Buffer.from 浮点数数组应截断', () => {
  const buf = Buffer.from([1.9, 2.1, 3.5, 4.99]);
  const values = [...buf.values()];
  
  return values[0] === 1 && values[1] === 2 && values[2] === 3 && values[3] === 4;
});

test('Buffer.from 大于 255 的数应取模', () => {
  const buf = Buffer.from([256, 257, 300, 1000]);
  const values = [...buf.values()];
  
  return values[0] === 0 &&    // 256 % 256
         values[1] === 1 &&    // 257 % 256
         values[2] === 44 &&   // 300 % 256
         values[3] === 232;    // 1000 % 256
});

// ==================== 迭代器极限状态 ====================

test('连续调用 1000 次 next', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  for (let i = 0; i < 1000; i++) {
    iter.next();
  }
  
  // 耗尽后应该持续返回 done
  const result = iter.next();
  return result.done === true && result.value === undefined;
});

test('迭代器重复检查 done 状态', () => {
  const buf = Buffer.from([1]);
  const iter = buf.values();
  
  iter.next(); // 消耗唯一元素
  
  // 连续检查100次
  for (let i = 0; i < 100; i++) {
    const result = iter.next();
    if (!result.done || result.value !== undefined) {
      return false;
    }
  }
  
  return true;
});

test('空 Buffer 迭代器立即 done', () => {
  const buf = Buffer.alloc(0);
  const iter = buf.values();
  
  const first = iter.next();
  const second = iter.next();
  
  return first.done && second.done &&
         first.value === undefined &&
         second.value === undefined;
});

// ==================== 内存与性能压力 ====================

test('快速创建销毁 1000 个迭代器', () => {
  const buf = Buffer.from([1, 2, 3]);
  
  for (let i = 0; i < 1000; i++) {
    const iter = buf.values();
    iter.next();
    // 迭代器应该被自动回收
  }
  
  // 如果没有内存泄漏，测试应该完成
  return true;
});

test('1000 个迭代器同时存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iterators = [];
  
  for (let i = 0; i < 1000; i++) {
    iterators.push(buf.values());
  }
  
  // 验证所有迭代器都有效
  return iterators.every(iter => {
    const result = iter.next();
    return !result.done && result.value === 1;
  });
});

test('大 Buffer 部分迭代后释放', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(42);
  
  const iter = buf.values();
  
  // 只迭代前10个
  for (let i = 0; i < 10; i++) {
    iter.next();
  }
  
  // 提前终止，迭代器应该可以被释放
  return true;
});

// ==================== 边界条件组合 ====================

test('空 Buffer 使用 for...of', () => {
  const buf = Buffer.alloc(0);
  let count = 0;
  
  for (const value of buf.values()) {
    count++;
  }
  
  return count === 0;
});

test('单字节 Buffer 使用 for...of', () => {
  const buf = Buffer.from([99]);
  let sum = 0;
  
  for (const value of buf.values()) {
    sum += value;
  }
  
  return sum === 99;
});

test('全零 Buffer 迭代', () => {
  const buf = Buffer.alloc(100); // 默认全零
  let sum = 0;
  
  for (const value of buf.values()) {
    sum += value;
  }
  
  return sum === 0;
});

test('全 255 Buffer 迭代', () => {
  const buf = Buffer.alloc(100);
  buf.fill(255);
  
  let count = 0;
  for (const value of buf.values()) {
    if (value === 255) count++;
  }
  
  return count === 100;
});

// ==================== 类型边界 ====================

test('迭代器值始终为 number 类型', () => {
  const buf = Buffer.from([0, 1, 128, 255]);
  
  for (const value of buf.values()) {
    if (typeof value !== 'number') return false;
  }
  
  return true;
});

test('迭代器值始终为整数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  
  for (const value of buf.values()) {
    if (!Number.isInteger(value)) return false;
  }
  
  return true;
});

test('迭代器值始终在 0-255 范围', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  
  for (const value of buf.values()) {
    if (value < 0 || value > 255) return false;
  }
  
  return true;
});

// ==================== 特殊字符与编码 ====================

test('空字符串创建的 Buffer', () => {
  const buf = Buffer.from('', 'utf8');
  const values = [...buf.values()];
  
  return values.length === 0;
});

test('单字符字符串迭代', () => {
  const buf = Buffer.from('A', 'utf8');
  const values = [...buf.values()];
  
  return values.length === 1 && values[0] === 65; // 'A' 的 ASCII 码
});

test('Emoji 的字节表示', () => {
  const buf = Buffer.from('😀', 'utf8');
  const values = [...buf.values()];
  
  // 😀 是 4 字节的 UTF-8 序列
  return values.length === 4 && values.every(v => v >= 0 && v <= 255);
});

test('特殊 Unicode 字符', () => {
  const buf = Buffer.from('\u0000\u0001\u0002', 'utf8');
  const values = [...buf.values()];
  
  return values[0] === 0 && values[1] === 1 && values[2] === 2;
});

// ==================== 数组方法边界 ====================

test('slice 返回新数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = [...buf.values()].slice(1, 3);
  
  return sliced.length === 2 && sliced[0] === 2 && sliced[1] === 3;
});

test('splice 修改数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = [...buf.values()];
  const removed = arr.splice(2, 2);
  
  return removed.length === 2 &&
         removed[0] === 3 &&
         removed[1] === 4 &&
         arr.length === 3;
});

test('concat 合并多个迭代器结果', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf3 = Buffer.from([5, 6]);
  
  const combined = [...buf1.values()]
    .concat([...buf2.values()])
    .concat([...buf3.values()]);
  
  return combined.length === 6 && combined[5] === 6;
});

test('join 将字节值连接成字符串', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const joined = [...buf.values()].join(',');
  
  return joined === '1,2,3,4,5';
});

// ==================== 条件边界 ====================

test('空值检测', () => {
  const buf = Buffer.from([0, 1, 0, 2, 0]);
  const nonZero = [...buf.values()].filter(v => v !== 0);
  
  return nonZero.length === 2 && nonZero[0] === 1 && nonZero[1] === 2;
});

test('范围过滤', () => {
  const buf = Buffer.from([5, 15, 25, 35, 45]);
  const inRange = [...buf.values()].filter(v => v >= 10 && v <= 30);
  
  return inRange.length === 2 && inRange[0] === 15 && inRange[1] === 25;
});

test('奇偶分组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const odd = [...buf.values()].filter(v => v % 2 === 1);
  const even = [...buf.values()].filter(v => v % 2 === 0);
  
  return odd.length === 3 && even.length === 3;
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
