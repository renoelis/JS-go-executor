// 性能诊断测试 - 定位具体慢在哪里
const { Buffer } = require('buffer');

const results = {};

// 测试1: 迭代器创建开销
console.log('=== 测试1: 迭代器创建 ===');
const buf = Buffer.alloc(1024 * 1024, 42); // 1MB
let start = Date.now();
for (let i = 0; i < 100; i++) {
  const iter = buf[Symbol.iterator]();
}
let elapsed = Date.now() - start;
console.log(`创建100个迭代器: ${elapsed}ms`);
results.iteratorCreation = elapsed;

// 测试2: 单次完整迭代
console.log('\n=== 测试2: 1MB完整迭代 ===');
start = Date.now();
let count = 0;
for (const byte of buf) {
  count++;
}
elapsed = Date.now() - start;
console.log(`1MB完整迭代: ${elapsed}ms, count=${count}`);
results.fullIteration1MB = elapsed;

// 测试3: 小 Buffer 迭代（测试是否使用缓存）
console.log('\n=== 测试3: 小Buffer迭代（200字节，低于256阈值）===');
const smallBuf = Buffer.alloc(200, 99);
start = Date.now();
for (let i = 0; i < 10000; i++) {
  let c = 0;
  for (const byte of smallBuf) {
    c++;
  }
}
elapsed = Date.now() - start;
console.log(`10000次200字节迭代: ${elapsed}ms`);
results.smallBufferIteration = elapsed;

// 测试4: 中等 Buffer 迭代（测试缓存效果）
console.log('\n=== 测试4: 中Buffer迭代（1000字节，高于256阈值）===');
const medBuf = Buffer.alloc(1000, 88);
start = Date.now();
for (let i = 0; i < 10000; i++) {
  let c = 0;
  for (const byte of medBuf) {
    c++;
  }
}
elapsed = Date.now() - start;
console.log(`10000次1000字节迭代: ${elapsed}ms`);
results.mediumBufferIteration = elapsed;

// 测试5: 扩展运算符
console.log('\n=== 测试5: 扩展运算符 ===');
const buf5k = Buffer.alloc(5000, 77);
start = Date.now();
const arr = [...buf5k];
elapsed = Date.now() - start;
console.log(`5K Buffer扩展运算符: ${elapsed}ms, length=${arr.length}`);
results.spreadOperator = elapsed;

// 测试6: 手动 next() 调用
console.log('\n=== 测试6: 手动next()调用 ===');
const buf1k = Buffer.alloc(1000, 55);
start = Date.now();
const iter = buf1k[Symbol.iterator]();
let result = iter.next();
let manualCount = 0;
while (!result.done) {
  manualCount++;
  result = iter.next();
}
elapsed = Date.now() - start;
console.log(`1000次手动next()调用: ${elapsed}ms, count=${manualCount}`);
results.manualNext = elapsed;

console.log('\n=== 总结 ===');
console.log(JSON.stringify(results, null, 2));

const finalResult = {
  success: true,
  diagnostics: results
};
console.log('\n' + JSON.stringify(finalResult, null, 2));
return finalResult;
