/**
 * Web Streams API 标准合规性测试
 * 
 * 测试目标：
 * 验证实现完全符合 Web Streams API 标准：
 * - done=false 时，value 包含数据
 * - done=true 时，value 总是 undefined
 * - 永远不会同时返回 done=true 和有效的 value
 */

const axios = require('axios');

console.log('=== Web Streams API 标准合规性测试 ===\n');

async function testStandardCompliance() {
  const results = {
    tests: [],
    passed: 0,
    failed: 0
  };

  // 测试 1: 验证标准写法
  console.log('【测试 1】标准写法验证');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', {
      responseType: 'stream'
    });
    
    const reader = response.data.getReader();
    let chunks = [];
    let readCount = 0;
    let doneWithValueCount = 0; // 记录 done=true 且 value 不为 undefined 的次数
    
    // 标准写法：先检查 done，再处理 value
    while (true) {
      const { done, value } = await reader.read();
      readCount++;
      
      console.log(`   读取 ${readCount}: done=${done}, value=${value ? '有数据' : 'undefined'}, 长度=${value ? value.byteLength : 'N/A'}`);
      
      // 🔥 关键检查：done=true 时，value 必须是 undefined
      if (done && value !== undefined) {
        doneWithValueCount++;
        console.error(`   ❌ 错误！done=true 时 value 应该是 undefined，但实际有值`);
      }
      
      if (done) {
        console.log('   ✅ 流结束（done=true, value=undefined）');
        break;
      }
      
      // done=false 时处理数据
      chunks.push(Buffer.from(value));
    }
    
    const buffer = Buffer.concat(chunks);
    const data = JSON.parse(buffer.toString('utf-8'));
    
    console.log(`\n结果:`);
    console.log(`   总读取次数: ${readCount}`);
    console.log(`   数据大小: ${buffer.length} 字节`);
    console.log(`   解析数据: id=${data.id}, title=${data.title.substring(0, 30)}...`);
    console.log(`   违规次数: ${doneWithValueCount} (应该是 0)`);
    
    if (doneWithValueCount === 0) {
      console.log('\n✅ 测试 1 通过 - 完全符合标准');
      results.tests.push({ name: '标准写法验证', status: 'passed' });
      results.passed++;
    } else {
      console.log('\n❌ 测试 1 失败 - 不符合标准');
      results.tests.push({ name: '标准写法验证', status: 'failed' });
      results.failed++;
    }
    
  } catch (error) {
    console.error('❌ 测试 1 异常:', error.message);
    results.tests.push({ name: '标准写法验证', status: 'error', error: error.message });
    results.failed++;
  }

  // 测试 2: 验证多次读取
  console.log('\n\n【测试 2】多次读取验证');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts', {
      responseType: 'stream'
    });
    
    const reader = response.data.getReader();
    let iterations = 0;
    let hasError = false;
    
    while (true) {
      const { done, value } = await reader.read();
      iterations++;
      
      // 检查标准合规性
      if (done) {
        if (value !== undefined) {
          console.error(`   ❌ 第 ${iterations} 次读取：done=true 但 value 不是 undefined`);
          hasError = true;
        } else {
          console.log(`   ✅ 第 ${iterations} 次读取：done=true, value=undefined（正确）`);
        }
        break;
      } else {
        if (!value || value.byteLength === 0) {
          console.error(`   ❌ 第 ${iterations} 次读取：done=false 但 value 为空`);
          hasError = true;
        } else {
          console.log(`   ✅ 第 ${iterations} 次读取：done=false, value.byteLength=${value.byteLength}`);
        }
      }
    }
    
    console.log(`\n总迭代次数: ${iterations}`);
    
    if (!hasError) {
      console.log('✅ 测试 2 通过 - 所有读取都符合标准');
      results.tests.push({ name: '多次读取验证', status: 'passed' });
      results.passed++;
    } else {
      console.log('❌ 测试 2 失败 - 存在不符合标准的读取');
      results.tests.push({ name: '多次读取验证', status: 'failed' });
      results.failed++;
    }
    
  } catch (error) {
    console.error('❌ 测试 2 异常:', error.message);
    results.tests.push({ name: '多次读取验证', status: 'error', error: error.message });
    results.failed++;
  }

  // 测试 3: 小文件测试（最容易出问题）
  console.log('\n\n【测试 3】小文件测试（关键测试）');
  console.log('-'.repeat(60));
  
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', {
      responseType: 'stream'
    });
    
    const reader = response.data.getReader();
    let firstRead = await reader.read();
    let secondRead = await reader.read();
    
    console.log(`第 1 次读取: done=${firstRead.done}, hasValue=${firstRead.value !== undefined}`);
    console.log(`第 2 次读取: done=${secondRead.done}, hasValue=${secondRead.value !== undefined}`);
    
    let isCorrect = true;
    let reason = '';
    
    // 情况 1: 第一次读取就完成（小文件）
    if (firstRead.done && firstRead.value === undefined) {
      console.log('✅ 情况 1：第一次读取返回 done=true, value=undefined（正确）');
    }
    // 情况 2: 第一次有数据，第二次完成
    else if (!firstRead.done && firstRead.value !== undefined && 
             secondRead.done && secondRead.value === undefined) {
      console.log('✅ 情况 2：第一次有数据，第二次 done=true（正确）');
    }
    // 情况 3: 错误 - done=true 但有数据
    else if (firstRead.done && firstRead.value !== undefined) {
      console.error('❌ 错误：第一次 done=true 但 value 不是 undefined');
      isCorrect = false;
      reason = '违反标准：done=true 时 value 应该是 undefined';
    }
    else if (secondRead.done && secondRead.value !== undefined) {
      console.error('❌ 错误：第二次 done=true 但 value 不是 undefined');
      isCorrect = false;
      reason = '违反标准：done=true 时 value 应该是 undefined';
    }
    
    if (isCorrect) {
      console.log('\n✅ 测试 3 通过 - 小文件处理符合标准');
      results.tests.push({ name: '小文件测试', status: 'passed' });
      results.passed++;
    } else {
      console.log(`\n❌ 测试 3 失败 - ${reason}`);
      results.tests.push({ name: '小文件测试', status: 'failed', reason: reason });
      results.failed++;
    }
    
  } catch (error) {
    console.error('❌ 测试 3 异常:', error.message);
    results.tests.push({ name: '小文件测试', status: 'error', error: error.message });
    results.failed++;
  }

  // 汇总
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 测试汇总');
  console.log('='.repeat(60));
  console.log(`总测试数: ${results.tests.length}`);
  console.log(`通过: ${results.passed} ✅`);
  console.log(`失败: ${results.failed} ❌`);
  console.log('');
  
  results.tests.forEach((test, i) => {
    const icon = test.status === 'passed' ? '✅' : '❌';
    console.log(`  ${i + 1}. ${test.name}: ${icon} ${test.status}`);
    if (test.reason) console.log(`     原因: ${test.reason}`);
    if (test.error) console.log(`     错误: ${test.error}`);
  });
  
  console.log('');
  
  if (results.failed === 0) {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🎉 完全符合 Web Streams API 标准！                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✨ 用户可以使用标准写法：');
    console.log('');
    console.log('   while (true) {');
    console.log('     const { done, value } = await reader.read();');
    console.log('     if (done) break;');
    console.log('     process(value);');
    console.log('   }');
    console.log('');
  } else {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  部分测试未通过，请检查实现                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  }
  
  return {
    success: results.failed === 0,
    message: results.failed === 0 ? 'All compliance tests passed' : 'Some tests failed',
    summary: {
      total: results.tests.length,
      passed: results.passed,
      failed: results.failed
    },
    tests: results.tests
  };
}

// 执行测试
return testStandardCompliance();



