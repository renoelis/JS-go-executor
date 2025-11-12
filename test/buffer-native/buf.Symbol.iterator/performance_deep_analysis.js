// 深度性能分析 - 定位具体瓶颈
const { Buffer } = require('buffer');

const results = {};

console.log('=== 深度性能分析 ===\n');

// 测试1: 迭代器创建开销（空循环）
console.log('【测试1】迭代器创建开销');
const buf1k = Buffer.alloc(1000, 42);
let start = Date.now();
for (let i = 0; i < 10000; i++) {
  const iter = buf1k[Symbol.iterator]();
}
let elapsed = Date.now() - start;
console.log(`10000次迭代器创建: ${elapsed}ms`);
results.iteratorCreation10k = elapsed;

// 测试2: next() 调用开销（无数据访问）
console.log('\n【测试2】next() 调用开销');
const buf10 = Buffer.alloc(10, 1);
start = Date.now();
for (let i = 0; i < 10000; i++) {
  const iter = buf10[Symbol.iterator]();
  for (let j = 0; j < 10; j++) {
    iter.next(); // 10次 next()
  }
}
elapsed = Date.now() - start;
console.log(`100000次 next() 调用: ${elapsed}ms`);
console.log(`平均每次 next(): ${(elapsed / 100000).toFixed(4)}ms`);
results.next100k = elapsed;

// 测试3: 小Buffer高频迭代（测试缓存效果）
console.log('\n【测试3】小Buffer高频迭代');
const buf100 = Buffer.alloc(100, 99);
start = Date.now();
for (let i = 0; i < 10000; i++) {
  let sum = 0;
  for (const byte of buf100) {
    sum += byte;
  }
}
elapsed = Date.now() - start;
console.log(`10000次100字节迭代: ${elapsed}ms`);
results.smallBufferHighFreq = elapsed;

// 测试4: 中Buffer低频迭代
console.log('\n【测试4】中Buffer低频迭代');
const buf10k = Buffer.alloc(10000, 88);
start = Date.now();
for (let i = 0; i < 100; i++) {
  let sum = 0;
  for (const byte of buf10k) {
    sum += byte;
  }
}
elapsed = Date.now() - start;
console.log(`100次10000字节迭代: ${elapsed}ms`);
results.mediumBufferLowFreq = elapsed;

// 测试5: 纯JS对象创建开销（对照组）
console.log('\n【测试5】纯JS对象创建开销（对照组）');
start = Date.now();
for (let i = 0; i < 100000; i++) {
  const obj = { value: 42, done: false };
}
elapsed = Date.now() - start;
console.log(`100000次对象创建: ${elapsed}ms`);
results.jsObjectCreation = elapsed;

// 测试6: 空迭代器（测试协议开销）
console.log('\n【测试6】空Buffer迭代（协议开销）');
const bufEmpty = Buffer.alloc(0);
start = Date.now();
for (let i = 0; i < 100000; i++) {
  for (const byte of bufEmpty) {
    // 不应该执行
  }
}
elapsed = Date.now() - start;
console.log(`100000次空迭代: ${elapsed}ms`);
results.emptyIterator = elapsed;

// 测试7: 单字节Buffer（最小迭代）
console.log('\n【测试7】单字节Buffer迭代');
const buf1 = Buffer.from([123]);
start = Date.now();
for (let i = 0; i < 100000; i++) {
  for (const byte of buf1) {
    // 只执行一次
  }
}
elapsed = Date.now() - start;
console.log(`100000次单字节迭代: ${elapsed}ms`);
results.singleByteIterator = elapsed;

// 测试8: for...of vs 手动next()
console.log('\n【测试8】for...of vs 手动next()');
const buf1k2 = Buffer.alloc(1000, 77);

// for...of
start = Date.now();
for (let i = 0; i < 1000; i++) {
  let count = 0;
  for (const byte of buf1k2) {
    count++;
  }
}
const forOfTime = Date.now() - start;

// 手动 next()
start = Date.now();
for (let i = 0; i < 1000; i++) {
  let count = 0;
  const iter = buf1k2[Symbol.iterator]();
  let result = iter.next();
  while (!result.done) {
    count++;
    result = iter.next();
  }
}
const manualNextTime = Date.now() - start;

console.log(`for...of (1000次): ${forOfTime}ms`);
console.log(`手动next() (1000次): ${manualNextTime}ms`);
console.log(`差异: ${Math.abs(forOfTime - manualNextTime)}ms`);
results.forOfVsManual = { forOf: forOfTime, manual: manualNextTime };

// 测试9: 数组访问对比（baseline）
console.log('\n【测试9】普通数组迭代（baseline）');
const arr1k = new Array(1000).fill(42);
start = Date.now();
for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (const val of arr1k) {
    sum += val;
  }
}
elapsed = Date.now() - start;
console.log(`1000次1000元素数组迭代: ${elapsed}ms`);
results.arrayIteration = elapsed;

// 测试10: Buffer索引访问 vs 迭代
console.log('\n【测试10】Buffer索引访问 vs 迭代');
const buf1k3 = Buffer.alloc(1000, 55);

// 索引访问
start = Date.now();
for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (let j = 0; j < buf1k3.length; j++) {
    sum += buf1k3[j];
  }
}
const indexTime = Date.now() - start;

// 迭代访问
start = Date.now();
for (let i = 0; i < 1000; i++) {
  let sum = 0;
  for (const byte of buf1k3) {
    sum += byte;
  }
}
const iterTime = Date.now() - start;

console.log(`索引访问 (1000次): ${indexTime}ms`);
console.log(`迭代访问 (1000次): ${iterTime}ms`);
console.log(`迭代慢了: ${((iterTime / indexTime - 1) * 100).toFixed(1)}%`);
results.indexVsIter = { index: indexTime, iter: iterTime };

console.log('\n=== 分析总结 ===');
console.log(JSON.stringify(results, null, 2));

const finalResult = {
  success: true,
  analysis: results
};
console.log('\n' + JSON.stringify(finalResult, null, 2));
return finalResult;
