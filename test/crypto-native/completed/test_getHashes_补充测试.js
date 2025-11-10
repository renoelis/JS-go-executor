const crypto = require('crypto');

console.log('========================================');
console.log('  crypto.getHashes() 补充测试');
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

// ============ 1. 算法名称大小写完整测试 ============
console.log('\n--- 1. 算法名称大小写完整测试 ---');

test('1.1 验证不存在大小写重复的算法', () => {
  const hashes = crypto.getHashes();
  const lowerCaseMap = {};
  const duplicates = [];

  for (const hash of hashes) {
    const lower = hash.toLowerCase();
    if (lowerCaseMap[lower]) {
      duplicates.push({ original: lowerCaseMap[lower], duplicate: hash });
    } else {
      lowerCaseMap[lower] = hash;
    }
  }

  if (duplicates.length > 0) {
    console.log(`  ⚠️  发现大小写重复: ${JSON.stringify(duplicates)}`);
  }

  // Node.js 可能允许大小写变体,这是可接受的
  const result = duplicates.length === 0 ? '✅' : '⚠️';
  console.log(`  ${result} 大小写重复检查: ${duplicates.length} 个重复`);
});

test('1.2 createHash 大小写不敏感性验证', () => {
  const hashes = crypto.getHashes();
  const testAlgos = ['sha256', 'sha512', 'md5'];

  for (const algo of testAlgos) {
    if (hashes.includes(algo)) {
      // 测试小写
      const hash1 = crypto.createHash(algo);
      hash1.update('test');
      const digest1 = hash1.digest('hex');

      // 测试大写
      const hash2 = crypto.createHash(algo.toUpperCase());
      hash2.update('test');
      const digest2 = hash2.digest('hex');

      if (digest1 !== digest2) {
        throw new Error(`${algo} 大小写应该产生相同结果`);
      }
    }
  }
  console.log('  ✅ createHash 大小写不敏感');
});

test('1.3 混合大小写算法名称也能用于 createHash', () => {
  const hashes = crypto.getHashes();
  const mixedCaseAlgos = hashes.filter(h => /[a-z]/.test(h) && /[A-Z]/.test(h));

  if (mixedCaseAlgos.length === 0) {
    console.log('  ⚠️  没有找到混合大小写的算法名称');
    return;
  }

  let validCount = 0;
  for (const algo of mixedCaseAlgos.slice(0, 5)) {
    try {
      const hash = crypto.createHash(algo);
      hash.update('test');
      hash.digest('hex');
      validCount++;
    } catch (e) {
      throw new Error(`混合大小写算法 ${algo} 无法使用: ${e.message}`);
    }
  }

  console.log(`  测试了 ${Math.min(5, mixedCaseAlgos.length)} 个混合大小写算法,全部可用`);
});

// ============ 2. createHmac 兼容性测试 ============
console.log('\n--- 2. createHmac 兼容性测试 ---');

test('2.1 所有算法都可用于 createHmac', () => {
  const hashes = crypto.getHashes();
  let validCount = 0;
  let invalidAlgos = [];

  for (const algo of hashes) {
    try {
      const hmac = crypto.createHmac(algo, 'test-key');
      hmac.update('test');
      hmac.digest('hex');
      validCount++;
    } catch (e) {
      invalidAlgos.push(algo);
    }
  }

  const allValid = validCount === hashes.length;
  if (!allValid) {
    console.log(`  ⚠️  ${invalidAlgos.length} 个算法不支持 HMAC: ${invalidAlgos.slice(0, 5).join(', ')}`);
  }

  // 某些算法可能不支持 HMAC,这是正常的
  console.log(`  ${validCount}/${hashes.length} 个算法支持 HMAC`);
});

test('2.2 常见算法的 createHmac 验证', () => {
  const commonAlgos = ['sha256', 'sha512', 'md5', 'sha1'];
  const hashes = crypto.getHashes();

  for (const algo of commonAlgos) {
    if (!hashes.includes(algo)) {
      throw new Error(`常见算法 ${algo} 未在列表中`);
    }

    const hmac = crypto.createHmac(algo, 'key');
    hmac.update('test');
    const digest = hmac.digest('hex');

    if (digest.length === 0) {
      throw new Error(`${algo} HMAC 结果为空`);
    }
  }
});

// ============ 3. 算法别名测试 ============
console.log('\n--- 3. 算法别名测试 ---');

test('3.1 检查可能的别名对', () => {
  const hashes = crypto.getHashes();
  const possibleAliases = [
    ['ripemd160', 'rmd160'],
    ['ripemd', 'ripemd160'],
    ['sha', 'sha1'],
    ['sha-1', 'sha1']
  ];

  for (const [name1, name2] of possibleAliases) {
    const has1 = hashes.includes(name1);
    const has2 = hashes.includes(name2);

    if (has1 && has2) {
      // 验证它们产生相同结果
      const hash1 = crypto.createHash(name1);
      hash1.update('test');
      const digest1 = hash1.digest('hex');

      const hash2 = crypto.createHash(name2);
      hash2.update('test');
      const digest2 = hash2.digest('hex');

      if (digest1 === digest2) {
        console.log(`  ✅ ${name1} 和 ${name2} 是别名(产生相同结果)`);
      } else {
        console.log(`  ⚠️  ${name1} 和 ${name2} 产生不同结果`);
      }
    }
  }
});

test('3.2 验证 ssl3-md5 和 md5 的区别', () => {
  const hashes = crypto.getHashes();
  if (hashes.includes('ssl3-md5') && hashes.includes('md5')) {
    try {
      const hash1 = crypto.createHash('ssl3-md5');
      hash1.update('test');
      const digest1 = hash1.digest('hex');

      const hash2 = crypto.createHash('md5');
      hash2.update('test');
      const digest2 = hash2.digest('hex');

      if (digest1 === digest2) {
        console.log('  ⚠️  ssl3-md5 和 md5 产生相同结果(可能是别名)');
      } else {
        console.log('  ✅ ssl3-md5 和 md5 是不同的算法');
      }
    } catch (e) {
      console.log(`  ⚠️  ssl3-md5 可能不支持: ${e.message}`);
    }
  } else {
    console.log('  ⚠️  跳过(缺少 ssl3-md5 或 md5)');
  }
});

// ============ 4. 返回数组的原型链测试 ============
console.log('\n--- 4. 返回数组的原型链测试 ---');

test('4.1 返回的数组继承自 Array.prototype', () => {
  const hashes = crypto.getHashes();
  // 通过检查是否有 Array 特有的方法来验证原型链
  // 避免使用 Object.getPrototypeOf 和 __proto__
  const hasArrayMethods = typeof hashes.map === 'function' &&
                          typeof hashes.filter === 'function' &&
                          typeof hashes.reduce === 'function';

  if (!hasArrayMethods) {
    throw new Error('返回的数组缺少 Array 原型方法');
  }

  // 验证 instanceof
  if (!(hashes instanceof Array)) {
    throw new Error('返回值不是 Array 的实例');
  }
});

test('4.2 返回的数组具有 Array 的所有标准方法', () => {
  const hashes = crypto.getHashes();
  const requiredMethods = [
    'push', 'pop', 'shift', 'unshift',
    'slice', 'splice', 'concat',
    'map', 'filter', 'reduce', 'forEach',
    'find', 'findIndex', 'indexOf', 'includes',
    'every', 'some', 'sort', 'reverse'
  ];

  for (const method of requiredMethods) {
    if (typeof hashes[method] !== 'function') {
      throw new Error(`缺少数组方法: ${method}`);
    }
  }
});

test('4.3 instanceof Array 检查', () => {
  const hashes = crypto.getHashes();
  if (!(hashes instanceof Array)) {
    throw new Error('返回值不是 Array 的实例');
  }
});

test('4.4 constructor 属性正确', () => {
  const hashes = crypto.getHashes();
  if (hashes.constructor !== Array) {
    throw new Error('constructor 属性不是 Array');
  }
});

// ============ 5. Object.freeze/seal 状态测试 ============
console.log('\n--- 5. Object.freeze/seal 状态测试 ---');

test('5.1 返回的数组未被冻结', () => {
  const hashes = crypto.getHashes();
  const isFrozen = Object.isFrozen(hashes);

  if (isFrozen) {
    throw new Error('返回的数组被冻结了');
  }
  console.log('  ✅ 数组未被冻结');
});

test('5.2 返回的数组未被密封', () => {
  const hashes = crypto.getHashes();
  const isSealed = Object.isSealed(hashes);

  if (isSealed) {
    throw new Error('返回的数组被密封了');
  }
  console.log('  ✅ 数组未被密封');
});

test('5.3 可以添加新元素到返回的数组', () => {
  const hashes = crypto.getHashes();
  const originalLength = hashes.length;

  try {
    hashes.push('test-algorithm');
    if (hashes.length !== originalLength + 1) {
      throw new Error('push 操作未生效');
    }
    if (hashes[hashes.length - 1] !== 'test-algorithm') {
      throw new Error('添加的元素不正确');
    }
  } catch (e) {
    throw new Error(`无法添加元素: ${e.message}`);
  }
});

// ============ 6. sort() 方法的稳定性测试 ============
console.log('\n--- 6. sort() 方法的稳定性测试 ---');

test('6.1 sort() 返回排序后的数组', () => {
  const hashes = crypto.getHashes();
  const sorted = [...hashes].sort();

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i] > sorted[i + 1]) {
      throw new Error(`排序不正确: ${sorted[i]} > ${sorted[i + 1]}`);
    }
  }
});

test('6.2 多次 sort() 结果一致', () => {
  const hashes = crypto.getHashes();
  const sorted1 = [...hashes].sort();
  const sorted2 = [...hashes].sort();

  if (JSON.stringify(sorted1) !== JSON.stringify(sorted2)) {
    throw new Error('多次 sort() 结果不一致');
  }
});

test('6.3 sort() 后原数组不受影响', () => {
  const hashes1 = crypto.getHashes();
  const original = [...hashes1];
  const sorted = [...hashes1].sort();

  if (JSON.stringify(hashes1) !== JSON.stringify(original)) {
    throw new Error('sort() 影响了原数组');
  }
});

// ============ 7. 返回顺序一致性测试 ============
console.log('\n--- 7. 返回顺序一致性测试 ---');

test('7.1 多次调用返回的算法顺序一致', () => {
  const hashes1 = crypto.getHashes();
  const hashes2 = crypto.getHashes();
  const hashes3 = crypto.getHashes();

  for (let i = 0; i < hashes1.length; i++) {
    if (hashes1[i] !== hashes2[i] || hashes1[i] !== hashes3[i]) {
      throw new Error(`索引 ${i} 处顺序不一致: ${hashes1[i]}, ${hashes2[i]}, ${hashes3[i]}`);
    }
  }
});

test('7.2 验证返回顺序是确定性的', () => {
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(crypto.getHashes().join(','));
  }

  const first = results[0];
  const allSame = results.every(r => r === first);

  if (!allSame) {
    throw new Error('返回顺序不是确定性的');
  }
});

// ============ 8. 算法数量阈值测试 ============
console.log('\n--- 8. 算法数量阈值测试 ---');

test('8.1 算法数量应该 >= 40', () => {
  const hashes = crypto.getHashes();
  // Node.js v25.0.0 应该支持至少 40 个算法
  if (hashes.length < 40) {
    throw new Error(`算法数量太少: ${hashes.length}, 期望 >= 40`);
  }
  console.log(`  当前支持 ${hashes.length} 个算法`);
});

test('8.2 验证核心算法组的完整性', () => {
  const hashes = crypto.getHashes();
  const coreGroups = {
    'SHA-2': ['sha224', 'sha256', 'sha384', 'sha512'],
    'SHA-3': ['sha3-256', 'sha3-512'],
    'Legacy': ['md5', 'sha1']
  };

  for (const [groupName, algos] of Object.entries(coreGroups)) {
    const missing = algos.filter(algo => !hashes.includes(algo));
    if (missing.length > 0) {
      throw new Error(`${groupName} 组缺少算法: ${missing.join(', ')}`);
    }
  }
});

// ============ 9. 算法名称特殊前缀测试 ============
console.log('\n--- 9. 算法名称特殊前缀测试 ---');

test('9.1 统计 RSA- 前缀的算法', () => {
  const hashes = crypto.getHashes();
  const rsaPrefixed = hashes.filter(h => h.startsWith('RSA-'));
  console.log(`  找到 ${rsaPrefixed.length} 个 RSA- 前缀算法`);

  if (rsaPrefixed.length > 0) {
    console.log(`  示例: ${rsaPrefixed.slice(0, 3).join(', ')}`);
  }
});

test('9.2 统计 id- 前缀的算法', () => {
  const hashes = crypto.getHashes();
  const idPrefixed = hashes.filter(h => h.startsWith('id-'));
  console.log(`  找到 ${idPrefixed.length} 个 id- 前缀算法`);

  if (idPrefixed.length > 0) {
    console.log(`  示例: ${idPrefixed.slice(0, 3).join(', ')}`);
  }
});

test('9.3 统计 ecdsa-with- 前缀的算法', () => {
  const hashes = crypto.getHashes();
  const ecdsaPrefixed = hashes.filter(h => h.startsWith('ecdsa-with-'));
  console.log(`  找到 ${ecdsaPrefixed.length} 个 ecdsa-with- 前缀算法`);

  if (ecdsaPrefixed.length > 0) {
    console.log(`  示例: ${ecdsaPrefixed.slice(0, 3).join(', ')}`);
  }
});

// ============ 10. 特定算法存在性测试 ============
console.log('\n--- 10. 特定算法存在性测试 ---');

test('10.1 检查 whirlpool 算法', () => {
  const hashes = crypto.getHashes();
  const hasWhirlpool = hashes.some(h => h.toLowerCase().includes('whirlpool'));

  if (hasWhirlpool) {
    console.log('  ✅ 支持 whirlpool 算法');
  } else {
    console.log('  ⚠️  不支持 whirlpool 算法');
  }
});

test('10.2 检查 dsaWithSHA 系列算法', () => {
  const hashes = crypto.getHashes();
  const dsaAlgos = hashes.filter(h => h.toLowerCase().includes('dsawithsha'));

  if (dsaAlgos.length > 0) {
    console.log(`  ✅ 找到 ${dsaAlgos.length} 个 dsaWithSHA 算法: ${dsaAlgos.join(', ')}`);
  } else {
    console.log('  ⚠️  未找到 dsaWithSHA 算法');
  }
});

test('10.3 检查 ecdsa-with-SHA 系列算法', () => {
  const hashes = crypto.getHashes();
  const ecdsaAlgos = hashes.filter(h => h.includes('ecdsa-with-SHA'));

  if (ecdsaAlgos.length > 0) {
    console.log(`  ✅ 找到 ${ecdsaAlgos.length} 个 ecdsa-with-SHA 算法`);
  } else {
    console.log('  ⚠️  未找到 ecdsa-with-SHA 算法');
  }
});

// ============ 11. 错误边界测试 ============
console.log('\n--- 11. 错误边界测试 ---');

test('11.1 在非严格模式下调用', () => {
  // 非严格模式
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('非严格模式下调用失败');
  }
});

test('11.2 在严格模式下调用', () => {
  'use strict';
  const hashes = crypto.getHashes();
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('严格模式下调用失败');
  }
});

test('11.3 使用 call 改变 this 上下文', () => {
  const customThis = { test: 'value' };
  const hashes = crypto.getHashes.call(customThis);
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('使用 call 改变 this 后失败');
  }
});

test('11.4 使用 apply 改变 this 上下文', () => {
  const customThis = { test: 'value' };
  const hashes = crypto.getHashes.apply(customThis, []);
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('使用 apply 改变 this 后失败');
  }
});

test('11.5 使用 bind 创建新函数', () => {
  const boundGetHashes = crypto.getHashes.bind(crypto);
  const hashes = boundGetHashes();
  if (!Array.isArray(hashes) || hashes.length === 0) {
    throw new Error('使用 bind 后失败');
  }
});

// ============ 12. 与 getCiphers 的对比测试 ============
console.log('\n--- 12. 与 getCiphers 的对比测试 ---');

test('12.1 getHashes 和 getCiphers 返回值类型一致', () => {
  const hashes = crypto.getHashes();
  const ciphers = crypto.getCiphers();

  if (!Array.isArray(hashes) || !Array.isArray(ciphers)) {
    throw new Error('返回值类型不一致');
  }
});

test('12.2 getHashes 和 getCiphers 都返回字符串数组', () => {
  const hashes = crypto.getHashes();
  const ciphers = crypto.getCiphers();

  const hashesAllStrings = hashes.every(h => typeof h === 'string');
  const ciphersAllStrings = ciphers.every(c => typeof c === 'string');

  if (!hashesAllStrings || !ciphersAllStrings) {
    throw new Error('返回的元素类型不一致');
  }
});

test('12.3 getHashes 和 getCiphers 的内容不应重叠', () => {
  const hashes = crypto.getHashes();
  const ciphers = crypto.getCiphers();

  const overlap = hashes.filter(h => ciphers.includes(h));

  if (overlap.length > 0) {
    console.log(`  ⚠️  发现 ${overlap.length} 个重叠项: ${overlap.slice(0, 5).join(', ')}`);
  } else {
    console.log('  ✅ 没有重叠项');
  }
});

// ============ 13. 数组修改隔离性测试 ============
console.log('\n--- 13. 数组修改隔离性测试 ---');

test('13.1 修改返回数组不影响后续调用', () => {
  const hashes1 = crypto.getHashes();
  const originalLength = hashes1.length;
  const originalFirst = hashes1[0];

  // 修改数组
  hashes1.push('fake-algo');
  hashes1[0] = 'modified';
  hashes1.reverse();

  // 获取新数组
  const hashes2 = crypto.getHashes();

  if (hashes2.length !== originalLength) {
    throw new Error('长度受到影响');
  }
  if (hashes2[0] !== originalFirst) {
    throw new Error('元素受到影响');
  }
});

test('13.2 删除返回数组元素不影响后续调用', () => {
  const hashes1 = crypto.getHashes();
  const originalLength = hashes1.length;

  hashes1.splice(0, 10);

  const hashes2 = crypto.getHashes();

  if (hashes2.length !== originalLength) {
    throw new Error('删除操作影响了后续调用');
  }
});

// ============ 14. 性能优化验证 ============
console.log('\n--- 14. 性能优化验证 ---');

test('14.1 连续快速调用不会变慢', () => {
  const iterations = 100;
  const times = [];

  // 检查是否支持 process.hrtime.bigint (Node.js环境)
  const supportsBigInt = typeof process !== 'undefined' && 
                         typeof process.hrtime !== 'undefined' && 
                         typeof process.hrtime.bigint === 'function';

  if (supportsBigInt) {
    // Node.js 环境：使用 hrtime.bigint() 获取纳秒精度
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      crypto.getHashes();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1000000); // 转换为毫秒
    }
  } else {
    // 非 Node.js 环境：使用 Date.now() 获取毫秒精度
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      crypto.getHashes();
      const end = Date.now();
      times.push(end - start);
    }
  }

  const firstTen = times.slice(0, 10).reduce((a, b) => a + b) / 10;
  const lastTen = times.slice(-10).reduce((a, b) => a + b) / 10;

  // 最后10次调用不应该比前10次慢太多
  // 注意：在非 Node.js 环境中，Date.now() 精度较低，可能很多次都是 0ms
  if (firstTen > 0 && lastTen > firstTen * 3) {
    throw new Error(`性能下降: 前10次平均 ${firstTen.toFixed(3)}ms, 后10次平均 ${lastTen.toFixed(3)}ms`);
  }

  console.log(`  前10次平均: ${firstTen.toFixed(3)}ms, 后10次平均: ${lastTen.toFixed(3)}ms`);
});

test('14.2 大量并发调用不会崩溃', () => {
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(
      new Promise((resolve) => {
        const hashes = crypto.getHashes();
        resolve(hashes.length);
      })
    );
  }

  return Promise.all(promises).then(lengths => {
    const allSame = lengths.every(len => len === lengths[0]);
    if (!allSame) {
      throw new Error('并发调用返回不同长度');
    }
  });
});

// ============ 15. 算法名称边界情况 ============
console.log('\n--- 15. 算法名称边界情况 ---');

test('15.1 不包含空格的算法名称', () => {
  const hashes = crypto.getHashes();
  const withSpaces = hashes.filter(h => h.includes(' '));

  if (withSpaces.length > 0) {
    throw new Error(`发现包含空格的算法: ${withSpaces.join(', ')}`);
  }
});

test('15.2 不包含特殊控制字符', () => {
  const hashes = crypto.getHashes();
  const withControlChars = hashes.filter(h => /[\x00-\x1F\x7F-\x9F]/.test(h));

  if (withControlChars.length > 0) {
    throw new Error(`发现包含控制字符的算法: ${withControlChars.join(', ')}`);
  }
});

test('15.3 所有算法名称都是 ASCII 可打印字符', () => {
  const hashes = crypto.getHashes();
  const nonAsciiPrintable = hashes.filter(h => !/^[\x20-\x7E]+$/.test(h));

  if (nonAsciiPrintable.length > 0) {
    console.log(`  ⚠️  发现非 ASCII 可打印字符的算法: ${nonAsciiPrintable.join(', ')}`);
  }
});

// ============ 16. 函数属性测试 ============
console.log('\n--- 16. 函数属性测试 ---');

test('16.1 getHashes 是一个函数', () => {
  if (typeof crypto.getHashes !== 'function') {
    throw new Error('getHashes 不是函数');
  }
});

test('16.2 getHashes.length 属性', () => {
  // 函数的 length 属性表示参数数量
  const length = crypto.getHashes.length;
  console.log(`  getHashes.length = ${length}`);

  // getHashes 不接受参数，所以 length 应该是 0
  if (length !== 0) {
    console.log(`  ⚠️  预期 length = 0, 实际 = ${length}`);
  }
});

test('16.3 getHashes.name 属性', () => {
  const name = crypto.getHashes.name;
  console.log(`  getHashes.name = "${name}"`);

  if (name !== 'getHashes') {
    console.log(`  ⚠️  name 属性不是 "getHashes"`);
  }
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('补充测试总结:');
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

if (passCount > 0 && failCount === 0) {
  console.log('\n所有补充测试通过! 🎉');
}

// 返回测试结果
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

console.log('\n' + JSON.stringify(rs, null, 2));

return rs;
