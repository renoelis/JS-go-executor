const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * generateKeyPair 全量测试汇总（包含补充测试）
 * 运行所有测试文件并汇总结果
 */

const testFiles = [
  // 基础功能测试
  'test_generateKeyPair_nodejs.js',
  'test_generateKeyPair_rsa.js',
  'test_generateKeyPair_ec.js',
  'test_generateKeyPair_ed.js',
  'test_generateKeyPair_x.js',
  'test_generateKeyPair_dsa_dh.js',
  
  // 错误处理测试
  'test_generateKeyPair_errors.js',
  'test_generateKeyPair_error_codes.js',
  'test_generateKeyPair_error_object_integrity.js',
  
  // 异步测试
  'test_generateKeyPair_async.js',
  'test_generateKeyPair_promise.js',
  
  // 编码和格式测试
  'test_generateKeyPair_keyobject.js',
  'test_generateKeyPair_encoding_combos.js',
  'test_generateKeyPair_jwk_deep.js',
  'test_generateKeyPair_jwk_roundtrip.js',
  
  // 边界和极端值测试
  'test_generateKeyPair_boundary.js',
  'test_generateKeyPair_extreme_boundaries.js',
  'test_generateKeyPair_null_undefined_nan.js',
  
  // 参数验证测试
  'test_generateKeyPair_options_validation.js',
  'test_generateKeyPair_dsa_invalid_combos.js',
  
  // 曲线和算法测试
  'test_generateKeyPair_ec_curves.js',
  'test_generateKeyPair_curve_aliases.js',
  'test_generateKeyPair_dh_standard_groups.js',
  'test_generateKeyPair_cipher_algorithms.js',
  'test_generateKeyPair_rsa_pss_advanced.js',
  
  // 加密和密码测试
  'test_generateKeyPair_encrypted_key_decrypt.js',
  'test_generateKeyPair_passphrase_edge_cases.js',
  
  // 实际应用测试
  'test_generateKeyPair_actual_usage.js',
  
  // 性能和压力测试
  'test_generateKeyPair_concurrency.js',
  'test_generateKeyPair_true_concurrency.js',
  'test_generateKeyPair_memory_stress.js'
];

const allResults = {
  totalFiles: testFiles.length,
  successFiles: 0,
  failedFiles: 0,
  totalTests: 0,
  totalPass: 0,
  totalFail: 0,
  fileResults: [],
  startTime: new Date().toISOString()
};

async function runTestFile(filename) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`运行测试文件: ${filename}`);
  console.log('='.repeat(80));
  
  try {
    const testPath = path.join(__dirname, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(testPath)) {
      console.log(`⚠️  文件不存在: ${filename}`);
      return {
        file: filename,
        success: false,
        error: '文件不存在',
        summary: { total: 0, pass: 0, fail: 0 }
      };
    }
    
    // 读取并执行测试文件
    const testCode = fs.readFileSync(testPath, 'utf8');
    
    // 使用 Function 构造器执行测试
    const testFunction = new Function('require', 'crypto', 'console', `
      ${testCode}
    `);
    
    const result = await testFunction(require, crypto, console);
    
    const fileResult = {
      file: filename,
      success: result.success,
      summary: result.summary || { total: 0, pass: 0, fail: 0 },
      detail: result.detail || []
    };
    
    allResults.totalTests += fileResult.summary.total;
    allResults.totalPass += fileResult.summary.pass;
    allResults.totalFail += fileResult.summary.fail;
    
    if (fileResult.success) {
      allResults.successFiles++;
    } else {
      allResults.failedFiles++;
    }
    
    allResults.fileResults.push(fileResult);
    
    console.log(`\n✅ ${filename} 完成: ${fileResult.summary.pass}/${fileResult.summary.total} 通过`);
    
    return fileResult;
    
  } catch (err) {
    console.error(`\n❌ ${filename} 执行失败:`, err.message);
    
    const fileResult = {
      file: filename,
      success: false,
      error: err.message,
      stack: err.stack,
      summary: { total: 0, pass: 0, fail: 0 }
    };
    
    allResults.failedFiles++;
    allResults.fileResults.push(fileResult);
    
    return fileResult;
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║            crypto.generateKeyPair 完整测试套件（含补充测试）              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  for (const file of testFiles) {
    await runTestFile(file);
  }
  
  // 输出最终汇总
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           最终测试汇总                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  console.log('文件统计:');
  console.log(`  总测试文件: ${allResults.totalFiles}`);
  console.log(`  成功文件: ${allResults.successFiles} ✅`);
  console.log(`  失败文件: ${allResults.failedFiles} ❌`);
  console.log('');
  
  console.log('测试用例统计:');
  console.log(`  总测试用例: ${allResults.totalTests}`);
  console.log(`  通过用例: ${allResults.totalPass} ✅`);
  console.log(`  失败用例: ${allResults.totalFail} ❌`);
  console.log(`  总成功率: ${((allResults.totalPass / allResults.totalTests) * 100).toFixed(2)}%`);
  console.log('');
  
  console.log('测试分类:');
  console.log(`  基础功能: 6 个文件`);
  console.log(`  错误处理: 3 个文件`);
  console.log(`  异步测试: 2 个文件`);
  console.log(`  编码格式: 4 个文件`);
  console.log(`  边界测试: 3 个文件`);
  console.log(`  参数验证: 2 个文件`);
  console.log(`  算法测试: 5 个文件`);
  console.log(`  加密测试: 2 个文件`);
  console.log(`  应用测试: 1 个文件`);
  console.log(`  压力测试: 3 个文件`);
  console.log('');
  
  console.log('各文件详情:');
  for (const fileResult of allResults.fileResults) {
    const status = fileResult.success ? '✅' : '❌';
    const percent = fileResult.summary.total > 0 
      ? ((fileResult.summary.pass / fileResult.summary.total) * 100).toFixed(1)
      : '0.0';
    
    console.log(`  ${status} ${fileResult.file}`);
    console.log(`     ${fileResult.summary.pass}/${fileResult.summary.total} 通过 (${percent}%)`);
    
    if (fileResult.error) {
      console.log(`     错误: ${fileResult.error}`);
    }
  }
  
  console.log('\n');
  
  if (allResults.totalFail > 0) {
    console.log('失败的测试用例:');
    for (const fileResult of allResults.fileResults) {
      const failedTests = fileResult.detail?.filter(d => !d.pass) || [];
      if (failedTests.length > 0) {
        console.log(`\n  📁 ${fileResult.file}:`);
        for (const test of failedTests) {
          console.log(`    ❌ ${test.case}`);
          console.log(`       期望: ${test.expect}`);
          console.log(`       实际: ${test.got}`);
          if (test.error) {
            console.log(`       错误: ${test.error.substring(0, 100)}...`);
          }
        }
      }
    }
  }
  
  allResults.endTime = new Date().toISOString();
  
  const finalResult = {
    success: allResults.failedFiles === 0 && allResults.totalFail === 0,
    summary: {
      files: {
        total: allResults.totalFiles,
        success: allResults.successFiles,
        failed: allResults.failedFiles
      },
      tests: {
        total: allResults.totalTests,
        pass: allResults.totalPass,
        fail: allResults.totalFail
      },
      successRate: `${((allResults.totalPass / allResults.totalTests) * 100).toFixed(2)}%`
    },
    fileResults: allResults.fileResults,
    startTime: allResults.startTime,
    endTime: allResults.endTime
  };
  
  console.log('\n' + JSON.stringify(finalResult, null, 2));
  return finalResult;
}

// 运行所有测试
return runAllTests();



