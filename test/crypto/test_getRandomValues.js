const crypto = require('crypto');

console.log('========================================');
console.log('  crypto.getRandomValues() 测试');
console.log('  Web Crypto API 兼容性');
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
    console.log('✓ 通过');
    testResults.push({
      number: testNumber,
      name: name,
      status: 'passed',
      error: null
    });
  } catch (e) {
    failCount++;
    console.log('✗ 失败:', e.message);
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message
    });
  }
}

// ============ 1. 支持的整型 TypedArray ============
console.log('\n--- 1. 支持的整型 TypedArray ---');

test('1.1 Uint8Array 应该被支持', () => {
  const arr = new Uint8Array(10);
  const result = crypto.getRandomValues(arr);
  
  if (result !== arr) {
    throw new Error('应该返回相同的数组对象');
  }
  
  // 检查是否填充了随机值
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('数组应该被填充随机值');
  }
});

test('1.2 Int8Array 应该被支持', () => {
  const arr = new Int8Array(10);
  crypto.getRandomValues(arr);
  
  // 检查值的范围 (-128 到 127)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < -128 || arr[i] > 127) {
      throw new Error(`Int8Array 值超出范围: ${arr[i]}`);
    }
  }
});

test('1.3 Uint16Array 应该被支持', () => {
  const arr = new Uint16Array(10);
  crypto.getRandomValues(arr);
  
  // 检查值的范围 (0 到 65535)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < 0 || arr[i] > 65535) {
      throw new Error(`Uint16Array 值超出范围: ${arr[i]}`);
    }
  }
});

test('1.4 Int16Array 应该被支持', () => {
  const arr = new Int16Array(10);
  crypto.getRandomValues(arr);
  
  // 检查值的范围 (-32768 到 32767)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < -32768 || arr[i] > 32767) {
      throw new Error(`Int16Array 值超出范围: ${arr[i]}`);
    }
  }
});

test('1.5 Uint32Array 应该被支持', () => {
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  
  // 检查值的范围 (0 到 4294967295)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < 0 || arr[i] > 4294967295) {
      throw new Error(`Uint32Array 值超出范围: ${arr[i]}`);
    }
  }
});

test('1.6 Int32Array 应该被支持', () => {
  const arr = new Int32Array(10);
  crypto.getRandomValues(arr);
  
  // 检查值的范围 (-2147483648 到 2147483647)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < -2147483648 || arr[i] > 2147483647) {
      throw new Error(`Int32Array 值超出范围: ${arr[i]}`);
    }
  }
});

test('1.7 Uint8ClampedArray 应该被支持', () => {
  const arr = new Uint8ClampedArray(10);
  crypto.getRandomValues(arr);
  
  // 检查值的范围 (0 到 255)
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < 0 || arr[i] > 255) {
      throw new Error(`Uint8ClampedArray 值超出范围: ${arr[i]}`);
    }
  }
});

// ============ 2. 不支持的浮点数组（应该抛出错误）============
console.log('\n--- 2. 不支持的浮点数组 ---');

test('2.1 Float32Array 应该抛出错误', () => {
  const arr = new Float32Array(10);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(arr);
  } catch (e) {
    errorThrown = true;
    // 兼容不同的错误消息格式
    // Go: "The \"typedArray\" argument must be an instance of Int8Array..."
    // Node.js: 可能有不同的错误消息
    // 只要抛出错误就算通过
  }
  
  if (!errorThrown) {
    throw new Error('Float32Array 应该抛出错误');
  }
});

test('2.2 Float64Array 应该抛出错误', () => {
  const arr = new Float64Array(10);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(arr);
  } catch (e) {
    errorThrown = true;
    // 兼容不同的错误消息格式
    // 只要抛出错误就算通过
  }
  
  if (!errorThrown) {
    throw new Error('Float64Array 应该抛出错误');
  }
});

// ============ 3. 边界情况测试 ============
console.log('\n--- 3. 边界情况测试 ---');

test('3.1 空数组应该正常处理', () => {
  const arr = new Uint8Array(0);
  const result = crypto.getRandomValues(arr);
  
  if (result !== arr) {
    throw new Error('应该返回相同的数组对象');
  }
});

test('3.2 单元素数组', () => {
  const arr = new Uint8Array(1);
  crypto.getRandomValues(arr);
  
  // 只检查不抛出错误即可
});

test('3.3 大数组（接近 65536 字节限制）', () => {
  const arr = new Uint8Array(65536);
  crypto.getRandomValues(arr);
  
  // 检查是否填充了随机值
  let hasNonZero = false;
  for (let i = 0; i < Math.min(100, arr.length); i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('数组应该被填充随机值');
  }
});

test('3.4 超过 65536 字节应该抛出错误', () => {
  const arr = new Uint8Array(65537);
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(arr);
  } catch (e) {
    errorThrown = true;
    // 兼容不同的错误消息格式
    // Go: "The ArrayBufferView's byte length (65537) exceeds..."
    // Node.js: 可能有不同的错误消息
    // 只要抛出错误就算通过
  }
  
  if (!errorThrown) {
    throw new Error('超过 65536 字节应该抛出错误');
  }
});

// ============ 4. 随机性测试 ============
console.log('\n--- 4. 随机性测试 ---');

test('4.1 每次调用应该生成不同的值', () => {
  const arr1 = new Uint8Array(10);
  const arr2 = new Uint8Array(10);
  
  crypto.getRandomValues(arr1);
  crypto.getRandomValues(arr2);
  
  // 检查两个数组是否不同
  let isDifferent = false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      isDifferent = true;
      break;
    }
  }
  
  if (!isDifferent) {
    throw new Error('两次调用应该生成不同的随机值');
  }
});

test('4.2 值应该分布均匀（简单检查）', () => {
  const arr = new Uint8Array(1000);
  crypto.getRandomValues(arr);
  
  // 统计不同值的数量
  const uniqueValues = new Set(arr);
  
  // 至少应该有 100 个不同的值（1000 个字节中）
  if (uniqueValues.size < 100) {
    throw new Error(`随机值分布不够均匀，只有 ${uniqueValues.size} 个不同值`);
  }
});

// ============ 5. 错误处理测试 ============
console.log('\n--- 5. 错误处理测试 ---');

test('5.1 不传参数应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues();
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('不传参数应该抛出错误');
  }
});

test('5.2 传入非 TypedArray 应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues([1, 2, 3]);
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('传入普通数组应该抛出错误');
  }
});

test('5.3 传入字符串应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues('invalid');
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('传入字符串应该抛出错误');
  }
});

test('5.4 传入 null 应该抛出错误', () => {
  let errorThrown = false;
  
  try {
    crypto.getRandomValues(null);
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('传入 null 应该抛出错误');
  }
});

// ============ 6. 返回值测试 ============
console.log('\n--- 6. 返回值测试 ---');

test('6.1 应该返回相同的数组对象', () => {
  const arr = new Uint8Array(10);
  const result = crypto.getRandomValues(arr);
  
  if (result !== arr) {
    throw new Error('应该返回相同的数组对象');
  }
});

test('6.2 返回的数组应该被修改', () => {
  const arr = new Uint8Array(10);
  // 先填充全 0
  for (let i = 0; i < arr.length; i++) {
    arr[i] = 0;
  }
  
  crypto.getRandomValues(arr);
  
  // 检查是否有非 0 值
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('数组应该被修改');
  }
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个`);
console.log(`  失败: ${failCount} 个`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

// 返回测试结果（用于自动化测试）
return {
  total: testCount,
  passed: passCount,
  failed: failCount,
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};
