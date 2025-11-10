// 快速测试所有 getHashes() 返回的算法是否真正可用
const crypto = require('crypto');

console.log('=== 测试所有算法是否可用 ===\n');

const allHashes = crypto.getHashes();
console.log(`总共 ${allHashes.length} 个算法\n`);

let successCount = 0;
let failCount = 0;
const failedAlgorithms = [];

for (const algo of allHashes) {
  try {
    const hash = crypto.createHash(algo);
    hash.update('test data');
    const result = hash.digest('hex');
    
    if (result && result.length > 0) {
      successCount++;
      console.log(`✅ ${algo} - OK (digest: ${result.substring(0, 16)}...)`);
    } else {
      failCount++;
      failedAlgorithms.push({ algo, reason: '空输出' });
      console.log(`❌ ${algo} - 失败: 空输出`);
    }
  } catch (error) {
    failCount++;
    failedAlgorithms.push({ algo, reason: error.message });
    console.log(`❌ ${algo} - 失败: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('测试完成!');
console.log('='.repeat(70));
console.log(`✅ 成功: ${successCount}/${allHashes.length}`);
console.log(`❌ 失败: ${failCount}/${allHashes.length}`);
console.log(`成功率: ${((successCount / allHashes.length) * 100).toFixed(2)}%`);

if (failedAlgorithms.length > 0) {
  console.log('\n失败的算法:');
  failedAlgorithms.forEach(({ algo, reason }) => {
    console.log(`  - ${algo}: ${reason}`);
  });
  if (typeof process !== 'undefined' && typeof process.exit === 'function') {
    process.exit(1);
  }
} else {
  console.log('\n🎉 所有算法都可以正常使用！');
  if (typeof process !== 'undefined' && typeof process.exit === 'function') {
    process.exit(0);
  }
}

// 返回测试结果对象
return {
  total: allHashes.length,
  success: successCount,
  failed: failCount,
  successRate: ((successCount / allHashes.length) * 100).toFixed(2) + '%',
  failedAlgorithms: failedAlgorithms
};

