const crypto = require('crypto');

console.log('========================================');
console.log('  Node.js crypto.randomUUID() 测试');
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

// ============ 1. 基本功能测试 ============
console.log('\n--- 1. 基本功能测试 ---');

test('1.1 生成有效的 UUID v4', () => {
  const uuid = crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确: ' + uuid);
  }
});

test('1.2 不传参数应该正常工作', () => {
  const uuid = crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

// ============ 2. Node.js v18+ options 参数测试 ============
console.log('\n--- 2. Node.js v18+ options 参数测试 ---');

test('2.1 传入空对象应该正常工作', () => {
  const uuid = crypto.randomUUID({});
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

test('2.2 传入 { disableEntropyCache: true } 应该正常工作', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: true });
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

test('2.3 传入 { disableEntropyCache: false } 应该正常工作', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: false });
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

// ============ 3. 错误处理测试 ============
console.log('\n--- 3. 错误处理测试 ---');

test('3.1 传入非对象参数应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID('invalid');
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误但没有');
  }
});

test('3.2 传入数字参数应该抛出错误', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID(123);
  } catch (e) {
    errorThrown = true;
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误但没有');
  }
});

// ============ 4. 唯一性和格式测试 ============
console.log('\n--- 4. 唯一性和格式测试 ---');

test('4.1 唯一性测试（生成 100 个 UUID）', () => {
  const uuids = new Set();
  for (let i = 0; i < 100; i++) {
    uuids.add(crypto.randomUUID());
  }
  if (uuids.size !== 100) {
    throw new Error(`期望 100 个唯一 UUID，实际得到 ${uuids.size} 个`);
  }
});

test('4.2 UUID 格式详细检查', () => {
  const uuid = crypto.randomUUID();
  
  if (uuid.length !== 36) {
    throw new Error(`UUID 长度应该是 36，实际是 ${uuid.length}`);
  }
  
  if (uuid[14] !== '4') {
    throw new Error(`版本位应该是 4，实际是 ${uuid[14]}`);
  }
  
  const variantChar = uuid[19].toLowerCase();
  if (!['8', '9', 'a', 'b'].includes(variantChar)) {
    throw new Error(`变体位应该是 8/9/a/b，实际是 ${variantChar}`);
  }
  
  const parts = uuid.split('-');
  const expectedLengths = [8, 4, 4, 4, 12];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length !== expectedLengths[i]) {
      throw new Error(`第 ${i+1} 段长度应该是 ${expectedLengths[i]}，实际是 ${parts[i].length}`);
    }
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
