// 完整的原生 Go 方法测试
const { Buffer } = require('buffer');

console.log('=== Buffer 原生 Go 方法完整测试 ===\n');

const tests = [];
function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅', passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

const buf = Buffer.from([1, 2, 3, 4, 5]);

// forEach
test('forEach - 遍历所有元素', () => {
  const result = [];
  buf.forEach((byte, index) => {
    result.push(byte * 2);
  });
  if (result.join(',') !== '2,4,6,8,10') throw new Error('forEach failed');
});

// map
test('map - 映射转换', () => {
  const result = buf.map(byte => byte * 2);
  if (result.join(',') !== '2,4,6,8,10') throw new Error('map failed');
});

// filter
test('filter - 过滤元素', () => {
  const result = buf.filter(byte => byte > 2);
  if (result.join(',') !== '3,4,5') throw new Error('filter failed');
});

// find
test('find - 查找元素', () => {
  const result = buf.find(byte => byte > 3);
  if (result !== 4) throw new Error(`Expected 4, got ${result}`);
});

test('find - 未找到返回 undefined', () => {
  const result = buf.find(byte => byte > 10);
  if (result !== undefined) throw new Error(`Expected undefined, got ${result}`);
});

// findIndex
test('findIndex - 查找索引', () => {
  const result = buf.findIndex(byte => byte > 3);
  if (result !== 3) throw new Error(`Expected 3, got ${result}`);
});

test('findIndex - 未找到返回 -1', () => {
  const result = buf.findIndex(byte => byte > 10);
  if (result !== -1) throw new Error(`Expected -1, got ${result}`);
});

// findLast
test('findLast - 从后往前查找', () => {
  const result = buf.findLast(byte => byte < 4);
  if (result !== 3) throw new Error(`Expected 3, got ${result}`);
});

// findLastIndex
test('findLastIndex - 从后往前查找索引', () => {
  const result = buf.findLastIndex(byte => byte < 4);
  if (result !== 2) throw new Error(`Expected 2, got ${result}`);
});

// reduce
test('reduce - 求和', () => {
  const result = buf.reduce((acc, byte) => acc + byte, 0);
  if (result !== 15) throw new Error(`Expected 15, got ${result}`);
});

test('reduce - 无初始值', () => {
  const result = buf.reduce((acc, byte) => acc + byte);
  if (result !== 15) throw new Error(`Expected 15, got ${result}`);
});

// reduceRight
test('reduceRight - 从右往左累积', () => {
  const result = buf.reduceRight((acc, byte) => acc + byte, 0);
  if (result !== 15) throw new Error(`Expected 15, got ${result}`);
});

test('reduceRight - 从右往左拼接', () => {
  const result = buf.reduceRight((acc, byte) => acc + String(byte), '');
  if (result !== '54321') throw new Error(`Expected '54321', got '${result}'`);
});

// some
test('some - 存在大于3的元素', () => {
  const result = buf.some(byte => byte > 3);
  if (result !== true) throw new Error('some failed');
});

test('some - 不存在大于10的元素', () => {
  const result = buf.some(byte => byte > 10);
  if (result !== false) throw new Error('some failed');
});

// every
test('every - 所有元素都大于0', () => {
  const result = buf.every(byte => byte > 0);
  if (result !== true) throw new Error('every failed');
});

test('every - 并非所有元素都大于3', () => {
  const result = buf.every(byte => byte > 3);
  if (result !== false) throw new Error('every failed');
});

// join
test('join - 默认逗号分隔', () => {
  const result = buf.join();
  if (result !== '1,2,3,4,5') throw new Error(`Expected '1,2,3,4,5', got '${result}'`);
});

test('join - 自定义分隔符', () => {
  const result = buf.join('-');
  if (result !== '1-2-3-4-5') throw new Error(`Expected '1-2-3-4-5', got '${result}'`);
});

test('join - 空字符串分隔', () => {
  const result = buf.join('');
  if (result !== '12345') throw new Error(`Expected '12345', got '${result}'`);
});

// toLocaleString
test('toLocaleString - 逗号分隔', () => {
  const result = buf.toLocaleString();
  if (result !== '1,2,3,4,5') throw new Error(`Expected '1,2,3,4,5', got '${result}'`);
});

// 空 Buffer 测试
const emptyBuf = Buffer.alloc(0);

test('空Buffer - forEach', () => {
  let count = 0;
  emptyBuf.forEach(() => count++);
  if (count !== 0) throw new Error('Should not iterate');
});

test('空Buffer - map', () => {
  const result = emptyBuf.map(byte => byte * 2);
  if (result.length !== 0) throw new Error('Should return empty array');
});

test('空Buffer - filter', () => {
  const result = emptyBuf.filter(() => true);
  if (result.length !== 0) throw new Error('Should return empty array');
});

test('空Buffer - find', () => {
  const result = emptyBuf.find(() => true);
  if (result !== undefined) throw new Error('Should return undefined');
});

test('空Buffer - findIndex', () => {
  const result = emptyBuf.findIndex(() => true);
  if (result !== -1) throw new Error('Should return -1');
});

test('空Buffer - some', () => {
  const result = emptyBuf.some(() => true);
  if (result !== false) throw new Error('Should return false');
});

test('空Buffer - every', () => {
  const result = emptyBuf.every(() => true);
  if (result !== true) throw new Error('Should return true');
});

test('空Buffer - join', () => {
  const result = emptyBuf.join();
  if (result !== '') throw new Error('Should return empty string');
});

test('空Buffer - reduce with initial value', () => {
  const result = emptyBuf.reduce((acc, byte) => acc + byte, 0);
  if (result !== 0) throw new Error('Should return initial value');
});

// 大Buffer性能测试
test('大Buffer - map(1000元素)', () => {
  const largeBuf = Buffer.alloc(1000, 42);
  const result = largeBuf.map(byte => byte + 1);
  if (result.length !== 1000) throw new Error('map length mismatch');
  if (result[0] !== 43) throw new Error('map value mismatch');
});

test('大Buffer - filter(1000元素)', () => {
  const largeBuf = Buffer.alloc(1000, 42);
  const result = largeBuf.filter(byte => byte === 42);
  if (result.length !== 1000) throw new Error('filter length mismatch');
});

test('大Buffer - reduce(1000元素)', () => {
  const largeBuf = Buffer.alloc(1000, 1);
  const result = largeBuf.reduce((acc, byte) => acc + byte, 0);
  if (result !== 1000) throw new Error(`Expected 1000, got ${result}`);
});

// thisArg 测试
test('forEach - thisArg', () => {
  const context = { multiplier: 2 };
  const result = [];
  buf.forEach(function(byte) {
    result.push(byte * this.multiplier);
  }, context);
  if (result.join(',') !== '2,4,6,8,10') throw new Error('thisArg failed');
});

test('map - thisArg', () => {
  const context = { multiplier: 3 };
  const result = buf.map(function(byte) {
    return byte * this.multiplier;
  }, context);
  if (result.join(',') !== '3,6,9,12,15') throw new Error('thisArg failed');
});

// 总结
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

console.log(`\n=== 测试总结 ===`);
console.log(`总计: ${tests.length}`);
console.log(`通过: ${passed}`);
console.log(`失败: ${failed}`);
console.log(`成功率: ${((passed / tests.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 所有原生方法测试通过！');
}

const result = {
  success: failed === 0,
  summary: {
    total: tests.length,
    passed: passed,
    failed: failed,
    successRate: ((passed / tests.length) * 100).toFixed(1) + '%'
  },
  tests: tests
};

console.log('\n' + JSON.stringify(result, null, 2));
return result;
