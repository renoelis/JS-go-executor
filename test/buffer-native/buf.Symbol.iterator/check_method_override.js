// 检查我们的方法是否覆盖了 goja 内置方法
const { Buffer } = require('buffer');

console.log('=== 检查方法是否被覆盖 ===\n');

// 创建纯 Uint8Array（没有经过我们的增强）
const uint8 = new Uint8Array([1, 2, 3, 4, 5]);

// 创建 Buffer（经过我们的增强）
const buf = Buffer.from([1, 2, 3, 4, 5]);

console.log('【测试1：功能是否一致】\n');

// 测试 forEach
console.log('1️⃣ forEach 测试');
let uint8Sum = 0;
let bufSum = 0;
uint8.forEach(byte => uint8Sum += byte);
buf.forEach(byte => bufSum += byte);
console.log(`   Uint8Array: ${uint8Sum}`);
console.log(`   Buffer: ${bufSum}`);
console.log(`   一致: ${uint8Sum === bufSum ? '✅' : '❌'}\n`);

// 测试 map
console.log('2️⃣ map 测试');
const uint8Mapped = uint8.map(byte => byte * 2);
const bufMapped = buf.map(byte => byte * 2);
console.log(`   Uint8Array: [${Array.from(uint8Mapped).join(', ')}]`);
console.log(`   Buffer: [${Array.from(bufMapped).join(', ')}]`);
console.log(`   一致: ${Array.from(uint8Mapped).join(',') === Array.from(bufMapped).join(',') ? '✅' : '❌'}\n`);

// 测试 reduce
console.log('3️⃣ reduce 测试');
const uint8Reduced = uint8.reduce((acc, byte) => acc + byte, 0);
const bufReduced = buf.reduce((acc, byte) => acc + byte, 0);
console.log(`   Uint8Array: ${uint8Reduced}`);
console.log(`   Buffer: ${bufReduced}`);
console.log(`   一致: ${uint8Reduced === bufReduced ? '✅' : '❌'}\n`);

// 测试 filter
console.log('4️⃣ filter 测试');
const uint8Filtered = uint8.filter(byte => byte > 2);
const bufFiltered = buf.filter(byte => byte > 2);
console.log(`   Uint8Array: [${Array.from(uint8Filtered).join(', ')}]`);
console.log(`   Buffer: [${Array.from(bufFiltered).join(', ')}]`);
console.log(`   一致: ${Array.from(uint8Filtered).join(',') === Array.from(bufFiltered).join(',') ? '✅' : '❌'}\n`);

console.log('【测试2：性能对比】\n');

// 大数组测试
const largeBuf = Buffer.alloc(10000, 42);
const largeUint8 = new Uint8Array(10000);
largeUint8.fill(42);

console.log('测试数据大小: 10000 字节\n');

// forEach 性能
let start = Date.now();
let sum1 = 0;
largeUint8.forEach(byte => sum1 += byte);
const uint8Time = Date.now() - start;

start = Date.now();
let sum2 = 0;
largeBuf.forEach(byte => sum2 += byte);
const bufTime = Date.now() - start;

console.log('forEach 性能:');
console.log(`   Uint8Array: ${uint8Time}ms`);
console.log(`   Buffer: ${bufTime}ms`);
console.log(`   差异: ${bufTime > uint8Time ? '+' : ''}${bufTime - uint8Time}ms`);
console.log(`   Buffer ${bufTime < uint8Time ? '更快' : '更慢'} ${Math.abs(((bufTime - uint8Time) / uint8Time * 100)).toFixed(1)}%\n`);

// reduce 性能
start = Date.now();
const sum3 = largeUint8.reduce((acc, byte) => acc + byte, 0);
const uint8ReduceTime = Date.now() - start;

start = Date.now();
const sum4 = largeBuf.reduce((acc, byte) => acc + byte, 0);
const bufReduceTime = Date.now() - start;

console.log('reduce 性能:');
console.log(`   Uint8Array: ${uint8ReduceTime}ms`);
console.log(`   Buffer: ${bufReduceTime}ms`);
console.log(`   差异: ${bufReduceTime > uint8ReduceTime ? '+' : ''}${bufReduceTime - uint8ReduceTime}ms`);
console.log(`   Buffer ${bufReduceTime < uint8ReduceTime ? '更快' : '更慢'} ${Math.abs(((bufReduceTime - uint8ReduceTime) / uint8ReduceTime * 100)).toFixed(1)}%\n`);

console.log('【结论】\n');
console.log('✅ goja 已经内置了这些方法（在 TypedArray.prototype 上）');
console.log('✅ Buffer 继承自 Uint8Array，所以也有这些方法');
console.log('❓ 我们的实现是否覆盖了 goja 内置的？');
console.log('   - 如果性能相同 → 可能没覆盖，用的是 goja 内置');
console.log('   - 如果性能不同 → 可能覆盖了，用的是我们的实现');

const result = {
  success: true,
  gojaHasBuiltin: true,
  bufferInheritsFromUint8Array: true,
  performanceComparison: {
    forEach: {
      uint8Time,
      bufTime,
      difference: bufTime - uint8Time
    },
    reduce: {
      uint8Time: uint8ReduceTime,
      bufTime: bufReduceTime,
      difference: bufReduceTime - uint8ReduceTime
    }
  }
};

console.log('\n' + JSON.stringify(result, null, 2));
return result;
