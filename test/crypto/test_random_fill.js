const crypto = require('crypto');

console.log('========================================');
console.log('  crypto.randomFillSync/randomFill 测试');
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

// ============ 1. randomFillSync 基本功能测试 ============
console.log('\n--- 1. randomFillSync 基本功能测试 ---');

test('1.1 填充整个 Buffer', () => {
  const buf = Buffer.alloc(16);
  const result = crypto.randomFillSync(buf);
  
  if (result !== buf) {
    throw new Error('应该返回相同的 buffer');
  }
  
  // 检查是否被填充（不全是 0）
  let hasNonZero = false;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('buffer 应该被随机数填充');
  }
});

test('1.2 填充 Uint8Array', () => {
  const arr = new Uint8Array(16);
  const result = crypto.randomFillSync(arr);
  
  if (result !== arr) {
    throw new Error('应该返回相同的数组');
  }
  
  let hasNonZero = false;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('数组应该被随机数填充');
  }
});

test('1.3 使用 offset 参数', () => {
  const buf = Buffer.alloc(16);
  crypto.randomFillSync(buf, 8);
  
  // 前 8 字节应该是 0
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) {
      throw new Error(`buf[${i}] 应该是 0`);
    }
  }
  
  // 后 8 字节应该有随机数
  let hasNonZero = false;
  for (let i = 8; i < 16; i++) {
    if (buf[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('后半部分应该被随机数填充');
  }
});

test('1.4 使用 offset 和 size 参数', () => {
  const buf = Buffer.alloc(16);
  crypto.randomFillSync(buf, 4, 8);
  
  // 前 4 字节应该是 0
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0) {
      throw new Error(`buf[${i}] 应该是 0`);
    }
  }
  
  // 后 4 字节应该是 0
  for (let i = 12; i < 16; i++) {
    if (buf[i] !== 0) {
      throw new Error(`buf[${i}] 应该是 0`);
    }
  }
  
  // 中间 8 字节应该有随机数
  let hasNonZero = false;
  for (let i = 4; i < 12; i++) {
    if (buf[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('中间部分应该被随机数填充');
  }
});

// ============ 2. randomInt 基本功能测试 ============
console.log('\n--- 2. randomInt 基本功能测试 ---');

test('2.1 生成 0 到 max 的随机数', () => {
  const max = 100;
  const result = crypto.randomInt(max);
  
  if (typeof result !== 'number') {
    throw new Error('应该返回数字');
  }
  
  if (result < 0 || result >= max) {
    throw new Error(`结果 ${result} 应该在 [0, ${max}) 范围内`);
  }
});

test('2.2 生成 min 到 max 的随机数', () => {
  const min = 50;
  const max = 100;
  const result = crypto.randomInt(min, max);
  
  if (result < min || result >= max) {
    throw new Error(`结果 ${result} 应该在 [${min}, ${max}) 范围内`);
  }
});

test('2.3 多次生成应该有不同的值', () => {
  const results = new Set();
  for (let i = 0; i < 100; i++) {
    results.add(crypto.randomInt(1000));
  }
  
  // 100 次生成应该至少有 50 个不同的值
  if (results.size < 50) {
    throw new Error(`生成的随机数重复太多: ${results.size}/100`);
  }
});

test('2.4 边界值测试', () => {
  // 测试小范围
  const result1 = crypto.randomInt(1);
  if (result1 !== 0) {
    throw new Error('randomInt(1) 应该总是返回 0');
  }
  
  // 测试较大范围
  const result2 = crypto.randomInt(1000000);
  if (result2 < 0 || result2 >= 1000000) {
    throw new Error('结果超出范围');
  }
});

// ============ 3. 实际使用场景测试 ============
console.log('\n--- 3. 实际使用场景测试 ---');

test('3.1 生成密钥', () => {
  const key = Buffer.alloc(32);
  crypto.randomFillSync(key);
  
  // 检查密钥不全是 0
  let hasNonZero = false;
  for (let i = 0; i < key.length; i++) {
    if (key[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('密钥应该被随机数填充');
  }
  
  console.log(`    生成的密钥: ${key.toString('hex').substring(0, 32)}...`);
});

test('3.2 生成 IV (初始化向量)', () => {
  const iv = Buffer.alloc(16);
  crypto.randomFillSync(iv);
  
  let hasNonZero = false;
  for (let i = 0; i < iv.length; i++) {
    if (iv[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  
  if (!hasNonZero) {
    throw new Error('IV 应该被随机数填充');
  }
  
  console.log(`    生成的 IV: ${iv.toString('hex')}`);
});

test('3.3 生成随机索引', () => {
  const array = ['a', 'b', 'c', 'd', 'e'];
  const index = crypto.randomInt(array.length);
  const element = array[index];
  
  if (!array.includes(element)) {
    throw new Error('索引超出范围');
  }
  
  console.log(`    随机选择: ${element} (索引 ${index})`);
});

test('3.4 生成随机 ID', () => {
  const id = crypto.randomInt(1000000, 9999999);
  
  if (id < 1000000 || id >= 9999999) {
    throw new Error('ID 超出范围');
  }
  
  console.log(`    生成的 ID: ${id}`);
});

// ============ 4. 错误处理测试 ============
console.log('\n--- 4. 错误处理测试 ---');

test('4.1 randomFillSync 不传参数应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.randomFillSync();
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('4.2 randomInt min >= max 应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.randomInt(100, 100);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('4.3 randomFillSync offset 超出范围应该抛出错误', () => {
  let errorThrown = false;
  try {
    const buf = Buffer.alloc(16);
    crypto.randomFillSync(buf, 20);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
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

// 返回测试结果
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
