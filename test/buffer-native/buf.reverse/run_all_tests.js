// Buffer.prototype.reverse() 所有测试的总运行脚本（支持格式转换）
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testDir = __dirname;
const testFiles = [
  'test_reverse_basic.js',
  'test_reverse_types.js',
  'test_reverse_errors.js',
  'test_reverse_side_effects.js',
  'test_reverse_edge_cases.js',
  'test_reverse_advanced_typedarray.js',
  'test_reverse_method_interactions.js',
  'test_reverse_complex_scenarios.js'
];

// 格式转换函数
function convertOldFormatToNew(oldResult) {
  if (!oldResult || typeof oldResult !== 'object') {
    return {
      success: false,
      summary: { total: 0, passed: 0, failed: 0, successRate: '0.00%' },
      tests: []
    };
  }

  // 如果已经是新格式，直接返回
  if (oldResult.summary && oldResult.tests && Array.isArray(oldResult.tests)) {
    return oldResult;
  }

  // 转换旧格式到新格式
  const cases = oldResult.cases || [];
  const tests = cases.map(c => ({
    name: c.name,
    status: c.passed ? '✅' : '❌'
  }));

  const passed = tests.filter(t => t.status === '✅').length;
  const failed = tests.filter(t => t.status === '❌').length;
  const total = tests.length;

  return {
    success: oldResult.success !== undefined ? oldResult.success : (failed === 0),
    summary: {
      total,
      passed,
      failed,
      successRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0.00%'
    },
    tests
  };
}

console.log('='.repeat(80));
console.log('Buffer.prototype.reverse() 完整测试套件');
console.log('='.repeat(80));
console.log('');

const results = [];
let totalCases = 0;
let totalPassed = 0;
let totalFailed = 0;

for (const testFile of testFiles) {
  const testPath = path.join(testDir, testFile);

  if (!fs.existsSync(testPath)) {
    console.log(`❌ 测试文件不存在: ${testFile}`);
    continue;
  }

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`运行测试: ${testFile}`);
  console.log('─'.repeat(80));

  try {
    const output = execSync(`node "${testPath}"`, {
      encoding: 'utf8',
      cwd: testDir,
      maxBuffer: 10 * 1024 * 1024
    });

    // 解析 JSON 结果
    const jsonMatch = output.match(/\{[\s\S]*\}(?![\s\S]*\{)/);
    if (jsonMatch) {
      const rawResult = JSON.parse(jsonMatch[0]);
      const result = convertOldFormatToNew(rawResult);
      results.push({ file: testFile, result });

      const casesCount = result.summary.total;
      const passedCount = result.summary.passed;
      const failedCount = result.summary.failed;

      totalCases += casesCount;
      totalPassed += passedCount;
      totalFailed += failedCount;

      console.log(`\n结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
      console.log(`测试用例: ${passedCount}/${casesCount} 通过`);
      console.log(`成功率: ${result.summary.successRate}`);
    } else {
      console.log('❌ 无法解析测试结果');
      results.push({ file: testFile, result: { success: false, error: '无法解析输出' } });
      totalFailed++;
    }
  } catch (error) {
    console.log(`❌ 执行测试失败: ${error.message}`);
    results.push({ file: testFile, result: { success: false, error: error.message } });
    totalFailed++;
  }
}

console.log('\n');
console.log('='.repeat(80));
console.log('测试汇总');
console.log('='.repeat(80));

results.forEach(({ file, result }) => {
  const status = result.success ? '✅' : '❌';
  const summary = result.summary;
  const casesInfo = summary ? `(${summary.passed}/${summary.total})` : '';
  console.log(`${status} ${file} ${casesInfo}`);
});

console.log('');
console.log('-'.repeat(80));
console.log(`总计: ${totalPassed}/${totalCases} 测试用例通过`);
console.log(`成功: ${totalPassed}`);
console.log(`失败: ${totalFailed}`);
console.log(`总成功率: ${totalCases > 0 ? ((totalPassed / totalCases) * 100).toFixed(2) : 0}%`);
console.log('='.repeat(80));

const allSuccess = results.every(r => r.result.success);
const finalResult = {
  success: allSuccess,
  totalTests: testFiles.length,
  totalCases,
  totalPassed,
  totalFailed,
  successRate: totalCases > 0 ? ((totalPassed / totalCases) * 100).toFixed(2) + '%' : '0%',
  results
};

console.log('\n完整结果 JSON:');
console.log(JSON.stringify(finalResult, null, 2));

process.exit(allSuccess ? 0 : 1);
