// 最终验证：逐一对比每个算法的结果
const crypto = require('crypto');

const testData = 'hello world';
const key = 'secret';

console.log('===== 完整验证报告 =====\n');

// 详细的哈希值对比
const hashTests = [
  { algo: 'sha512-224', expected: '22e0d52336f64a998085078b05a6e37b26f8120f43bf4db4c43a64ee' },
  { algo: 'sha512-256', expected: '0ac561fac838104e3f2e4ad107b4bee3e938bf15f2b15f009ccccd61a913f017' },
  { algo: 'sha3-224', expected: 'dfb7f18c77e928bb56faeb2da27291bd790bc1045cde45f3210bb6c5' },
  { algo: 'sha3-256', expected: '644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938' },
  { algo: 'sha3-384', expected: '83bff28dde1b1bf5810071c6643c08e5b05bdb836effd70b403ea8ea0a634dc4997eb1053aa3593f590f9c63630dd90b' },
  { algo: 'sha3-512', expected: '840006653e9ac9e95117a15c915caab81662918e925de9e004f774ff82d7079a40d4d27b1b372657c61d46d470304c88c788b3a4527ad074d1dccbee5dbaa99a' },
  { algo: 'shake128', expected: '3a9159f071e4dd1c8c4f968607c30942' },
  { algo: 'shake256', expected: '369771bb2cb9d2b04c1d54cca487e372d9f187f73f7ba3f65b95c8ee7798c527' },
  { algo: 'blake2b512', expected: '021ced8799296ceca557832ab941a50b4a11f83478cf141f51f933f653ab9fbcc05a037cddbed06e309bf334942c4e58cdf1a46e237911ccd7fcf9787cbc7fd0' },
  { algo: 'blake2s256', expected: '9aec6806794561107e594b1f6a8a6b0c92a0cba9acf5e5e93cca06f781813b0b' },
];

console.log('1. 基础哈希算法验证：\n');
let passed = 0;
let failed = 0;

for (const test of hashTests) {
  const actual = crypto.createHash(test.algo).update(testData).digest('hex');
  const match = actual === test.expected;
  
  if (match) {
    console.log(`✅ ${test.algo}`);
    passed++;
  } else {
    console.log(`❌ ${test.algo}`);
    console.log(`   预期: ${test.expected}`);
    console.log(`   实际: ${actual}`);
    failed++;
  }
}

// SHAKE 自定义长度
console.log('\n2. SHAKE 自定义长度验证：\n');

const shake128_32_expected = '3a9159f071e4dd1c8c4f968607c30942e120d8156b8b1e72e0d376e8871cb8b8';
const shake128_32_actual = crypto.createHash('shake128', {outputLength: 32}).update(testData).digest('hex');
if (shake128_32_actual === shake128_32_expected) {
  console.log('✅ shake128 (outputLength: 32)');
  passed++;
} else {
  console.log('❌ shake128 (outputLength: 32)');
  console.log(`   预期: ${shake128_32_expected}`);
  console.log(`   实际: ${shake128_32_actual}`);
  failed++;
}

const shake256_64_expected = '369771bb2cb9d2b04c1d54cca487e372d9f187f73f7ba3f65b95c8ee7798c527f4f3c2d55c2d46a29f2e945d469c3df27853a8735271f5cc2d9e889544357116';
const shake256_64_actual = crypto.createHash('shake256', {outputLength: 64}).update(testData).digest('hex');
if (shake256_64_actual === shake256_64_expected) {
  console.log('✅ shake256 (outputLength: 64)');
  passed++;
} else {
  console.log('❌ shake256 (outputLength: 64)');
  console.log(`   预期: ${shake256_64_expected}`);
  console.log(`   实际: ${shake256_64_actual}`);
  failed++;
}

// HMAC 验证
console.log('\n3. HMAC 验证：\n');

const hmacTests = [
  { algo: 'sha3-256', expected: '176bf60719f9809d8443b122c7556e57b829c88d69153a15379f842836bea463' },
  { algo: 'sha3-512', expected: 'b785e48150b9581afb667244da31772c742b296983cfbaf87c8ae9148914d56bf4b91b84cadd2fef6e95100aeb47e21fe7a99d9356b3a698742ff5fd12aff00a' },
  { algo: 'blake2b512', expected: 'b82e377d5e890c45da2d753c220a53ed0268b8217f1e0723869c847e2a96157563d3e6381d2c2ab5934fd374f57eb5a2766ef3554c6873284c8da23d7166657f' },
  { algo: 'blake2s256', expected: 'fdda8a9c6545c60eb58b813ab1a04ea65cd9eb40d8e08915fece4626e2a0a708' },
  { algo: 'sha512-224', expected: 'e4f1c084cf6dcd88c3e4c7c13d01dd8aaeadfefa7de3a7cb65d66888' },
];

for (const test of hmacTests) {
  const actual = crypto.createHmac(test.algo, key).update(testData).digest('hex');
  const match = actual === test.expected;
  
  if (match) {
    console.log(`✅ HMAC-${test.algo}`);
    passed++;
  } else {
    console.log(`❌ HMAC-${test.algo}`);
    console.log(`   预期: ${test.expected}`);
    console.log(`   实际: ${actual}`);
    failed++;
  }
}

// SHAKE 拒绝 HMAC
console.log('\n4. SHAKE 不支持 HMAC（预期拒绝）：\n');

let shakeRejected = 0;
for (const algo of ['shake128', 'shake256']) {
  try {
    crypto.createHmac(algo, key);
    console.log(`❌ ${algo} HMAC 应该被拒绝但成功了`);
  } catch (e) {
    console.log(`✅ ${algo} HMAC 正确拒绝`);
    shakeRejected++;
  }
}

// copy() 方法测试
console.log('\n5. copy() 方法验证：\n');

const copyTests = ['sha3-256', 'shake128', 'blake2b512'];
let copyPassed = 0;

for (const algo of copyTests) {
  try {
    const h = crypto.createHash(algo);
    h.update('part1');
    const copy1 = h.copy();
    h.update('part2');
    const hash1 = h.digest('hex');
    const hash2 = copy1.digest('hex');
    
    if (hash1 !== hash2) {
      console.log(`✅ ${algo} copy() 工作正常（副本独立）`);
      copyPassed++;
    } else {
      console.log(`❌ ${algo} copy() 失败（副本不独立）`);
    }
  } catch (e) {
    console.log(`❌ ${algo} copy() 抛出错误: ${e.message}`);
  }
}

// digest() 后禁止操作
console.log('\n6. digest() 后状态检查：\n');

let digestCheckPassed = 0;
for (const algo of ['sha3-256', 'blake2b512']) {
  try {
    const h = crypto.createHash(algo);
    h.update('data');
    h.digest();
    
    // 尝试再次 digest()
    try {
      h.digest();
      console.log(`❌ ${algo} 允许重复 digest()`);
    } catch (e) {
      digestCheckPassed++;
    }
    
    // 尝试 update()
    try {
      h.update('more');
      console.log(`❌ ${algo} 允许 digest() 后 update()`);
    } catch (e) {
      digestCheckPassed++;
    }
    
    // 尝试 copy()
    try {
      h.copy();
      console.log(`❌ ${algo} 允许 digest() 后 copy()`);
    } catch (e) {
      digestCheckPassed++;
    }
    
  } catch (e) {
    console.log(`❌ ${algo} digest 检查失败: ${e.message}`);
  }
}

if (digestCheckPassed === 6) {
  console.log(`✅ digest() 后正确拒绝所有操作 (${digestCheckPassed}/6)`);
}

console.log('\n===== 最终统计 =====\n');
console.log(`哈希算法: ${passed}/${hashTests.length + 2 + hmacTests.length} 通过`);
console.log(`SHAKE 拒绝: ${shakeRejected}/2 正确`);
console.log(`copy() 测试: ${copyPassed}/${copyTests.length} 通过`);
console.log(`digest() 检查: ${digestCheckPassed}/6 通过`);

const totalTests = hashTests.length + 2 + hmacTests.length + 2 + copyTests.length + 6;
const totalPassed = passed + shakeRejected + copyPassed + digestCheckPassed;

console.log(`\n总计: ${totalPassed}/${totalTests} 测试通过`);

if (totalPassed === totalTests) {
  console.log('\n🎉 完美！所有测试通过，与 Node.js 100% 一致！');
} else {
  console.log(`\n⚠️ 有 ${totalTests - totalPassed} 个测试失败`);
}

