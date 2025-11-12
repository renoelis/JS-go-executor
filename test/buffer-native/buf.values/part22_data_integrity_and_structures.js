// buf.values() - 数据完整性与复杂数据结构测试
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

// ==================== 与 Buffer API 交互 ====================

test('Buffer.isBuffer 对迭代器返回 false', () => {
  const buf = Buffer.from([1, 2, 3]);
  const iter = buf.values();
  
  return !Buffer.isBuffer(iter);
});

test('Buffer.compare 与迭代器值', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  
  const values1 = [...buf1.values()];
  const values2 = [...buf2.values()];
  
  return Buffer.compare(buf1, buf2) === 0 &&
         values1.every((v, i) => v === values2[i]);
});

test('Buffer.concat 后的迭代器', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concatenated = Buffer.concat([buf1, buf2]);
  
  const values = [...concatenated.values()];
  
  return values.length === 4 &&
         values[0] === 1 &&
         values[1] === 2 &&
         values[2] === 3 &&
         values[3] === 4;
});

test('Buffer.byteLength 与迭代器数量一致', () => {
  const str = 'hello';
  const buf = Buffer.from(str, 'utf8');
  const values = [...buf.values()];
  
  return values.length === Buffer.byteLength(str, 'utf8');
});

test('Buffer.allocUnsafe 后填充再迭代', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.fill(42);
  
  const values = [...buf.values()];
  
  return values.length === 3 && values.every(v => v === 42);
});

// ==================== Set 数据结构 ====================

test('Set.from 迭代器值应无重复', () => {
  const buf = Buffer.from([1, 2, 2, 3, 3, 3]);
  const uniqueSet = new Set(buf.values());
  
  return uniqueSet.size === 3 &&
         uniqueSet.has(1) &&
         uniqueSet.has(2) &&
         uniqueSet.has(3);
});

test('Set 包含所有 256 个字节值', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  
  const uniqueSet = new Set(buf.values());
  
  return uniqueSet.size === 256;
});

test('Set 迭代顺序与 Buffer 一致', () => {
  const buf = Buffer.from([5, 3, 1, 4, 2]);
  const setArray = Array.from(new Set(buf.values()));
  const bufArray = [...buf.values()];
  
  // Set 保持插入顺序
  return setArray[0] === 5 && bufArray[0] === 5;
});

// ==================== Map 数据结构 ====================

test('Map 使用迭代器值作为键', () => {
  const buf = Buffer.from([1, 2, 3]);
  const map = new Map();
  
  for (const value of buf.values()) {
    map.set(value, value * 10);
  }
  
  return map.size === 3 &&
         map.get(1) === 10 &&
         map.get(2) === 20 &&
         map.get(3) === 30;
});

test('Map 统计字节出现次数', () => {
  const buf = Buffer.from([1, 2, 2, 3, 3, 3]);
  const countMap = new Map();
  
  for (const value of buf.values()) {
    countMap.set(value, (countMap.get(value) || 0) + 1);
  }
  
  return countMap.get(1) === 1 &&
         countMap.get(2) === 2 &&
         countMap.get(3) === 3;
});

// ==================== 数据完整性 ====================

test('迭代过程中 Buffer 长度不变', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const originalLength = buf.length;
  
  for (const value of buf.values()) {
    // 迭代过程中验证长度
    if (buf.length !== originalLength) return false;
  }
  
  return true;
});

test('迭代器不改变 Buffer 内容', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const original = [...buf];
  
  // 完整迭代
  for (const value of buf.values()) {
    // 只读取，不修改
  }
  
  return buf.every((v, i) => v === original[i]);
});

test('并发迭代器互不干扰', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const iter1 = buf.values();
  const iter2 = buf.values();
  
  iter1.next(); // 1
  iter1.next(); // 2
  
  // iter2 应该独立，从头开始
  return iter2.next().value === 1 &&
         iter1.next().value === 3;
});

test('迭代器状态隔离 - 深度验证', () => {
  const buf = Buffer.from([10, 20, 30]);
  const iters = [];
  
  // 创建5个迭代器
  for (let i = 0; i < 5; i++) {
    iters.push(buf.values());
  }
  
  // 每个迭代器前进不同步数
  iters[0].next(); // 10
  iters[1].next(); // 10
  iters[1].next(); // 20
  iters[2].next(); // 10
  iters[2].next(); // 20
  iters[2].next(); // 30
  
  // 验证状态独立
  return iters[3].next().value === 10 &&
         iters[4].next().value === 10 &&
         iters[0].next().value === 20 &&
         iters[1].next().value === 30;
});

// ==================== 位运算与迭代器 ====================

test('位运算处理迭代器值', () => {
  const buf = Buffer.from([0xFF, 0x0F, 0xF0]);
  const results = [];
  
  for (const value of buf.values()) {
    results.push(value & 0x0F); // 取低4位
  }
  
  return results[0] === 0x0F &&
         results[1] === 0x0F &&
         results[2] === 0x00;
});

test('位移运算处理迭代器值', () => {
  const buf = Buffer.from([8, 16, 32]);
  const results = [];
  
  for (const value of buf.values()) {
    results.push(value >> 1); // 右移1位
  }
  
  return results[0] === 4 &&
         results[1] === 8 &&
         results[2] === 16;
});

test('XOR 运算与迭代器', () => {
  const buf = Buffer.from([0xFF, 0xAA, 0x55]);
  const key = 0x33;
  const results = [];
  
  for (const value of buf.values()) {
    results.push(value ^ key);
  }
  
  return results[0] === (0xFF ^ 0x33) &&
         results[1] === (0xAA ^ 0x33) &&
         results[2] === (0x55 ^ 0x33);
});

// ==================== 数学运算深度测试 ====================

test('累积乘法不溢出', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let product = 1;
  
  for (const value of buf.values()) {
    product *= value;
  }
  
  return product === 120; // 5!
});

test('平均值计算', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  let sum = 0;
  let count = 0;
  
  for (const value of buf.values()) {
    sum += value;
    count++;
  }
  
  return sum / count === 30;
});

test('方差计算', () => {
  const buf = Buffer.from([2, 4, 4, 4, 5, 5, 7, 9]);
  const values = [...buf.values()];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  let variance = 0;
  for (const value of buf.values()) {
    variance += Math.pow(value - mean, 2);
  }
  variance /= values.length;
  
  return variance === 4; // 已知方差为4
});

// ==================== 字符串转换与编码 ====================

test('迭代器值转 ASCII 字符', () => {
  const buf = Buffer.from('ABC', 'ascii');
  const chars = [];
  
  for (const value of buf.values()) {
    chars.push(String.fromCharCode(value));
  }
  
  return chars.join('') === 'ABC';
});

test('迭代器值转十六进制字符串', () => {
  const buf = Buffer.from([255, 16, 0]);
  const hexStrings = [];
  
  for (const value of buf.values()) {
    hexStrings.push(value.toString(16).padStart(2, '0'));
  }
  
  return hexStrings.join('') === 'ff1000';
});

test('迭代器值转二进制字符串', () => {
  const buf = Buffer.from([5, 3, 7]);
  const binaryStrings = [];
  
  for (const value of buf.values()) {
    binaryStrings.push(value.toString(2).padStart(8, '0'));
  }
  
  return binaryStrings[0] === '00000101' &&
         binaryStrings[1] === '00000011' &&
         binaryStrings[2] === '00000111';
});

// ==================== 复杂过滤与转换 ====================

test('链式 filter-map-reduce', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  
  const result = [...buf.values()]
    .filter(v => v % 2 === 0) // 偶数: [2, 4, 6, 8, 10]
    .map(v => v * 2)           // 翻倍: [4, 8, 12, 16, 20]
    .reduce((a, b) => a + b, 0); // 求和: 60
  
  return result === 60;
});

test('some 方法检测存在性', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  
  const hasEven = [...buf.values()].some(v => v % 2 === 0);
  const hasLargeValue = [...buf.values()].some(v => v > 100);
  
  return hasEven === true && hasLargeValue === false;
});

test('every 方法检测全部条件', () => {
  const buf = Buffer.from([2, 4, 6, 8, 10]);
  
  const allEven = [...buf.values()].every(v => v % 2 === 0);
  const allPositive = [...buf.values()].every(v => v > 0);
  const allLarge = [...buf.values()].every(v => v > 5);
  
  return allEven === true && allPositive === true && allLarge === false;
});

test('find 方法查找元素', () => {
  const buf = Buffer.from([1, 5, 10, 15, 20]);
  
  const found = [...buf.values()].find(v => v > 12);
  const notFound = [...buf.values()].find(v => v > 100);
  
  return found === 15 && notFound === undefined;
});

test('findIndex 方法查找索引', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  
  const index = [...buf.values()].findIndex(v => v === 30);
  const notFoundIndex = [...buf.values()].findIndex(v => v === 99);
  
  return index === 2 && notFoundIndex === -1;
});

// ==================== 排序与去重 ====================

test('迭代器值排序', () => {
  const buf = Buffer.from([5, 2, 8, 1, 9]);
  const sorted = [...buf.values()].sort((a, b) => a - b);
  
  return sorted[0] === 1 &&
         sorted[1] === 2 &&
         sorted[2] === 5 &&
         sorted[3] === 8 &&
         sorted[4] === 9;
});

test('迭代器值反转', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const reversed = [...buf.values()].reverse();
  
  return reversed[0] === 5 &&
         reversed[1] === 4 &&
         reversed[2] === 3 &&
         reversed[3] === 2 &&
         reversed[4] === 1;
});

test('迭代器值去重后排序', () => {
  const buf = Buffer.from([3, 1, 4, 1, 5, 9, 2, 6, 5, 3]);
  const unique = [...new Set(buf.values())].sort((a, b) => a - b);
  
  return unique.length === 7 &&
         unique[0] === 1 &&
         unique[6] === 9;
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
