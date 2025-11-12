// 原生 Go 方法 vs 迭代器性能对比
const { Buffer } = require('buffer');

console.log('=== 原生 Go 方法 vs 迭代器性能对比 ===\n');

const results = {};

// 测试数据
const buf1k = Buffer.alloc(1000, 42);
const buf10k = Buffer.alloc(10000, 99);
const buf100k = Buffer.alloc(100000, 77);

// ========================================
// 测试1: 求和操作
// ========================================
console.log('【测试1】求和操作（1000字节 × 1000次）');

// 方式1: for...of 迭代器
let start = Date.now();
for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (const byte of buf1k) {
    sum += byte;
  }
}
const iteratorSumTime = Date.now() - start;
console.log(`  for...of迭代器: ${iteratorSumTime}ms`);

// 方式2: 原生 reduce
start = Date.now();
for (let i = 0; i < 1000; i++) {
  const sum = buf1k.reduce((acc, byte) => acc + byte, 0);
}
const nativeReduceTime = Date.now() - start;
console.log(`  原生reduce:     ${nativeReduceTime}ms`);
console.log(`  性能提升:       ${((1 - nativeReduceTime / iteratorSumTime) * 100).toFixed(1)}%\n`);

results.sum1k = {
  iterator: iteratorSumTime,
  native: nativeReduceTime,
  improvement: `${((1 - nativeReduceTime / iteratorSumTime) * 100).toFixed(1)}%`
};

// ========================================
// 测试2: forEach 操作
// ========================================
console.log('【测试2】forEach操作（10000字节 × 100次）');

// 方式1: for...of
start = Date.now();
for (let i = 0; i < 100; i++) {
  let count = 0;
  for (const byte of buf10k) {
    count++;
  }
}
const iteratorForEachTime = Date.now() - start;
console.log(`  for...of迭代器: ${iteratorForEachTime}ms`);

// 方式2: 原生 forEach
start = Date.now();
for (let i = 0; i < 100; i++) {
  let count = 0;
  buf10k.forEach(() => {
    count++;
  });
}
const nativeForEachTime = Date.now() - start;
console.log(`  原生forEach:    ${nativeForEachTime}ms`);
console.log(`  性能提升:       ${((1 - nativeForEachTime / iteratorForEachTime) * 100).toFixed(1)}%\n`);

results.forEach10k = {
  iterator: iteratorForEachTime,
  native: nativeForEachTime,
  improvement: `${((1 - nativeForEachTime / iteratorForEachTime) * 100).toFixed(1)}%`
};

// ========================================
// 测试3: 查找操作（some）
// ========================================
console.log('【测试3】查找操作 - 查找值255（100000字节 × 10次）');

// 方式1: for...of + break
start = Date.now();
for (let i = 0; i < 10; i++) {
  let found = false;
  for (const byte of buf100k) {
    if (byte === 255) {
      found = true;
      break;
    }
  }
}
const iteratorSomeTime = Date.now() - start;
console.log(`  for...of迭代器: ${iteratorSomeTime}ms`);

// 方式2: 原生 some
start = Date.now();
for (let i = 0; i < 10; i++) {
  const found = buf100k.some(byte => byte === 255);
}
const nativeSomeTime = Date.now() - start;
console.log(`  原生some:       ${nativeSomeTime}ms`);
console.log(`  性能提升:       ${((1 - nativeSomeTime / iteratorSomeTime) * 100).toFixed(1)}%\n`);

results.some100k = {
  iterator: iteratorSomeTime,
  native: nativeSomeTime,
  improvement: `${((1 - nativeSomeTime / iteratorSomeTime) * 100).toFixed(1)}%`
};

// ========================================
// 测试4: 验证操作（every）
// ========================================
console.log('【测试4】验证操作 - 检查所有值都是77（100000字节 × 10次）');

// 方式1: for...of
start = Date.now();
for (let i = 0; i < 10; i++) {
  let allMatch = true;
  for (const byte of buf100k) {
    if (byte !== 77) {
      allMatch = false;
      break;
    }
  }
}
const iteratorEveryTime = Date.now() - start;
console.log(`  for...of迭代器: ${iteratorEveryTime}ms`);

// 方式2: 原生 every
start = Date.now();
for (let i = 0; i < 10; i++) {
  const allMatch = buf100k.every(byte => byte === 77);
}
const nativeEveryTime = Date.now() - start;
console.log(`  原生every:      ${nativeEveryTime}ms`);
console.log(`  性能提升:       ${((1 - nativeEveryTime / iteratorEveryTime) * 100).toFixed(1)}%\n`);

results.every100k = {
  iterator: iteratorEveryTime,
  native: nativeEveryTime,
  improvement: `${((1 - nativeEveryTime / iteratorEveryTime) * 100).toFixed(1)}%`
};

// ========================================
// 测试5: 复杂计算
// ========================================
console.log('【测试5】复杂计算 - 求平方和（10000字节 × 100次）');

// 方式1: for...of
start = Date.now();
for (let i = 0; i < 100; i++) {
  let sum = 0;
  for (const byte of buf10k) {
    sum += byte * byte;
  }
}
const iteratorComplexTime = Date.now() - start;
console.log(`  for...of迭代器: ${iteratorComplexTime}ms`);

// 方式2: 原生 reduce
start = Date.now();
for (let i = 0; i < 100; i++) {
  const sum = buf10k.reduce((acc, byte) => acc + byte * byte, 0);
}
const nativeComplexTime = Date.now() - start;
console.log(`  原生reduce:     ${nativeComplexTime}ms`);
console.log(`  性能提升:       ${((1 - nativeComplexTime / iteratorComplexTime) * 100).toFixed(1)}%\n`);

results.complex10k = {
  iterator: iteratorComplexTime,
  native: nativeComplexTime,
  improvement: `${((1 - nativeComplexTime / iteratorComplexTime) * 100).toFixed(1)}%`
};

// ========================================
// 总结
// ========================================
console.log('=== 性能总结 ===');
console.log(JSON.stringify(results, null, 2));

// 计算平均提升
const improvements = [
  results.sum1k,
  results.forEach10k,
  results.some100k,
  results.every100k,
  results.complex10k
];

let totalImprovement = 0;
let count = 0;
for (const test of improvements) {
  const improvement = parseFloat(test.improvement);
  if (!isNaN(improvement)) {
    totalImprovement += improvement;
    count++;
  }
}
const avgImprovement = count > 0 ? (totalImprovement / count).toFixed(1) : '0.0';

console.log(`\n平均性能提升: ${avgImprovement}%`);

if (parseFloat(avgImprovement) > 0) {
  console.log('✅ 原生Go方法显著快于迭代器！');
} else if (parseFloat(avgImprovement) < 0) {
  console.log('⚠️ 原生Go方法反而更慢，需要优化');
} else {
  console.log('➖ 性能相当');
}

const finalResult = {
  success: true,
  results: results,
  avgImprovement: avgImprovement + '%'
};
console.log('\n' + JSON.stringify(finalResult, null, 2));
return finalResult;
