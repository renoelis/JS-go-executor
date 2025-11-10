const crypto = require('crypto');

// 测试结果收集
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

const addTest = (name, passed, expected, actual, error = null) => {
  testResults.total++;
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  testResults.tests.push({
    name,
    status: passed ? '✅' : '❌',
    passed,
    expected,
    actual,
    error
  });
};

console.log('=== crypto.getHashes() 全面测试 ===\n');

// ============================================
// 测试 1: 基础功能 - 返回值类型验证
// ============================================
try {
  const hashes = crypto.getHashes();
  const isArray = Array.isArray(hashes);
  addTest(
    '返回值是数组类型',
    isArray,
    'Array',
    typeof hashes === 'object' && isArray ? 'Array' : typeof hashes
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 1: 返回值是数组类型`);
} catch (error) {
  addTest('返回值是数组类型', false, 'Array', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 1: 返回值是数组类型 - ${error.message}`);
}

// ============================================
// 测试 2: 返回值非空验证
// ============================================
try {
  const hashes = crypto.getHashes();
  const isNonEmpty = hashes.length > 0;
  addTest(
    '返回的哈希算法数组非空',
    isNonEmpty,
    '> 0',
    hashes.length
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 2: 返回的哈希算法数组非空 (长度: ${hashes.length})`);
} catch (error) {
  addTest('返回的哈希算法数组非空', false, '> 0', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 2: 返回的哈希算法数组非空 - ${error.message}`);
}

// ============================================
// 测试 3: 数组元素都是字符串
// ============================================
try {
  const hashes = crypto.getHashes();
  const allStrings = hashes.every(h => typeof h === 'string');
  addTest(
    '所有元素都是字符串类型',
    allStrings,
    'all strings',
    allStrings ? 'all strings' : 'contains non-string'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 3: 所有元素都是字符串类型`);
} catch (error) {
  addTest('所有元素都是字符串类型', false, 'all strings', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 3: 所有元素都是字符串类型 - ${error.message}`);
}

// ============================================
// 测试 4: 包含常见哈希算法 - SHA256
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasSha256 = hashes.includes('sha256');
  addTest(
    '包含 sha256 算法',
    hasSha256,
    'includes sha256',
    hasSha256 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 4: 包含 sha256 算法`);
} catch (error) {
  addTest('包含 sha256 算法', false, 'includes sha256', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 4: 包含 sha256 算法 - ${error.message}`);
}

// ============================================
// 测试 5: 包含常见哈希算法 - SHA512
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasSha512 = hashes.includes('sha512');
  addTest(
    '包含 sha512 算法',
    hasSha512,
    'includes sha512',
    hasSha512 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 5: 包含 sha512 算法`);
} catch (error) {
  addTest('包含 sha512 算法', false, 'includes sha512', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 5: 包含 sha512 算法 - ${error.message}`);
}

// ============================================
// 测试 6: 包含常见哈希算法 - SHA1
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasSha1 = hashes.includes('sha1');
  addTest(
    '包含 sha1 算法',
    hasSha1,
    'includes sha1',
    hasSha1 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 6: 包含 sha1 算法`);
} catch (error) {
  addTest('包含 sha1 算法', false, 'includes sha1', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 6: 包含 sha1 算法 - ${error.message}`);
}

// ============================================
// 测试 7: 包含常见哈希算法 - MD5
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasMd5 = hashes.includes('md5');
  addTest(
    '包含 md5 算法',
    hasMd5,
    'includes md5',
    hasMd5 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 7: 包含 md5 算法`);
} catch (error) {
  addTest('包含 md5 算法', false, 'includes md5', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 7: 包含 md5 算法 - ${error.message}`);
}

// ============================================
// 测试 8: 多次调用返回相同结果
// ============================================
try {
  const hashes1 = crypto.getHashes();
  const hashes2 = crypto.getHashes();
  const areEqual = JSON.stringify(hashes1.sort()) === JSON.stringify(hashes2.sort());
  addTest(
    '多次调用返回相同结果',
    areEqual,
    'consistent results',
    areEqual ? 'consistent' : 'inconsistent'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 8: 多次调用返回相同结果`);
} catch (error) {
  addTest('多次调用返回相同结果', false, 'consistent results', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 8: 多次调用返回相同结果 - ${error.message}`);
}

// ============================================
// 测试 9: 不接受参数 - 传入参数应被忽略
// ============================================
try {
  const hashes1 = crypto.getHashes();
  const hashes2 = crypto.getHashes('ignored');
  const hashes3 = crypto.getHashes(123);
  const areEqual = JSON.stringify(hashes1.sort()) === JSON.stringify(hashes2.sort()) &&
                   JSON.stringify(hashes1.sort()) === JSON.stringify(hashes3.sort());
  addTest(
    '传入参数被正确忽略',
    areEqual,
    'parameters ignored',
    areEqual ? 'ignored correctly' : 'parameters affected result'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 9: 传入参数被正确忽略`);
} catch (error) {
  addTest('传入参数被正确忽略', false, 'parameters ignored', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 9: 传入参数被正确忽略 - ${error.message}`);
}

// ============================================
// 测试 10: 返回的数组可修改但不影响下次调用
// ============================================
try {
  const hashes1 = crypto.getHashes();
  const originalLength = hashes1.length;
  hashes1.push('fake-algorithm');
  const hashes2 = crypto.getHashes();
  const isIsolated = hashes2.length === originalLength && !hashes2.includes('fake-algorithm');
  addTest(
    '返回的数组是独立副本',
    isIsolated,
    'isolated copy',
    isIsolated ? 'properly isolated' : 'shared reference'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 10: 返回的数组是独立副本`);
} catch (error) {
  addTest('返回的数组是独立副本', false, 'isolated copy', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 10: 返回的数组是独立副本 - ${error.message}`);
}

// ============================================
// 测试 11: 返回的算法名称可用于 createHash
// ============================================
try {
  const hashes = crypto.getHashes();
  let validCount = 0;
  let totalChecked = 0;
  const sampleAlgorithms = ['sha256', 'sha512', 'md5', 'sha1', 'sha224'];

  for (const algo of sampleAlgorithms) {
    if (hashes.includes(algo)) {
      totalChecked++;
      try {
        const hash = crypto.createHash(algo);
        hash.update('test');
        hash.digest();
        validCount++;
      } catch (e) {
        // 算法不可用
      }
    }
  }

  const allValid = totalChecked > 0 && validCount === totalChecked;
  addTest(
    '返回的算法名称可用于 createHash',
    allValid,
    `${totalChecked}/${totalChecked} valid`,
    `${validCount}/${totalChecked} valid`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 11: 返回的算法名称可用于 createHash (${validCount}/${totalChecked})`);
} catch (error) {
  addTest('返回的算法名称可用于 createHash', false, 'valid algorithms', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 11: 返回的算法名称可用于 createHash - ${error.message}`);
}

// ============================================
// 测试 12: 包含 SHA3 系列算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const sha3Algorithms = ['sha3-224', 'sha3-256', 'sha3-384', 'sha3-512'];
  const hasSomeSha3 = sha3Algorithms.some(algo => hashes.includes(algo));
  const foundSha3 = sha3Algorithms.filter(algo => hashes.includes(algo));
  addTest(
    '包含 SHA3 系列算法',
    hasSomeSha3,
    'at least one SHA3',
    hasSomeSha3 ? `found: ${foundSha3.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 12: 包含 SHA3 系列算法 ${foundSha3.length > 0 ? `(${foundSha3.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 SHA3 系列算法', false, 'at least one SHA3', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 12: 包含 SHA3 系列算法 - ${error.message}`);
}

// ============================================
// 测试 13: 无重复算法名称
// ============================================
try {
  const hashes = crypto.getHashes();
  const uniqueHashes = new Set(hashes);
  const hasNoDuplicates = uniqueHashes.size === hashes.length;
  addTest(
    '无重复算法名称',
    hasNoDuplicates,
    `${hashes.length} unique`,
    `${uniqueHashes.size} unique out of ${hashes.length}`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 13: 无重复算法名称`);
} catch (error) {
  addTest('无重复算法名称', false, 'no duplicates', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 13: 无重复算法名称 - ${error.message}`);
}

// ============================================
// 测试 14: 算法名称非空字符串
// ============================================
try {
  const hashes = crypto.getHashes();
  const allNonEmpty = hashes.every(h => h && h.length > 0);
  addTest(
    '所有算法名称非空',
    allNonEmpty,
    'all non-empty strings',
    allNonEmpty ? 'all valid' : 'contains empty strings'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 14: 所有算法名称非空`);
} catch (error) {
  addTest('所有算法名称非空', false, 'all non-empty strings', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 14: 所有算法名称非空 - ${error.message}`);
}

// ============================================
// 测试 15: 包含 BLAKE2 系列算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const blake2Algorithms = ['blake2b512', 'blake2s256'];
  const hasSomeBlake2 = blake2Algorithms.some(algo => hashes.includes(algo));
  const foundBlake2 = blake2Algorithms.filter(algo => hashes.includes(algo));
  addTest(
    '包含 BLAKE2 系列算法',
    hasSomeBlake2,
    'at least one BLAKE2',
    hasSomeBlake2 ? `found: ${foundBlake2.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 15: 包含 BLAKE2 系列算法 ${foundBlake2.length > 0 ? `(${foundBlake2.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 BLAKE2 系列算法', false, 'at least one BLAKE2', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 15: 包含 BLAKE2 系列算法 - ${error.message}`);
}

// ============================================
// 测试 16: 包含 RSA 相关哈希算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const rsaAlgorithms = hashes.filter(h => h.toLowerCase().includes('rsa'));
  const hasRsaAlgorithms = rsaAlgorithms.length > 0;
  addTest(
    '包含 RSA 相关哈希算法',
    hasRsaAlgorithms,
    'at least one RSA algorithm',
    hasRsaAlgorithms ? `found ${rsaAlgorithms.length} RSA algorithms` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 16: 包含 RSA 相关哈希算法 (${rsaAlgorithms.length} 个)`);
} catch (error) {
  addTest('包含 RSA 相关哈希算���', false, 'at least one RSA algorithm', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 16: 包含 RSA 相关哈希算法 - ${error.message}`);
}

// ============================================
// 测试 17: 性能测试 - 调用速度
// ============================================
try {
  const iterations = 1000;
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    crypto.getHashes();
  }
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const isPerformant = avgTime < 10; // 平均每次调用应小于 10ms
  addTest(
    '性能测试 - 调用速度',
    isPerformant,
    '< 10ms per call',
    `${avgTime.toFixed(3)}ms per call`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 17: 性能测试 - ${avgTime.toFixed(3)}ms/调用 (${iterations}次调用)`);
} catch (error) {
  addTest('性能测试 - 调用速度', false, '< 10ms per call', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 17: 性能测试 - ${error.message}`);
}

// ============================================
// 测试 18: 包含 SHA384 算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasSha384 = hashes.includes('sha384');
  addTest(
    '包含 sha384 算法',
    hasSha384,
    'includes sha384',
    hasSha384 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 18: 包含 sha384 算法`);
} catch (error) {
  addTest('包含 sha384 算法', false, 'includes sha384', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 18: 包含 sha384 算法 - ${error.message}`);
}

// ============================================
// 测试 19: 包含 SHA224 算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasSha224 = hashes.includes('sha224');
  addTest(
    '包含 sha224 算法',
    hasSha224,
    'includes sha224',
    hasSha224 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 19: 包含 sha224 算法`);
} catch (error) {
  addTest('包含 sha224 算法', false, 'includes sha224', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 19: 包含 sha224 算法 - ${error.message}`);
}

// ============================================
// 测试 20: 算法名称格式验证 - 合法字符（包括斜杠）
// ============================================
try {
  const hashes = crypto.getHashes();
  // 检查算法名称是否符合预期格式（字母、数字、连字符、斜杠等）
  // 例如: RSA-SHA512/224, id-rsassa-pkcs1-v1_5-with-sha3-256
  const validFormatRegex = /^[a-zA-Z0-9\-_\/]+$/;
  const allValidFormat = hashes.every(h => validFormatRegex.test(h));
  const invalidHashes = hashes.filter(h => !validFormatRegex.test(h));
  addTest(
    '算法名称格式合法',
    allValidFormat,
    'valid format (alphanumeric + dash + slash)',
    allValidFormat ? 'all valid format' : `invalid: ${invalidHashes.join(', ')}`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 20: 算法名称格式合法`);
} catch (error) {
  addTest('算法名称格式合法', false, 'valid format', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 20: 算法名称格式合法 - ${error.message}`);
}

// ============================================
// 测试 21: 边界情况 - 在不同上下文中调用
// ============================================
try {
  // 在常规函数中调用
  const getHashesRegular = () => {
    return crypto.getHashes();
  };
  const hashesFromRegular = getHashesRegular();

  // 在对象方法中调用
  const obj = {
    getHashes() {
      return crypto.getHashes();
    }
  };
  const hashesFromMethod = obj.getHashes();

  // 在箭头函数中调用
  const getHashesArrow = () => crypto.getHashes();
  const hashesFromArrow = getHashesArrow();

  const allEqual = JSON.stringify(hashesFromRegular.sort()) === JSON.stringify(hashesFromMethod.sort()) &&
                   JSON.stringify(hashesFromRegular.sort()) === JSON.stringify(hashesFromArrow.sort());

  addTest(
    '在不同上下文中调用结果一致',
    allEqual,
    'consistent across contexts',
    allEqual ? 'consistent' : 'inconsistent'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 21: 在不同上下文中调用结果一致`);
} catch (error) {
  addTest('在不同上下文中调用结果一致', false, 'consistent across contexts', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 21: 在不同上下文中调用结果一致 - ${error.message}`);
}

// ============================================
// 测试 22: 算法数量合理性检查
// ============================================
try {
  const hashes = crypto.getHashes();
  // Node.js v25 应该支持大量算法（通常超过 50 个）
  const hasReasonableCount = hashes.length >= 20;
  addTest(
    '算法数量合理（>= 20）',
    hasReasonableCount,
    '>= 20 algorithms',
    `${hashes.length} algorithms`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 22: 算法数量合理 (${hashes.length} 个算法)`);
} catch (error) {
  addTest('算法数量合理（>= 20）', false, '>= 20 algorithms', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 22: 算法数量合理 - ${error.message}`);
}

// ============================================
// 测试 23: 包含常用 SHAKE 算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const shakeAlgorithms = ['shake128', 'shake256'];
  const hasSomeShake = shakeAlgorithms.some(algo => hashes.includes(algo));
  const foundShake = shakeAlgorithms.filter(algo => hashes.includes(algo));
  addTest(
    '包含 SHAKE 系列算法',
    hasSomeShake,
    'at least one SHAKE',
    hasSomeShake ? `found: ${foundShake.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 23: 包含 SHAKE 系列算法 ${foundShake.length > 0 ? `(${foundShake.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 SHAKE 系列算法', false, 'at least one SHAKE', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 23: 包含 SHAKE 系列算法 - ${error.message}`);
}

// ============================================
// 测试 24: 严格模式下行为一致
// ============================================
try {
  'use strict';
  const hashesStrict = crypto.getHashes();
  const isArray = Array.isArray(hashesStrict);
  const isNonEmpty = hashesStrict.length > 0;
  const behavesCorrectly = isArray && isNonEmpty;
  addTest(
    '严格模式下正常工作',
    behavesCorrectly,
    'works in strict mode',
    behavesCorrectly ? 'working correctly' : 'unexpected behavior'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 24: 严格模式下正常工作`);
} catch (error) {
  addTest('严格模式下正常工作', false, 'works in strict mode', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 24: 严格模式下正常工作 - ${error.message}`);
}

// ============================================
// 测试 25: 内存效率 - 多次调用不会泄露
// ============================================
try {
  // 检查是否支持 process.memoryUsage (Node.js 环境)
  if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
    const initialMemory = process.memoryUsage().heapUsed;
    const arrays = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(crypto.getHashes());
    }
    const afterMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = afterMemory - initialMemory;
    // 100 次调用内存增长应该合理（< 10MB）
    const isMemoryEfficient = memoryIncrease < 10 * 1024 * 1024;
    addTest(
      '内存效率测试',
      isMemoryEfficient,
      '< 10MB for 100 calls',
      `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`
    );
    console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 25: 内存效率 (${(memoryIncrease / 1024 / 1024).toFixed(2)}MB 增长)`);
    arrays.length = 0; // 清理
  } else {
    // 环境不支持 process.memoryUsage，跳过此测试
    addTest(
      '内存效率测试',
      true,
      'skipped (no process.memoryUsage)',
      'skipped in non-Node.js environment'
    );
    console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 25: 内存效率测试 (跳过 - 非 Node.js 环境)`);
  }
} catch (error) {
  addTest('内存效率测试', false, '< 10MB for 100 calls', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 25: 内存效率 - ${error.message}`);
}

// ============================================
// 测试 26: 验证所有返回的算法都能用于 createHash
// ============================================
try {
  const hashes = crypto.getHashes();
  let validCount = 0;
  let invalidAlgorithms = [];
  
  for (const algo of hashes) {
    try {
      const hash = crypto.createHash(algo);
      hash.update('test');
      hash.digest();
      validCount++;
    } catch (e) {
      invalidAlgorithms.push(algo);
    }
  }
  
  const allValid = validCount === hashes.length;
  addTest(
    '所有返回的算法都可用于 createHash',
    allValid,
    `${hashes.length}/${hashes.length} valid`,
    `${validCount}/${hashes.length} valid` + (invalidAlgorithms.length > 0 ? ` (invalid: ${invalidAlgorithms.slice(0, 5).join(', ')})` : '')
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 26: 所有算法可用于 createHash (${validCount}/${hashes.length})`);
} catch (error) {
  addTest('所有返回的算法都可用于 createHash', false, 'all valid', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 26: 所有算法可用于 createHash - ${error.message}`);
}

// ============================================
// 测试 27: 包含 RIPEMD 系列算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const ripemdAlgorithms = ['ripemd', 'ripemd160', 'rmd160', 'ripemd160WithRSA'];
  const hasSomeRipemd = ripemdAlgorithms.some(algo => hashes.includes(algo));
  const foundRipemd = ripemdAlgorithms.filter(algo => hashes.includes(algo));
  addTest(
    '包含 RIPEMD 系列算法',
    hasSomeRipemd,
    'at least one RIPEMD',
    hasSomeRipemd ? `found: ${foundRipemd.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 27: 包含 RIPEMD 系列算法 ${foundRipemd.length > 0 ? `(${foundRipemd.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 RIPEMD 系列算法', false, 'at least one RIPEMD', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 27: 包含 RIPEMD 系列算法 - ${error.message}`);
}

// ============================================
// 测试 28: 包含 SM3 算法（国密算法）
// ============================================
try {
  const hashes = crypto.getHashes();
  const sm3Algorithms = ['sm3', 'sm3WithRSAEncryption', 'RSA-SM3'];
  const hasSomeSm3 = sm3Algorithms.some(algo => hashes.includes(algo));
  const foundSm3 = sm3Algorithms.filter(algo => hashes.includes(algo));
  addTest(
    '包含 SM3 国密算法',
    hasSomeSm3,
    'at least one SM3',
    hasSomeSm3 ? `found: ${foundSm3.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 28: 包含 SM3 国密算法 ${foundSm3.length > 0 ? `(${foundSm3.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 SM3 国密算法', false, 'at least one SM3', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 28: 包含 SM3 国密算法 - ${error.message}`);
}

// ============================================
// 测试 29: 包含带有 RSAEncryption 的算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const rsaEncryptionAlgos = hashes.filter(h => h.includes('WithRSAEncryption'));
  const hasRsaEncryption = rsaEncryptionAlgos.length > 0;
  addTest(
    '包含 WithRSAEncryption 算法',
    hasRsaEncryption,
    'at least one WithRSAEncryption',
    hasRsaEncryption ? `found ${rsaEncryptionAlgos.length} algorithms` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 29: 包含 WithRSAEncryption 算法 (${rsaEncryptionAlgos.length} 个)`);
} catch (error) {
  addTest('包含 WithRSAEncryption 算法', false, 'at least one WithRSAEncryption', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 29: 包含 WithRSAEncryption 算法 - ${error.message}`);
}

// ============================================
// 测试 30: 包含 SHA512 变体算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const sha512Variants = ['sha512-224', 'sha512-256', 'RSA-SHA512/224', 'RSA-SHA512/256'];
  const hasSomeSha512Variant = sha512Variants.some(algo => hashes.includes(algo));
  const foundSha512Variants = sha512Variants.filter(algo => hashes.includes(algo));
  addTest(
    '包含 SHA512 变体算法',
    hasSomeSha512Variant,
    'at least one SHA512 variant',
    hasSomeSha512Variant ? `found: ${foundSha512Variants.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 30: 包含 SHA512 变体算法 ${foundSha512Variants.length > 0 ? `(${foundSha512Variants.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 SHA512 变体算法', false, 'at least one SHA512 variant', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 30: 包含 SHA512 变体算法 - ${error.message}`);
}

// ============================================
// 测试 31: 包含 SSL3 相关算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const ssl3Algorithms = ['ssl3-md5', 'ssl3-sha1'];
  const hasSomeSsl3 = ssl3Algorithms.some(algo => hashes.includes(algo));
  const foundSsl3 = ssl3Algorithms.filter(algo => hashes.includes(algo));
  addTest(
    '包含 SSL3 相关算法',
    hasSomeSsl3,
    'at least one SSL3',
    hasSomeSsl3 ? `found: ${foundSsl3.join(', ')}` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 31: 包含 SSL3 相关算法 ${foundSsl3.length > 0 ? `(${foundSsl3.join(', ')})` : ''}`);
} catch (error) {
  addTest('包含 SSL3 相关算法', false, 'at least one SSL3', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 31: 包含 SSL3 相关算法 - ${error.message}`);
}

// ============================================
// 测试 32: 包含 MD5-SHA1 混合算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasMd5Sha1 = hashes.includes('md5-sha1');
  addTest(
    '包含 md5-sha1 混合算法',
    hasMd5Sha1,
    'includes md5-sha1',
    hasMd5Sha1 ? 'included' : 'not included'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 32: 包含 md5-sha1 混合算法`);
} catch (error) {
  addTest('包含 md5-sha1 混合算法', false, 'includes md5-sha1', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 32: 包含 md5-sha1 混合算法 - ${error.message}`);
}

// ============================================
// 测试 33: 包含 id-rsassa-pkcs1 系列算法
// ============================================
try {
  const hashes = crypto.getHashes();
  const pkcs1Algorithms = hashes.filter(h => h.startsWith('id-rsassa-pkcs1'));
  const hasPkcs1 = pkcs1Algorithms.length > 0;
  addTest(
    '包含 id-rsassa-pkcs1 系列算法',
    hasPkcs1,
    'at least one id-rsassa-pkcs1',
    hasPkcs1 ? `found ${pkcs1Algorithms.length} algorithms` : 'none found'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 33: 包含 id-rsassa-pkcs1 系列算法 (${pkcs1Algorithms.length} 个)`);
} catch (error) {
  addTest('包含 id-rsassa-pkcs1 系列算法', false, 'at least one id-rsassa-pkcs1', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 33: 包含 id-rsassa-pkcs1 系列算法 - ${error.message}`);
}

// ============================================
// 测试 34: 返回数组的不可变性（冻结测试）
// ============================================
try {
  const hashes = crypto.getHashes();
  let canModify = true;
  try {
    hashes[0] = 'modified';
    canModify = hashes[0] === 'modified';
  } catch (e) {
    canModify = false;
  }
  // 注意：Node.js 的 getHashes 返回可修改的数组，但修改不影响后续调用
  addTest(
    '返回的数组可以被修改',
    canModify,
    'modifiable array',
    canModify ? 'modifiable' : 'frozen/sealed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 34: 返回的数组可以被修改`);
} catch (error) {
  addTest('返回的数组可以被修改', false, 'modifiable array', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 34: 返回的数组可以被修改 - ${error.message}`);
}

// ============================================
// 测试 35: 算法名称大小写一致性检查
// ============================================
try {
  const hashes = crypto.getHashes();
  const mixedCaseAlgos = hashes.filter(h => {
    // 检查是否有混合大小写（如 WithRSAEncryption）
    return /[a-z]/.test(h) && /[A-Z]/.test(h);
  });
  const hasMixedCase = mixedCaseAlgos.length > 0;
  addTest(
    '存在混合大小写的算法名称',
    hasMixedCase,
    'has mixed case names',
    hasMixedCase ? `found ${mixedCaseAlgos.length} mixed case names` : 'all uniform case'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 35: 存在混合大小写的算法名称 (${mixedCaseAlgos.length} 个)`);
} catch (error) {
  addTest('存在混合大小写的算法名称', false, 'has mixed case names', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 35: 存在混合大小写的算法名称 - ${error.message}`);
}

// ============================================
// 测试 36: 算法名称最大长度检查
// ============================================
try {
  const hashes = crypto.getHashes();
  const maxLength = Math.max(...hashes.map(h => h.length));
  const longestAlgos = hashes.filter(h => h.length === maxLength);
  const isReasonable = maxLength < 100; // 算法名称应该不会太长
  addTest(
    '算法名称长度合理',
    isReasonable,
    '< 100 characters',
    `max ${maxLength} chars (${longestAlgos[0]})`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 36: 算法名称长度合理 (最长: ${maxLength} 字符)`);
} catch (error) {
  addTest('算法名称长度合理', false, '< 100 characters', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 36: 算法名称长度合理 - ${error.message}`);
}

// ============================================
// 测试 37: 算法名称最小长度检查
// ============================================
try {
  const hashes = crypto.getHashes();
  const minLength = Math.min(...hashes.map(h => h.length));
  const shortestAlgos = hashes.filter(h => h.length === minLength);
  const isReasonable = minLength >= 2; // 算法名称至少应该有 2 个字符
  addTest(
    '算法名称最小长度合理',
    isReasonable,
    '>= 2 characters',
    `min ${minLength} chars (${shortestAlgos.join(', ')})`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 37: 算法名称最小长度合理 (最短: ${minLength} 字符)`);
} catch (error) {
  addTest('算法名称最小长度合理', false, '>= 2 characters', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 37: 算法名称最小长度合理 - ${error.message}`);
}

// ============================================
// 测试 38: 并发调用一致性
// ============================================
try {
  const results = [];
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(Promise.resolve(crypto.getHashes()));
  }
  Promise.all(promises).then(allResults => {
    const first = JSON.stringify(allResults[0].sort());
    const allSame = allResults.every(r => JSON.stringify(r.sort()) === first);
    addTest(
      '并发调用返回一致结果',
      allSame,
      'consistent results',
      allSame ? 'all consistent' : 'inconsistent'
    );
  });
  // 同步检查
  const syncResults = Array.from({ length: 10 }, () => crypto.getHashes());
  const firstSync = JSON.stringify(syncResults[0].sort());
  const allSameSync = syncResults.every(r => JSON.stringify(r.sort()) === firstSync);
  addTest(
    '同步并发调用返回一致结果',
    allSameSync,
    'consistent results',
    allSameSync ? 'all consistent' : 'inconsistent'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 38: 同步并发调用返回一致结果`);
} catch (error) {
  addTest('同步并发调用返回一致结果', false, 'consistent results', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 38: 同步并发调用返回一致结果 - ${error.message}`);
}

// ============================================
// 测试 39: typeof 返回值检查
// ============================================
try {
  const hashes = crypto.getHashes();
  const isObject = typeof hashes === 'object';
  const isNotNull = hashes !== null;
  const isCorrectType = isObject && isNotNull;
  addTest(
    '返回值 typeof 为 object 且非 null',
    isCorrectType,
    'object and not null',
    isCorrectType ? 'correct type' : `typeof: ${typeof hashes}, null: ${hashes === null}`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 39: 返回值 typeof 正确`);
} catch (error) {
  addTest('返回值 typeof 为 object 且非 null', false, 'object and not null', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 39: 返回值 typeof 正确 - ${error.message}`);
}

// ============================================
// 测试 40: Array.isArray 严格检查
// ============================================
try {
  const hashes = crypto.getHashes();
  const isArray = Array.isArray(hashes);
  const hasLength = typeof hashes.length === 'number';
  const hasArrayMethods = typeof hashes.map === 'function' && typeof hashes.filter === 'function';
  const isProperArray = isArray && hasLength && hasArrayMethods;
  addTest(
    '返回值是真正的数组',
    isProperArray,
    'proper Array with methods',
    isProperArray ? 'proper array' : 'not proper array'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 40: 返回值是真正的数组`);
} catch (error) {
  addTest('返回值是真正的数组', false, 'proper Array with methods', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 40: 返回值是真正的数组 - ${error.message}`);
}

// ============================================
// 测试 41: 验证特定算法组合的存在性
// ============================================
try {
  const hashes = crypto.getHashes();
  // 检查关键的算法组合
  const criticalAlgorithms = {
    'SHA-2 系列': ['sha224', 'sha256', 'sha384', 'sha512'],
    'SHA-3 系列': ['sha3-256', 'sha3-512'],
    'BLAKE2 系列': ['blake2b512', 'blake2s256']
  };
  
  let allCriticalPresent = true;
  let missingGroups = [];
  
  for (const [group, algos] of Object.entries(criticalAlgorithms)) {
    const hasAll = algos.every(algo => hashes.includes(algo));
    if (!hasAll) {
      allCriticalPresent = false;
      missingGroups.push(group);
    }
  }
  
  addTest(
    '包含关键算法组合',
    allCriticalPresent,
    'all critical algorithm groups present',
    allCriticalPresent ? 'all present' : `missing: ${missingGroups.join(', ')}`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 41: 包含关键算法组合`);
} catch (error) {
  addTest('包含关键算法组合', false, 'all critical algorithm groups', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 41: 包含关键算法组合 - ${error.message}`);
}

// ============================================
// 测试 42: 数组索引访问正常性
// ============================================
try {
  const hashes = crypto.getHashes();
  const firstElement = hashes[0];
  const lastElement = hashes[hashes.length - 1];
  const middleElement = hashes[Math.floor(hashes.length / 2)];
  const indexAccessWorks = typeof firstElement === 'string' && 
                           typeof lastElement === 'string' && 
                           typeof middleElement === 'string';
  addTest(
    '数组索引访问正常',
    indexAccessWorks,
    'index access returns strings',
    indexAccessWorks ? 'working correctly' : 'index access failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 42: 数组索引访问正常`);
} catch (error) {
  addTest('数组索引访问正常', false, 'index access works', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 42: 数组索引访问正常 - ${error.message}`);
}

// ============================================
// 测试 43: for...of 迭代正常性
// ============================================
try {
  const hashes = crypto.getHashes();
  let iterationCount = 0;
  let allStrings = true;
  
  for (const hash of hashes) {
    iterationCount++;
    if (typeof hash !== 'string') {
      allStrings = false;
      break;
    }
  }
  
  const iterationWorks = iterationCount === hashes.length && allStrings;
  addTest(
    'for...of 迭代正常',
    iterationWorks,
    'iteration works correctly',
    iterationWorks ? `iterated ${iterationCount} items` : 'iteration failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 43: for...of 迭代正常 (${iterationCount} 项)`);
} catch (error) {
  addTest('for...of 迭代正常', false, 'iteration works', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 43: for...of 迭代正常 - ${error.message}`);
}

// ============================================
// 测试 44: 数组方法可用性（map, filter, reduce）
// ============================================
try {
  const hashes = crypto.getHashes();
  const mapped = hashes.map(h => h.toUpperCase());
  const filtered = hashes.filter(h => h.includes('sha'));
  const reduced = hashes.reduce((acc, h) => acc + h.length, 0);
  
  const methodsWork = Array.isArray(mapped) && 
                      Array.isArray(filtered) && 
                      typeof reduced === 'number';
  addTest(
    '数组方法可用（map/filter/reduce）',
    methodsWork,
    'array methods work',
    methodsWork ? 'all methods working' : 'methods failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 44: 数组方法可用`);
} catch (error) {
  addTest('数组方法可用（map/filter/reduce）', false, 'array methods work', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 44: 数组方法可用 - ${error.message}`);
}

// ============================================
// 测试 45: JSON 序列化和反序列化
// ============================================
try {
  const hashes = crypto.getHashes();
  const jsonString = JSON.stringify(hashes);
  const parsed = JSON.parse(jsonString);
  const serializationWorks = Array.isArray(parsed) && 
                             JSON.stringify(parsed.sort()) === JSON.stringify(hashes.sort());
  addTest(
    'JSON 序列化/反序列化正常',
    serializationWorks,
    'serialization works',
    serializationWorks ? 'working correctly' : 'serialization failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 45: JSON 序列化/反序列化正常`);
} catch (error) {
  addTest('JSON 序列化/反序列化正常', false, 'serialization works', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 45: JSON 序列化/反序列化正常 - ${error.message}`);
}

// ============================================
// 测试 46: 扩展运算符支持
// ============================================
try {
  const hashes = crypto.getHashes();
  const spread = [...hashes];
  const spreadWorks = Array.isArray(spread) && 
                      spread.length === hashes.length &&
                      JSON.stringify(spread.sort()) === JSON.stringify(hashes.sort());
  addTest(
    '扩展运算符支持',
    spreadWorks,
    'spread operator works',
    spreadWorks ? 'working correctly' : 'spread failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 46: 扩展运算符支持`);
} catch (error) {
  addTest('扩展运算符支持', false, 'spread operator works', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 46: 扩展运算符支持 - ${error.message}`);
}

// ============================================
// 测试 47: 解构赋值支持
// ============================================
try {
  const hashes = crypto.getHashes();
  const [first, second, ...rest] = hashes;
  const destructuringWorks = typeof first === 'string' && 
                             typeof second === 'string' && 
                             Array.isArray(rest) &&
                             rest.length === hashes.length - 2;
  addTest(
    '解构赋值支持',
    destructuringWorks,
    'destructuring works',
    destructuringWorks ? 'working correctly' : 'destructuring failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 47: 解构赋值支持`);
} catch (error) {
  addTest('解构赋值支持', false, 'destructuring works', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 47: 解构赋值支持 - ${error.message}`);
}

// ============================================
// 测试 48: Array.from 转换
// ============================================
try {
  const hashes = crypto.getHashes();
  const fromArray = Array.from(hashes);
  const conversionWorks = Array.isArray(fromArray) && 
                          fromArray.length === hashes.length &&
                          JSON.stringify(fromArray.sort()) === JSON.stringify(hashes.sort());
  addTest(
    'Array.from 转换正常',
    conversionWorks,
    'Array.from works',
    conversionWorks ? 'working correctly' : 'conversion failed'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 48: Array.from 转换正常`);
} catch (error) {
  addTest('Array.from 转换正常', false, 'Array.from works', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 48: Array.from 转换正常 - ${error.message}`);
}

// ============================================
// 测试 49: includes 方法的大小写敏感性
// ============================================
try {
  const hashes = crypto.getHashes();
  const hasSha256Lower = hashes.includes('sha256');
  const hasSha256Upper = hashes.includes('SHA256');
  const isCaseSensitive = hasSha256Lower !== hasSha256Upper;
  addTest(
    'includes 方法大小写敏感',
    isCaseSensitive,
    'case sensitive',
    isCaseSensitive ? 'case sensitive' : 'case insensitive'
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 49: includes 方法大小写敏感`);
} catch (error) {
  addTest('includes 方法大小写敏感', false, 'case sensitive', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 49: includes 方法大小写敏感 - ${error.message}`);
}

// ============================================
// 测试 50: 算法名称中的特殊字符统计
// ============================================
try {
  const hashes = crypto.getHashes();
  const withDash = hashes.filter(h => h.includes('-')).length;
  const withSlash = hashes.filter(h => h.includes('/')).length;
  const withUnderscore = hashes.filter(h => h.includes('_')).length;
  const withNumber = hashes.filter(h => /\d/.test(h)).length;
  
  const stats = {
    'dash': withDash,
    'slash': withSlash,
    'underscore': withUnderscore,
    'number': withNumber
  };
  
  addTest(
    '算法名称特殊字符统计',
    true,
    'statistics collected',
    `dash:${withDash}, slash:${withSlash}, underscore:${withUnderscore}, number:${withNumber}`
  );
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 50: 特殊字符统计 (连字符:${withDash}, 斜杠:${withSlash}, 下划线:${withUnderscore}, 数字:${withNumber})`);
} catch (error) {
  addTest('算法名称特殊字符统计', false, 'statistics collected', 'Error', error.message);
  console.log(`${testResults.tests[testResults.tests.length - 1].status} 测试 50: 算法名称特殊字符统计 - ${error.message}`);
}

// ============================================
// 最终汇总
// ============================================
console.log('\n' + '='.repeat(70));
console.log('                crypto.getHashes() 全面测试完成!');
console.log('='.repeat(70));
console.log(`总计: ${testResults.total} 个测试`);
console.log(`✅ 通过: ${testResults.passed} 个`);
console.log(`❌ 失败: ${testResults.failed} 个`);
console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
console.log('='.repeat(70));

// 输出详细的失败测试
if (testResults.failed > 0) {
  console.log('\n' + '='.repeat(70));
  console.log('失败的测试详情:');
  console.log('='.repeat(70));
  testResults.tests
    .filter(t => !t.passed)
    .forEach((t, index) => {
      console.log(`\n${index + 1}. ${t.name}`);
      console.log(`   期望: ${t.expected}`);
      console.log(`   实际: ${t.actual}`);
      if (t.error) {
        console.log(`   错误: ${t.error}`);
      }
    });
  console.log('='.repeat(70));
} else {
  console.log('\n🎉 所有测试全部通过！');
}

// 输出支持的算法统计信息
console.log('\n' + '='.repeat(70));
console.log('支持的哈希算法统计信息:');
console.log('='.repeat(70));
const allHashes = crypto.getHashes();
console.log(`总算法数量: ${allHashes.length}`);

// 按类别统计
const categories = {
  'SHA-2系列': allHashes.filter(h => /^(sha|RSA-SHA)(224|256|384|512)/.test(h) && !h.includes('sha3')),
  'SHA-3系列': allHashes.filter(h => /sha3/.test(h)),
  'SHAKE系列': allHashes.filter(h => /shake/.test(h)),
  'BLAKE2系列': allHashes.filter(h => /blake2/.test(h)),
  'MD5系列': allHashes.filter(h => /md5/i.test(h)),
  'RIPEMD系列': allHashes.filter(h => /ripemd|rmd160/.test(h)),
  'SM3系列': allHashes.filter(h => /sm3/i.test(h)),
  'SSL3系列': allHashes.filter(h => /ssl3/.test(h)),
  'RSAEncryption': allHashes.filter(h => /WithRSAEncryption/.test(h)),
  'PKCS1系列': allHashes.filter(h => /pkcs1/.test(h))
};

for (const [category, algos] of Object.entries(categories)) {
  if (algos.length > 0) {
    console.log(`\n${category}: ${algos.length} 个`);
    console.log(`  ${algos.slice(0, 5).join(', ')}${algos.length > 5 ? ` ... 及其他 ${algos.length - 5} 个` : ''}`);
  }
}

// 输出完整算法列表
console.log('\n' + '='.repeat(70));
console.log('所有支持的哈希算法列表:');
console.log('='.repeat(70));
allHashes.forEach((hash, index) => {
  console.log(`  ${String(index + 1).padStart(3, ' ')}. ${hash}`);
});
console.log('='.repeat(70));

// 返回测试结果
// 注意：在 goja 环境中不使用 process.exit()
if (typeof process !== 'undefined' && typeof process.exit === 'function') {
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 返回测试结果供外部使用
return {
  total: testResults.total,
  passed: testResults.passed,
  failed: testResults.failed,
  successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%',
  tests: testResults.tests.map(t => ({
    name: t.name,
    passed: t.passed,
    status: t.status
  }))
};
