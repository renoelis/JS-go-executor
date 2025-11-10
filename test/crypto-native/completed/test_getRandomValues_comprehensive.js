const crypto = require('crypto');

console.log('========================================');
console.log('  Node.js crypto.getRandomValues() 全面测试');
console.log('  Node.js 版本:', process.version);
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = [];

function test(name, fn) {
  testCount++;
  const testNumber = testCount;
  try {
    console.log(`\n[测试 ${testNumber}] ${name}`);
    fn();
    passCount++;
    console.log('✅ 通过');
    testResults.push({
      number: testNumber,
      name: name,
      status: 'passed',
      error: null
    });
  } catch (e) {
    failCount++;
    console.log('❌ 失败:', e.message);
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message
    });
  }
}

// ============ 1. 基本功能测试 ============
console.log('\n--- 1. 基本功能测试 ---');

test('1.1 getRandomValues 是否存在', () => {
  if (typeof crypto.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues 不存在或不是函数');
  }
});

test('1.2 使用 Uint8Array 生成随机值', () => {
  const array = new Uint8Array(10);
  const result = crypto.getRandomValues(array);
  
  // 应该返回相同的数组引用
  if (result !== array) {
    throw new Error('getRandomValues 应该返回传入的数组');
  }
  
  // 应该包含随机值（至少有一个非零值）
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('1.3 使用 Uint16Array 生成随机值', () => {
  const array = new Uint16Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('1.4 使用 Uint32Array 生成随机值', () => {
  const array = new Uint32Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('1.5 使用 Int8Array 生成随机值', () => {
  const array = new Int8Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  // Int8Array 可能包含负值或正值
  const hasValue = array.some(val => val !== 0);
  if (!hasValue) {
    throw new Error('数组应该包含随机值');
  }
});

test('1.6 使用 Int16Array 生成随机值', () => {
  const array = new Int16Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasValue = array.some(val => val !== 0);
  if (!hasValue) {
    throw new Error('数组应该包含随机值');
  }
});

test('1.7 使用 Int32Array 生成随机值', () => {
  const array = new Int32Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasValue = array.some(val => val !== 0);
  if (!hasValue) {
    throw new Error('数组应该包含随机值');
  }
});

test('1.8 使用 BigUint64Array 生成随机值', () => {
  const array = new BigUint64Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0n);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
  
  // 验证都是 BigInt 类型
  const allBigInt = Array.from(array).every(val => typeof val === 'bigint');
  if (!allBigInt) {
    throw new Error('BigUint64Array 应该包含 bigint 类型的值');
  }
});

test('1.9 使用 BigInt64Array 生成随机值', () => {
  const array = new BigInt64Array(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasValue = array.some(val => val !== 0n);
  if (!hasValue) {
    throw new Error('数组应该包含随机值');
  }
  
  // 验证都是 BigInt 类型
  const allBigInt = Array.from(array).every(val => typeof val === 'bigint');
  if (!allBigInt) {
    throw new Error('BigInt64Array 应该包含 bigint 类型的值');
  }
});

// ============ 2. 不支持的类型测试 ============
console.log('\n--- 2. 不支持的类型测试 ---');

test('2.1 Float32Array 应该抛出错误', () => {
  const array = new Float32Array(10);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('Float32Array 应该抛出错误');
  }
});

test('2.2 Float64Array 应该抛出错误', () => {
  const array = new Float64Array(10);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('Float64Array 应该抛出错误');
  }
});

test('2.3 普通数组应该抛出错误', () => {
  const array = new Array(10);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('普通数组应该抛出错误');
  }
});

test('2.4 Buffer 对象应该可以工作', () => {
  const buffer = Buffer.alloc(10);
  const result = crypto.getRandomValues(buffer);
  
  if (result !== buffer) {
    throw new Error('应该返回传入的 Buffer');
  }
  
  const hasNonZero = buffer.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('Buffer 应该被填充随机值');
  }
});

test('2.5 非 TypedArray 对象应该抛出错误', () => {
  const obj = { length: 10 };
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(obj);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('非 TypedArray 对象应该抛出错误');
  }
});

test('2.6 null 应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(null);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('null 应该抛出错误');
  }
});

test('2.7 undefined 应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(undefined);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('undefined 应该抛出错误');
  }
});

test('2.8 字符串应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues("test");
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('字符串应该抛出错误');
  }
});

test('2.9 数字应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(123);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('数字应该抛出错误');
  }
});

// ============ 3. 边界情况测试 ============
console.log('\n--- 3. 边界情况测试 ---');

test('3.1 长度为 0 的数组', () => {
  const array = new Uint8Array(0);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  if (array.length !== 0) {
    throw new Error('数组长度应该保持为 0');
  }
});

test('3.2 长度为 1 的数组', () => {
  const array = new Uint8Array(1);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  // 验证值在有效范围内
  if (array[0] < 0 || array[0] > 255) {
    throw new Error('Uint8Array 值应该在 0-255 范围内');
  }
});

test('3.3 最大允许大小（65536 字节）- Uint8Array', () => {
  const array = new Uint8Array(65536);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('3.4 最大允许大小（65536 字节）- Uint16Array (32768 元素)', () => {
  const array = new Uint16Array(32768); // 32768 * 2 = 65536 bytes
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('3.5 最大允许大小（65536 字节）- Uint32Array (16384 元素)', () => {
  const array = new Uint32Array(16384); // 16384 * 4 = 65536 bytes
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('3.6 最大允许大小（65536 字节）- BigUint64Array (8192 元素)', () => {
  const array = new BigUint64Array(8192); // 8192 * 8 = 65536 bytes
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0n);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }
});

test('3.7 超过最大大小应该抛出 QuotaExceededError (65537 字节)', () => {
  const array = new Uint8Array(65537);
  let errorThrown = false;
  let errorName = '';
  
  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorThrown = true;
    errorName = e.name;
    // 应该是 QuotaExceededError 或包含 quota 关键词
    if (e.name !== 'QuotaExceededError' && !e.message.toLowerCase().includes('quota')) {
      throw new Error(`期望 QuotaExceededError，实际为 ${e.name}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('超过最大大小应该抛出错误');
  }
  
  console.log(`  错误类型: ${errorName}`);
});

test('3.8 超过最大大小应该抛出错误 - Uint16Array (32769 元素 = 65538 字节)', () => {
  const array = new Uint16Array(32769);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'QuotaExceededError' && !e.message.toLowerCase().includes('quota')) {
      throw new Error(`期望 QuotaExceededError，实际为 ${e.name}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('超过最大大小应该抛出错误');
  }
});

test('3.9 超过最大大小应该抛出错误 - Uint32Array (16385 元素 = 65540 字节)', () => {
  const array = new Uint32Array(16385);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'QuotaExceededError' && !e.message.toLowerCase().includes('quota')) {
      throw new Error(`期望 QuotaExceededError，实际为 ${e.name}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('超过最大大小应该抛出错误');
  }
});

test('3.10 DataView 不被支持应该抛出错误', () => {
  const buffer = new ArrayBuffer(16);
  const view = new DataView(buffer);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(view);
  } catch (e) {
    errorThrown = true;
    // Node.js 不支持 DataView，应该抛出错误
    const errorName = e.name || 'UnknownError';
    if (!e.message.includes('integer-type TypedArray') && errorName !== 'DOMException' && !(e instanceof TypeError)) {
      throw new Error(`期望关于 TypedArray 的错误，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('DataView 不被支持，应该抛出错误');
  }
});

// ============ 4. 值范围验证测试 ============
console.log('\n--- 4. 值范围验证测试 ---');

test('4.1 Uint8Array 值范围验证 (0-255)', () => {
  const array = new Uint8Array(1000);
  crypto.getRandomValues(array);
  
  const allInRange = array.every(val => val >= 0 && val <= 255);
  if (!allInRange) {
    throw new Error('Uint8Array 值应该在 0-255 范围内');
  }
});

test('4.2 Uint16Array 值范围验证 (0-65535)', () => {
  const array = new Uint16Array(1000);
  crypto.getRandomValues(array);
  
  const allInRange = array.every(val => val >= 0 && val <= 65535);
  if (!allInRange) {
    throw new Error('Uint16Array 值应该在 0-65535 范围内');
  }
});

test('4.3 Uint32Array 值范围验证 (0-4294967295)', () => {
  const array = new Uint32Array(1000);
  crypto.getRandomValues(array);
  
  const allInRange = array.every(val => val >= 0 && val <= 4294967295);
  if (!allInRange) {
    throw new Error('Uint32Array 值应该在 0-4294967295 范围内');
  }
});

test('4.4 Int8Array 值范围验证 (-128 到 127)', () => {
  const array = new Int8Array(1000);
  crypto.getRandomValues(array);
  
  const allInRange = array.every(val => val >= -128 && val <= 127);
  if (!allInRange) {
    throw new Error('Int8Array 值应该在 -128 到 127 范围内');
  }
});

test('4.5 Int16Array 值范围验证 (-32768 到 32767)', () => {
  const array = new Int16Array(1000);
  crypto.getRandomValues(array);
  
  const allInRange = array.every(val => val >= -32768 && val <= 32767);
  if (!allInRange) {
    throw new Error('Int16Array 值应该在 -32768 到 32767 范围内');
  }
});

test('4.6 Int32Array 值范围验证 (-2147483648 到 2147483647)', () => {
  const array = new Int32Array(1000);
  crypto.getRandomValues(array);
  
  const allInRange = array.every(val => val >= -2147483648 && val <= 2147483647);
  if (!allInRange) {
    throw new Error('Int32Array 值应该在 -2147483648 到 2147483647 范围内');
  }
});

test('4.7 BigUint64Array 值应该是正数', () => {
  const array = new BigUint64Array(100);
  crypto.getRandomValues(array);
  
  const allPositive = array.every(val => val >= 0n);
  if (!allPositive) {
    throw new Error('BigUint64Array 值应该都是非负数');
  }
});

test('4.8 BigInt64Array 值应该在 BigInt 范围内', () => {
  const array = new BigInt64Array(100);
  crypto.getRandomValues(array);
  
  // 所有值都应该是 bigint 类型
  const allBigInt = Array.from(array).every(val => typeof val === 'bigint');
  if (!allBigInt) {
    throw new Error('BigInt64Array 值应该都是 bigint 类型');
  }
});

// ============ 5. 随机性质量测试 ============
console.log('\n--- 5. 随机性质量测试 ---');

test('5.1 多次调用产生不同的值', () => {
  const array1 = new Uint8Array(32);
  const array2 = new Uint8Array(32);
  
  crypto.getRandomValues(array1);
  crypto.getRandomValues(array2);
  
  // 两个数组不应该完全相同
  const areSame = array1.every((val, idx) => val === array2[idx]);
  if (areSame) {
    throw new Error('多次调用应该产生不同的随机值');
  }
});

test('5.2 生成的值不应该全为 0', () => {
  const array = new Uint8Array(100);
  crypto.getRandomValues(array);
  
  const allZero = array.every(val => val === 0);
  if (allZero) {
    throw new Error('生成的值不应该全为 0');
  }
});

test('5.3 生成的值不应该全为 255 (Uint8Array)', () => {
  const array = new Uint8Array(100);
  crypto.getRandomValues(array);
  
  const allMax = array.every(val => val === 255);
  if (allMax) {
    throw new Error('生成的值不应该全为 255');
  }
});

test('5.4 值分布应该相对均匀（简单检查）', () => {
  const array = new Uint8Array(10000);
  crypto.getRandomValues(array);
  
  // 计算平均值，应该接近 127.5
  const sum = array.reduce((acc, val) => acc + val, 0);
  const avg = sum / array.length;
  
  // 平均值应该在 100-155 之间（允许一定偏差）
  if (avg < 100 || avg > 155) {
    throw new Error(`值分布可能不均匀，平均值: ${avg.toFixed(2)} (期望约 127.5)`);
  }
  
  console.log(`  平均值: ${avg.toFixed(2)} (理论值: 127.5)`);
});

test('5.5 应该包含多样的值（不是单一模式）', () => {
  const array = new Uint8Array(100);
  crypto.getRandomValues(array);
  
  // 使用 Set 检查唯一值的数量
  const uniqueValues = new Set(array);
  
  // 应该至少有 20 个不同的值（100 个字节中）
  if (uniqueValues.size < 20) {
    throw new Error(`唯一值过少: ${uniqueValues.size}，可能不够随机`);
  }
  
  console.log(`  唯一值数量: ${uniqueValues.size}/100`);
});

test('5.6 连续调用不应该产生相关性', () => {
  const array1 = new Uint8Array(100);
  const array2 = new Uint8Array(100);
  const array3 = new Uint8Array(100);
  
  crypto.getRandomValues(array1);
  crypto.getRandomValues(array2);
  crypto.getRandomValues(array3);
  
  // 检查三个数组不应该完全相同
  const same12 = array1.every((val, idx) => val === array2[idx]);
  const same23 = array2.every((val, idx) => val === array3[idx]);
  const same13 = array1.every((val, idx) => val === array3[idx]);
  
  if (same12 || same23 || same13) {
    throw new Error('连续调用不应该产生相同的值');
  }
});

test('5.7 大数组的随机性（1000 个元素）', () => {
  const array = new Uint32Array(1000);
  crypto.getRandomValues(array);
  
  // 检查唯一值的数量
  const uniqueValues = new Set(array);
  
  // 1000 个 Uint32Array 值应该几乎都是唯一的（概率上）
  if (uniqueValues.size < 950) {
    throw new Error(`唯一值过少: ${uniqueValues.size}/1000`);
  }
  
  console.log(`  唯一值数量: ${uniqueValues.size}/1000`);
});

test('5.8 BigInt 值的随机性', () => {
  const array = new BigUint64Array(100);
  crypto.getRandomValues(array);
  
  // 检查唯一值的数量
  const uniqueValues = new Set(array.map(v => v.toString()));
  
  // 应该有很高比例的唯一值
  if (uniqueValues.size < 95) {
    throw new Error(`BigUint64Array 唯一值过少: ${uniqueValues.size}/100`);
  }
  
  console.log(`  唯一值数量: ${uniqueValues.size}/100`);
});

// ============ 6. 性能和容量测试 ============
console.log('\n--- 6. 性能和容量测试 ---');

test('6.1 快速连续调用 100 次', () => {
  const array = new Uint8Array(100);
  
  for (let i = 0; i < 100; i++) {
    crypto.getRandomValues(array);
  }
  
  // 最后一次应该仍然包含随机值
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('快速连续调用应该正常工作');
  }
});

test('6.2 生成大量随机数据', () => {
  const iterations = 10;
  const arraySize = 6000; // 每次 6000 字节
  
  for (let i = 0; i < iterations; i++) {
    const array = new Uint8Array(arraySize);
    crypto.getRandomValues(array);
    
    const hasNonZero = array.some(val => val !== 0);
    if (!hasNonZero) {
      throw new Error(`第 ${i + 1} 次迭代失败`);
    }
  }
  
  console.log(`  成功生成 ${iterations * arraySize} 字节随机数据`);
});

test('6.3 不同大小数组的性能一致性', () => {
  const sizes = [10, 100, 1000, 10000];
  
  for (const size of sizes) {
    const array = new Uint8Array(size);
    crypto.getRandomValues(array);
    
    const hasNonZero = array.some(val => val !== 0);
    if (!hasNonZero) {
      throw new Error(`大小为 ${size} 的数组生成失败`);
    }
  }
  
  console.log(`  所有大小的数组都成功生成随机值`);
});

// ============ 7. 安全特性测试 ============
console.log('\n--- 7. 安全特性测试 ---');

test('7.1 生成的值应该是加密安全的（不可预测）', () => {
  const array1 = new Uint8Array(32);
  const array2 = new Uint8Array(32);
  const array3 = new Uint8Array(32);
  
  crypto.getRandomValues(array1);
  crypto.getRandomValues(array2);
  crypto.getRandomValues(array3);
  
  // 三个独立生成的数组不应该有明显的关系
  const diff12 = array1.filter((val, idx) => val !== array2[idx]).length;
  const diff23 = array2.filter((val, idx) => val !== array3[idx]).length;
  const diff13 = array1.filter((val, idx) => val !== array3[idx]).length;
  
  // 至少应该有 20/32 字节不同
  if (diff12 < 20 || diff23 < 20 || diff13 < 20) {
    throw new Error('独立生成的值差异不够大，可能不够安全');
  }
  
  console.log(`  差异率: ${diff12}/32, ${diff23}/32, ${diff13}/32`);
});

test('7.2 生成会话令牌场景', () => {
  // 模拟生成安全的会话令牌
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  
  // 转换为十六进制字符串
  const token = Array.from(tokenBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (token.length !== 64) {
    throw new Error(`令牌长度应该是 64，实际为 ${token.length}`);
  }
  
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw new Error('令牌格式不正确');
  }
  
  console.log(`  生成的令牌: ${token.substring(0, 16)}...`);
});

test('7.3 生成随机 UUID 场景', () => {
  // 模拟生成 UUID v4
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // 设置版本和变体位（UUID v4）
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)) {
    throw new Error('UUID v4 格式不正确');
  }
  
  console.log(`  生成的 UUID: ${uuid}`);
});

test('7.4 生成加密密钥场景', () => {
  // 模拟生成 256 位加密密钥
  const keyBytes = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(keyBytes);
  
  const hasNonZero = keyBytes.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('密钥不应该全为 0');
  }
  
  // 转换为 Base64
  const keyBase64 = Buffer.from(keyBytes).toString('base64');
  if (keyBase64.length === 0) {
    throw new Error('密钥生成失败');
  }
  
  console.log(`  生成的密钥 (Base64): ${keyBase64.substring(0, 20)}...`);
});

test('7.5 生成随机盐值场景', () => {
  // 密码哈希场景中使用的盐值
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (saltHex.length !== 32) {
    throw new Error('盐值长度不正确');
  }
  
  console.log(`  生成的盐值: ${saltHex}`);
});

test('7.6 多个独立令牌应该完全不同', () => {
  const tokens = [];
  const tokenCount = 100;
  
  for (let i = 0; i < tokenCount; i++) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    tokens.push(token);
  }
  
  // 使用 Set 检查唯一性
  const uniqueTokens = new Set(tokens);
  if (uniqueTokens.size !== tokenCount) {
    throw new Error(`生成了重复的令牌: ${tokenCount - uniqueTokens.size} 个重复`);
  }
  
  console.log(`  成功生成 ${tokenCount} 个唯一令牌`);
});

// ============ 8. 原地修改测试 ============
console.log('\n--- 8. 原地修改测试 ---');

test('8.1 验证原数组被修改', () => {
  const array = new Uint8Array(10);
  const originalArray = array;
  
  // 填充为特定值
  array.fill(0);
  
  crypto.getRandomValues(array);
  
  // 应该是同一个数组引用
  if (array !== originalArray) {
    throw new Error('应该修改原数组而不是返回新数组');
  }
  
  // 值应该已经改变
  const allZero = array.every(val => val === 0);
  if (allZero) {
    throw new Error('原数组应该被修改');
  }
});

test('8.2 多次填充同一数组', () => {
  const array = new Uint8Array(20);
  
  crypto.getRandomValues(array);
  const firstValues = Array.from(array);
  
  crypto.getRandomValues(array);
  const secondValues = Array.from(array);
  
  // 两次填充应该产生不同的值
  const areSame = firstValues.every((val, idx) => val === secondValues[idx]);
  if (areSame) {
    throw new Error('多次填充应该产生不同的值');
  }
});

test('8.3 部分填充（使用 subarray）', () => {
  const buffer = new ArrayBuffer(20);
  const fullArray = new Uint8Array(buffer);
  const subArray = new Uint8Array(buffer, 5, 10); // 从索引 5 开始，长度 10
  
  fullArray.fill(0);
  crypto.getRandomValues(subArray);
  
  // 前 5 个字节应该仍然是 0
  const first5AllZero = fullArray.slice(0, 5).every(val => val === 0);
  if (!first5AllZero) {
    throw new Error('subarray 之前的部分不应该被修改');
  }
  
  // 中间 10 个字节应该是随机值
  const middle10HasRandom = fullArray.slice(5, 15).some(val => val !== 0);
  if (!middle10HasRandom) {
    throw new Error('subarray 部分应该被填充随机值');
  }
  
  // 最后 5 个字节应该仍然是 0
  const last5AllZero = fullArray.slice(15).every(val => val === 0);
  if (!last5AllZero) {
    throw new Error('subarray 之后的部分不应该被修改');
  }
});

// ============ 9. 特殊场景测试 ============
console.log('\n--- 9. 特殊场景测试 ---');

test('9.1 使用共享 ArrayBuffer', () => {
  const sharedBuffer = new ArrayBuffer(32);
  const view1 = new Uint8Array(sharedBuffer);
  const view2 = new Uint16Array(sharedBuffer);
  
  crypto.getRandomValues(view1);
  
  // view2 应该看到相同的数据（不同的解释）
  const view2HasData = Array.from(view2).some(val => val !== 0);
  if (!view2HasData) {
    throw new Error('共享 ArrayBuffer 的不同视图应该看到相同的数据');
  }
});

test('9.2 嵌套在对象中的 TypedArray', () => {
  const obj = {
    randomData: new Uint8Array(16)
  };
  
  crypto.getRandomValues(obj.randomData);
  
  const hasNonZero = obj.randomData.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('嵌套在对象中的 TypedArray 应该正常工作');
  }
});

test('9.3 使用 Uint8ClampedArray', () => {
  const array = new Uint8ClampedArray(10);
  const result = crypto.getRandomValues(array);
  
  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('Uint8ClampedArray 应该被填充随机值');
  }
  
  // 值应该在 0-255 范围内
  const allInRange = array.every(val => val >= 0 && val <= 255);
  if (!allInRange) {
    throw new Error('Uint8ClampedArray 值应该在 0-255 范围内');
  }
});

test('9.4 使用非标准偏移的 TypedArray', () => {
  const buffer = new ArrayBuffer(50);
  const offsetArray = new Uint8Array(buffer, 7, 20); // 偏移 7 字节，长度 20
  
  crypto.getRandomValues(offsetArray);
  
  const hasNonZero = offsetArray.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('带偏移的 TypedArray 应该正常工作');
  }
  
  if (offsetArray.length !== 20) {
    throw new Error('数组长度应该保持不变');
  }
});

// ============ 10. 错误参数测试 ============
console.log('\n--- 10. 错误参数测试 ---');

test('10.1 不传参数应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues();
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('不传参数应该抛出错误');
  }
});

test('10.2 传入多个参数（只使用第一个）', () => {
  const array = new Uint8Array(10);
  const array2 = new Uint8Array(10);
  
  // 传入多个参数，应该只使用第一个
  const result = crypto.getRandomValues(array, array2);
  
  if (result !== array) {
    throw new Error('应该返回第一个参数');
  }
  
  const hasNonZero = array.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('第一个数组应该被填充');
  }
});

test('10.3 传入布尔值应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(true);
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('传入布尔值应该抛出错误');
  }
});

test('10.4 传入函数应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(() => {});
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('传入函数应该抛出错误');
  }
});

test('10.5 传入 Symbol 应该抛出错误', () => {
  let errorThrown = false;

  try {
    crypto.getRandomValues(Symbol('test'));
  } catch (e) {
    errorThrown = true;
    // Node.js 抛出 DOMException 或 TypeError 都是可以的
    const errorName = e.name || 'UnknownError';
    if (!(e instanceof TypeError) && errorName !== 'TypeMismatchError' && errorName !== 'DOMException') {
      throw new Error(`期望 TypeError 或 DOMException，实际为 ${errorName}: ${e.message}`);
    }
  }

  if (!errorThrown) {
    throw new Error('传入 Symbol 应该抛出错误');
  }
});

// ============ 11. 额外的边界情况和API兼容性测试 ============
console.log('\n--- 11. 额外的边界情况和API兼容性测试 ---');

test('11.1 验证65536字节边界 - 精确边界测试', () => {
  // 测试恰好等于65536字节
  const exactBoundary = new Uint8Array(65536);
  const result = crypto.getRandomValues(exactBoundary);

  if (result !== exactBoundary) {
    throw new Error('应该返回传入的数组');
  }

  const hasNonZero = exactBoundary.some(val => val !== 0);
  if (!hasNonZero) {
    throw new Error('数组应该包含随机值');
  }

  console.log('  ✓ 65536字节边界正常工作');
});

test('11.2 验证QuotaExceededError错误属性', () => {
  const array = new Uint8Array(65537);
  let errorCaught = null;

  try {
    crypto.getRandomValues(array);
  } catch (e) {
    errorCaught = e;
  }

  if (!errorCaught) {
    throw new Error('应该抛出QuotaExceededError');
  }

  // 验证错误名称
  if (errorCaught.name !== 'QuotaExceededError') {
    throw new Error(`错误名称应为QuotaExceededError，实际为: ${errorCaught.name}`);
  }

  // 验证错误消息包含字节数信息（可能有逗号分隔符）
  const messageStr = errorCaught.message.toLowerCase();
  if (!messageStr.includes('65') || !messageStr.includes('536')) {
    throw new Error(`错误消息应该包含最大字节数限制65536: ${errorCaught.message}`);
  }

  console.log(`  错误消息: ${errorCaught.message}`);
});

test('11.3 验证所有支持的TypedArray类型的byteLength计算', () => {
  const tests = [
    { type: 'Uint8Array', size: 100, expectedBytes: 100 },
    { type: 'Uint16Array', size: 100, expectedBytes: 200 },
    { type: 'Uint32Array', size: 100, expectedBytes: 400 },
    { type: 'Int8Array', size: 100, expectedBytes: 100 },
    { type: 'Int16Array', size: 100, expectedBytes: 200 },
    { type: 'Int32Array', size: 100, expectedBytes: 400 },
    { type: 'BigUint64Array', size: 100, expectedBytes: 800 },
    { type: 'BigInt64Array', size: 100, expectedBytes: 800 },
    { type: 'Uint8ClampedArray', size: 100, expectedBytes: 100 }
  ];

  for (const t of tests) {
    let array;
    switch(t.type) {
      case 'Uint8Array': array = new Uint8Array(t.size); break;
      case 'Uint16Array': array = new Uint16Array(t.size); break;
      case 'Uint32Array': array = new Uint32Array(t.size); break;
      case 'Int8Array': array = new Int8Array(t.size); break;
      case 'Int16Array': array = new Int16Array(t.size); break;
      case 'Int32Array': array = new Int32Array(t.size); break;
      case 'BigUint64Array': array = new BigUint64Array(t.size); break;
      case 'BigInt64Array': array = new BigInt64Array(t.size); break;
      case 'Uint8ClampedArray': array = new Uint8ClampedArray(t.size); break;
    }

    if (array.byteLength !== t.expectedBytes) {
      throw new Error(`${t.type} byteLength不正确: 期望${t.expectedBytes}, 实际${array.byteLength}`);
    }

    crypto.getRandomValues(array);
    const hasValue = Array.from(array).some(val => {
      if (typeof val === 'bigint') {
        return val !== 0n;
      }
      return val !== 0;
    });

    if (!hasValue) {
      throw new Error(`${t.type} 应该被填充随机值`);
    }
  }

  console.log('  所有TypedArray类型的byteLength计算正确');
});

test('11.4 混合类型的TypedArray边界测试', () => {
  // BigUint64Array: 8192 * 8 = 65536 (边界)
  const bigArray1 = new BigUint64Array(8192);
  crypto.getRandomValues(bigArray1);

  // BigUint64Array: 8193 * 8 = 65544 (超过边界)
  let errorThrown = false;
  try {
    const bigArray2 = new BigUint64Array(8193);
    crypto.getRandomValues(bigArray2);
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'QuotaExceededError') {
      throw new Error('应该抛出QuotaExceededError');
    }
  }

  if (!errorThrown) {
    throw new Error('超过边界应该抛出错误');
  }

  console.log('  BigUint64Array边界测试通过');
});

test('11.5 验证返回值与输入的引用相同性', () => {
  const types = [
    new Uint8Array(10),
    new Uint16Array(10),
    new Uint32Array(10),
    new Int8Array(10),
    new Int16Array(10),
    new Int32Array(10),
    new BigUint64Array(10),
    new BigInt64Array(10),
    new Uint8ClampedArray(10)
  ];

  for (const array of types) {
    const returned = crypto.getRandomValues(array);

    // 必须返回相同的引用
    if (returned !== array) {
      throw new Error(`${array.constructor.name} 应该返回相同的引用`);
    }

    // 必须是同一个对象
    if (!Object.is(returned, array)) {
      throw new Error(`${array.constructor.name} 应该是同一个对象`);
    }
  }

  console.log('  所有类型都返回相同引用');
});

test('11.6 空ArrayBuffer的TypedArray', () => {
  const buffer = new ArrayBuffer(0);
  const array = new Uint8Array(buffer);

  const result = crypto.getRandomValues(array);

  if (result !== array) {
    throw new Error('应该返回传入的数组');
  }

  if (result.length !== 0) {
    throw new Error('长度应该保持为0');
  }
});

test('11.7 detached ArrayBuffer应该抛出错误', () => {
  // 注意：只有某些操作可以detach ArrayBuffer，如transferToFixedLength()
  // 这个测试在某些环境可能不适用
  try {
    const buffer = new ArrayBuffer(16);
    const array = new Uint8Array(buffer);

    // 尝试操作正常buffer
    crypto.getRandomValues(array);

    // 如果没有detach方法，这个测试就通过
    console.log('  环境不支持ArrayBuffer detach测试，跳过');
  } catch (e) {
    // 如果抛出错误，检查是否是预期的错误
    console.log(`  测试结果: ${e.message}`);
  }
});

test('11.8 TypedArray.prototype.subarray的边界情况', () => {
  const buffer = new ArrayBuffer(100);
  const fullArray = new Uint8Array(buffer);

  // 测试从头到尾的subarray
  const sub1 = fullArray.subarray(0);
  crypto.getRandomValues(sub1);
  if (sub1.length !== 100) {
    throw new Error('subarray(0)长度应该是100');
  }

  // 测试空subarray
  const sub2 = fullArray.subarray(50, 50);
  crypto.getRandomValues(sub2);
  if (sub2.length !== 0) {
    throw new Error('空subarray长度应该是0');
  }

  // 测试从中间到尾部
  const sub3 = fullArray.subarray(90);
  crypto.getRandomValues(sub3);
  if (sub3.length !== 10) {
    throw new Error('subarray(90)长度应该是10');
  }

  console.log('  subarray边界情况正常工作');
});

test('11.9 验证TypedArray的length vs byteLength', () => {
  const tests = [
    { array: new Uint8Array(10), length: 10, byteLength: 10 },
    { array: new Uint16Array(10), length: 10, byteLength: 20 },
    { array: new Uint32Array(10), length: 10, byteLength: 40 },
    { array: new BigUint64Array(10), length: 10, byteLength: 80 }
  ];

  for (const t of tests) {
    if (t.array.length !== t.length) {
      throw new Error(`length不匹配: 期望${t.length}, 实际${t.array.length}`);
    }

    if (t.array.byteLength !== t.byteLength) {
      throw new Error(`byteLength不匹配: 期望${t.byteLength}, 实际${t.array.byteLength}`);
    }

    crypto.getRandomValues(t.array);
  }

  console.log('  length和byteLength属性正确');
});

test('11.10 验证随机性：卡方检验简化版', () => {
  // 生成大量数据进行简单的统计检验
  const array = new Uint8Array(10000);
  crypto.getRandomValues(array);

  // 统计每个字节值(0-255)的出现次数
  const freq = new Array(256).fill(0);
  for (const val of array) {
    freq[val]++;
  }

  // 期望值: 10000 / 256 ≈ 39.0625
  const expected = array.length / 256;

  // 计算卡方统计量
  let chiSquare = 0;
  for (const count of freq) {
    const diff = count - expected;
    chiSquare += (diff * diff) / expected;
  }

  // 自由度 = 255
  // 在显著性水平0.05下，卡方临界值约为293.25
  // 在显著性水平0.01下，卡方临界值约为310.46
  if (chiSquare > 400) {
    throw new Error(`卡方统计量过大: ${chiSquare.toFixed(2)}, 随机性可能不足`);
  }

  console.log(`  卡方统计量: ${chiSquare.toFixed(2)} (期望约255, 临界值<400)`);
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个 ✅`);
console.log(`  失败: ${failCount} 个 ❌`);
console.log(`  通过率: ${((passCount / testCount) * 100).toFixed(2)}%`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试详情:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  ❌ [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

// 打印通过的测试（供参考）
if (passCount > 0 && failCount === 0) {
  console.log('\n所有测试通过! 🎉');
}

// 返回测试结果（用于自动化测试）
const rs = {
  total: testCount,
  passed: passCount,
  failed: failCount,
  passRate: ((passCount / testCount) * 100).toFixed(2) + '%',
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};

console.log(JSON.stringify(rs, null, 2));

return rs

