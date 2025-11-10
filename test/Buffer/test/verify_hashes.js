// 精确验证哈希值是否与 Node.js 一致
const crypto = require('crypto');

const testData = 'hello world';
const key = 'secret';

// Node.js 标准结果（从上面的测试获得）
const expected = {
  'sha512-224': '22e0d52336f64a998085078b05a6e37b26f8120f43bf4db4c43a64ee',
  'sha512-256': '0ac561fac838104e3f2e4ad107b4bee3e938bf15f2b15f009ccccd61a913f017',
  'sha3-224': 'dfb7f18c77e928bb56faeb2da27291bd790bc1045cde45f3210bb6c5',
  'sha3-256': '644bcc7e564373040999aac89e7622f3ca71fba1d972fd94a31c3bfbf24e3938',
  'sha3-384': '83bff28dde1b1bf5810071c6643c08e5b05bdb836effd70b403ea8ea0a634dc4997eb1053aa3593f590f9c63630dd90b',
  'sha3-512': '840006653e9ac9e95117a15c915caab81662918e925de9e004f774ff82d7079a40d4d27b1b372657c61d46d470304c88c788b3a4527ad074d1dccbee5dbaa99a',
  'shake128': '3a9159f071e4dd1c8c4f968607c30942',
  'shake256': '369771bb2cb9d2b04c1d54cca487e372d9f187f73f7ba3f65b95c8ee7798c527',
  'blake2b512': '021ced8799296ceca557832ab941a50b4a11f83478cf141f51f933f653ab9fbcc05a037cddbed06e309bf334942c4e58cdf1a46e237911ccd7fcf9787cbc7fd0',
  'blake2s256': '9aec6806794561107e594b1f6a8a6b0c92a0cba9acf5e5e93cca06f781813b0b',
};

const hmacExpected = {
  'sha3-256': '176bf60719f9809d8443b122c7556e57b829c88d69153a15379f842836bea463',
  'sha3-512': 'b785e48150b9581afb667244da31772c742b296983cfbaf87c8ae9148914d56bf4b91b84cadd2fef6e95100aeb47e21fe7a99d9356b3a698742ff5fd12aff00a',
  'blake2b512': 'b82e377d5e890c45da2d753c220a53ed0268b8217f1e0723869c847e2a96157563d3e6381d2c2ab5934fd374f57eb5a2766ef3554c6873284c8da23d7166657f',
  'blake2s256': 'fdda8a9c6545c60eb58b813ab1a04ea65cd9eb40d8e08915fece4626e2a0a708',
  'sha512-224': 'e4f1c084cf6dcd88c3e4c7c13d01dd8aaeadfefa7de3a7cb65d66888',
};

console.log('===== 验证哈希结果 =====\n');

let passed = 0;
let failed = 0;

// 验证 Hash
for (const [algo, expectedHash] of Object.entries(expected)) {
  const actual = crypto.createHash(algo).update(testData).digest('hex');
  if (actual === expectedHash) {
    console.log(`✅ ${algo}: 一致`);
    passed++;
  } else {
    console.log(`❌ ${algo}: 不一致`);
    console.log(`   预期: ${expectedHash}`);
    console.log(`   实际: ${actual}`);
    failed++;
  }
}

// 验证 HMAC
console.log('\n===== 验证 HMAC 结果 =====\n');

for (const [algo, expectedHash] of Object.entries(hmacExpected)) {
  const actual = crypto.createHmac(algo, key).update(testData).digest('hex');
  if (actual === expectedHash) {
    console.log(`✅ HMAC-${algo}: 一致`);
    passed++;
  } else {
    console.log(`❌ HMAC-${algo}: 不一致`);
    console.log(`   预期: ${expectedHash}`);
    console.log(`   实际: ${actual}`);
    failed++;
  }
}

// 验证 SHAKE 自定义长度
console.log('\n===== 验证 SHAKE 自定义长度 =====\n');

const shake128_32 = crypto.createHash('shake128', {outputLength: 32}).update(testData).digest('hex');
const shake256_64 = crypto.createHash('shake256', {outputLength: 64}).update(testData).digest('hex');

if (shake128_32 === '3a9159f071e4dd1c8c4f968607c30942e120d8156b8b1e72e0d376e8871cb8b8') {
  console.log('✅ shake128 (32 bytes): 一致');
  passed++;
} else {
  console.log('❌ shake128 (32 bytes): 不一致');
  console.log(`   实际: ${shake128_32}`);
  failed++;
}

if (shake256_64 === '369771bb2cb9d2b04c1d54cca487e372d9f187f73f7ba3f65b95c8ee7798c527f4f3c2d55c2d46a29f2e945d469c3df27853a8735271f5cc2d9e889544357116') {
  console.log('✅ shake256 (64 bytes): 一致');
  passed++;
} else {
  console.log('❌ shake256 (64 bytes): 不一致');
  console.log(`   实际: ${shake256_64}`);
  failed++;
}

console.log(`\n===== 总结 =====`);
console.log(`通过: ${passed}, 失败: ${failed}`);
if (failed === 0) {
  console.log('🎉 所有测试通过！与 Node.js 100% 一致！');
} else {
  console.log('⚠️ 有测试失败，需要检查实现');
}

