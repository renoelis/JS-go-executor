const crypto = require('crypto');

console.log('========================================');
console.log('  crypto.randomUUID() 测试');
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
  
  // 检查格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确: ' + uuid);
  }
  
  // 检查版本位（第 15 个字符应该是 '4'）
  if (uuid[14] !== '4') {
    throw new Error('UUID 版本位不正确，应该是 4，实际是 ' + uuid[14]);
  }
  
  // 检查变体位（第 20 个字符应该是 8, 9, a, 或 b）
  const variantChar = uuid[19].toLowerCase();
  if (!['8', '9', 'a', 'b'].includes(variantChar)) {
    throw new Error('UUID 变体位不正确: ' + variantChar);
  }
});

test('1.2 每次生成的 UUID 应该不同', () => {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();
  
  if (uuid1 === uuid2 || uuid1 === uuid3 || uuid2 === uuid3) {
    throw new Error('生成的 UUID 重复');
  }
});

test('1.3 生成大量 UUID 应该都是唯一的', () => {
  const uuids = new Set();
  const count = 1000;
  
  for (let i = 0; i < count; i++) {
    const uuid = crypto.randomUUID();
    if (uuids.has(uuid)) {
      throw new Error('生成了重复的 UUID: ' + uuid);
    }
    uuids.add(uuid);
  }
  
  if (uuids.size !== count) {
    throw new Error(`期望 ${count} 个唯一 UUID，实际得到 ${uuids.size} 个`);
  }
});

// ============ 2. Node.js v18+ options 参数测试 ============
console.log('\n--- 2. Node.js v18+ options 参数测试 ---');

test('2.1 不传参数应该正常工作', () => {
  const uuid = crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

test('2.2 传入空对象应该正常工作', () => {
  const uuid = crypto.randomUUID({});
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

test('2.3 传入 { disableEntropyCache: true } 应该正常工作', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: true });
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

test('2.4 传入 { disableEntropyCache: false } 应该正常工作', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: false });
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID 格式不正确');
  }
});

test('2.5 传入其他选项应该被忽略', () => {
  const uuid = crypto.randomUUID({ someOtherOption: 'value' });
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
    // 兼容中英文错误消息
    // Go 实现: "options 参数必须是对象"
    // Node.js: "The \"options\" argument must be of type object"
    const hasValidMessage = e.message.includes('对象') || 
                           e.message.includes('object') || 
                           e.message.includes('options');
    if (!hasValidMessage) {
      throw new Error('错误消息不正确: ' + e.message);
    }
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

// ============ 4. UUID 格式详细验证 ============
console.log('\n--- 4. UUID 格式详细验证 ---');

test('4.1 UUID 长度应该是 36 个字符', () => {
  const uuid = crypto.randomUUID();
  if (uuid.length !== 36) {
    throw new Error(`UUID 长度应该是 36，实际是 ${uuid.length}`);
  }
});

test('4.2 UUID 应该包含 4 个连字符', () => {
  const uuid = crypto.randomUUID();
  const hyphens = uuid.split('-').length - 1;
  if (hyphens !== 4) {
    throw new Error(`UUID 应该包含 4 个连字符，实际是 ${hyphens}`);
  }
});

test('4.3 UUID 各段长度应该正确', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  
  if (parts[0].length !== 8) {
    throw new Error(`第 1 段长度应该是 8，实际是 ${parts[0].length}`);
  }
  if (parts[1].length !== 4) {
    throw new Error(`第 2 段长度应该是 4，实际是 ${parts[1].length}`);
  }
  if (parts[2].length !== 4) {
    throw new Error(`第 3 段长度应该是 4，实际是 ${parts[2].length}`);
  }
  if (parts[3].length !== 4) {
    throw new Error(`第 4 段长度应该是 4，实际是 ${parts[3].length}`);
  }
  if (parts[4].length !== 12) {
    throw new Error(`第 5 段长度应该是 12，实际是 ${parts[4].length}`);
  }
});

test('4.4 UUID 应该只包含十六进制字符和连字符', () => {
  const uuid = crypto.randomUUID();
  const validChars = /^[0-9a-f-]+$/i;
  
  if (!validChars.test(uuid)) {
    throw new Error('UUID 包含非法字符: ' + uuid);
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
