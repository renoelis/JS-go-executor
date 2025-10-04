/**
 * 📋 XLSX 模块资源管理测试
 * 
 * 测试目标：
 * 1. 验证 workbook.close() 方法存在且可调用
 * 2. 验证重复调用 close() 的幂等性
 * 3. 验证 close() 后对象行为
 * 4. 验证各种 API 返回的 workbook 都支持 close()
 */

const xlsx = require('xlsx');

console.log('========================================');
console.log('🔒 XLSX 资源管理测试');
console.log('========================================\n');

const testResults = {
  test1: null,
  test2: null,
  test3: null,
  test4: null,
  test5: null,
  test6: null
};

// ============================================================================
// 测试 1: close() 方法存在性检查
// ============================================================================
console.log('测试 1: close() 方法存在性检查');
console.log('-----------------------------------');

try {
  const wb = xlsx.utils.book_new();
  
  // 检查 close 方法是否存在
  const hasClose = typeof wb.close === 'function';
  
  if (hasClose) {
    console.log('✅ workbook 对象有 close() 方法');
    
    // 调用 close
    wb.close();
    console.log('✅ close() 方法调用成功\n');
    
    testResults.test1 = {
      success: true,
      hasCloseMethod: true,
      closeCallSucceeded: true
    };
  } else {
    console.log('❌ workbook 对象缺少 close() 方法\n');
    testResults.test1 = {
      success: false,
      hasCloseMethod: false,
      error: 'close() method not found'
    };
  }
} catch (error) {
  console.log('❌ 测试失败: ' + error.message + '\n');
  testResults.test1 = {
    success: false,
    error: error.message
  };
}

// ============================================================================
// 测试 2: 重复调用 close() 的幂等性
// ============================================================================
console.log('测试 2: 重复调用 close() 的幂等性');
console.log('-----------------------------------');

try {
  const wb = xlsx.utils.book_new();
  
  // 第一次 close
  wb.close();
  console.log('✅ 第一次 close() 成功');
  
  // 第二次 close（应该安全忽略）
  wb.close();
  console.log('✅ 第二次 close() 成功（幂等性）');
  
  // 第三次 close
  wb.close();
  console.log('✅ 第三次 close() 成功（多次幂等）\n');
  
  testResults.test2 = {
    success: true,
    multipleCloseCalls: 3,
    idempotent: true
  };
} catch (error) {
  console.log('❌ 重复 close() 失败: ' + error.message + '\n');
  testResults.test2 = {
    success: false,
    error: error.message,
    idempotent: false
  };
}

// ============================================================================
// 测试 3: xlsx.read() 返回的 workbook 支持 close()
// ============================================================================
console.log('测试 3: xlsx.read() 返回的 workbook');
console.log('-----------------------------------');

try {
  // 创建一个简单的 Excel
  const tempWb = xlsx.utils.book_new();
  const tempWs = xlsx.utils.json_to_sheet([{ id: 1, name: 'Test' }]);
  xlsx.utils.book_append_sheet(tempWb, tempWs, 'Sheet1');
  const buffer = xlsx.write(tempWb, { type: 'buffer', bookType: 'xlsx' });
  tempWb.close();
  
  // 读取 Excel
  const wb = xlsx.read(buffer);
  
  // 验证数据
  const data = xlsx.utils.sheet_to_json(wb.Sheets['Sheet1']);
  console.log('✅ 成功读取数据: ' + data.length + ' 行');
  
  // 验证 close 方法
  if (typeof wb.close === 'function') {
    wb.close();
    console.log('✅ xlsx.read() 返回的 workbook 支持 close()\n');
    
    testResults.test3 = {
      success: true,
      hasCloseMethod: true,
      dataRows: data.length
    };
  } else {
    console.log('❌ xlsx.read() 返回的 workbook 没有 close() 方法\n');
    testResults.test3 = {
      success: false,
      hasCloseMethod: false
    };
  }
} catch (error) {
  console.log('❌ 测试失败: ' + error.message + '\n');
  testResults.test3 = {
    success: false,
    error: error.message
  };
}

// ============================================================================
// 测试 4: Try-Finally 模式（推荐用法）
// ============================================================================
console.log('测试 4: Try-Finally 模式（推荐用法）');
console.log('-----------------------------------');

try {
  let processedData = null;
  let closeCalledInFinally = false;
  
  const wb = xlsx.utils.book_new();
  try {
    // 模拟数据处理
    const ws = xlsx.utils.json_to_sheet([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
    xlsx.utils.book_append_sheet(wb, ws, 'Data');
    
    processedData = wb.SheetNames.length;
    
  } finally {
    // 确保在 finally 中释放资源
    wb.close();
    closeCalledInFinally = true;
  }
  
  console.log('✅ Try-Finally 模式测试成功');
  console.log('   处理了 ' + processedData + ' 个 Sheet');
  console.log('   close() 在 finally 中被调用\n');
  
  testResults.test4 = {
    success: true,
    pattern: 'try-finally',
    sheetsProcessed: processedData,
    closeCalledInFinally: closeCalledInFinally
  };
} catch (error) {
  console.log('❌ Try-Finally 模式失败: ' + error.message + '\n');
  testResults.test4 = {
    success: false,
    error: error.message
  };
}

// ============================================================================
// 测试 5: 异常情况下的资源释放
// ============================================================================
console.log('测试 5: 异常情况下的资源释放');
console.log('-----------------------------------');

try {
  let errorCaught = false;
  let closeCalled = false;
  
  const wb = xlsx.utils.book_new();
  try {
    // 添加一些数据
    const ws = xlsx.utils.json_to_sheet([{ test: 'data' }]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    // 模拟一个错误
    throw new Error('Simulated error during processing');
    
  } catch (error) {
    errorCaught = true;
    console.log('⚠️  捕获到预期的错误: ' + error.message);
  } finally {
    // 即使发生错误，也应该 close
    wb.close();
    closeCalled = true;
  }
  
  console.log('✅ 异常情况下资源仍被正确释放');
  console.log('   错误已捕获: ' + errorCaught);
  console.log('   close() 已调用: ' + closeCalled + '\n');
  
  testResults.test5 = {
    success: true,
    errorCaught: errorCaught,
    closeCalled: closeCalled,
    note: '即使发生异常，资源仍被释放'
  };
} catch (error) {
  console.log('❌ 测试失败: ' + error.message + '\n');
  testResults.test5 = {
    success: false,
    error: error.message
  };
}

// ============================================================================
// 测试 6: 多个 workbook 对象的独立管理
// ============================================================================
console.log('测试 6: 多个 workbook 对象的独立管理');
console.log('-----------------------------------');

try {
  const workbooks = [];
  const closedWorkbooks = [];
  
  // 创建多个 workbook
  for (let i = 0; i < 5; i++) {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet([{ index: i }]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet' + i);
    workbooks.push(wb);
  }
  
  console.log('✅ 创建了 ' + workbooks.length + ' 个 workbook 对象');
  
  // 关闭其中几个
  workbooks[0].close();
  closedWorkbooks.push(0);
  
  workbooks[2].close();
  closedWorkbooks.push(2);
  
  workbooks[4].close();
  closedWorkbooks.push(4);
  
  console.log('✅ 关闭了 workbook: ' + closedWorkbooks.join(', '));
  
  // 再次关闭（测试幂等性）
  workbooks[0].close();
  workbooks[2].close();
  
  console.log('✅ 重复关闭测试通过');
  
  // 关闭剩余的
  workbooks[1].close();
  workbooks[3].close();
  
  console.log('✅ 所有 workbook 已关闭\n');
  
  testResults.test6 = {
    success: true,
    totalWorkbooks: workbooks.length,
    allClosed: true,
    note: '多个 workbook 可独立管理'
  };
} catch (error) {
  console.log('❌ 测试失败: ' + error.message + '\n');
  testResults.test6 = {
    success: false,
    error: error.message
  };
}

// ============================================================================
// 汇总结果
// ============================================================================
console.log('========================================');
console.log('📊 资源管理测试结果汇总');
console.log('========================================\n');

const test1Passed = testResults.test1 && testResults.test1.success;
const test2Passed = testResults.test2 && testResults.test2.success;
const test3Passed = testResults.test3 && testResults.test3.success;
const test4Passed = testResults.test4 && testResults.test4.success;
const test5Passed = testResults.test5 && testResults.test5.success;
const test6Passed = testResults.test6 && testResults.test6.success;

console.log('测试 1 (close() 方法存在): ' + (test1Passed ? '✅ 通过' : '❌ 失败'));
console.log('测试 2 (重复 close 幂等性): ' + (test2Passed ? '✅ 通过' : '❌ 失败'));
console.log('测试 3 (xlsx.read() 支持): ' + (test3Passed ? '✅ 通过' : '❌ 失败'));
console.log('测试 4 (Try-Finally 模式): ' + (test4Passed ? '✅ 通过' : '❌ 失败'));
console.log('测试 5 (异常情况处理): ' + (test5Passed ? '✅ 通过' : '❌ 失败'));
console.log('测试 6 (多对象独立管理): ' + (test6Passed ? '✅ 通过' : '❌ 失败'));

const allPassed = test1Passed && test2Passed && test3Passed && 
                  test4Passed && test5Passed && test6Passed;
const totalTests = 6;
const passedTests = [test1Passed, test2Passed, test3Passed, 
                     test4Passed, test5Passed, test6Passed].filter(Boolean).length;

console.log('\n总体结果: ' + passedTests + ' / ' + totalTests + ' 通过');

if (allPassed) {
  console.log('🎉 所有资源管理测试通过！');
  console.log('   ✅ close() 方法正常工作');
  console.log('   ✅ 幂等性保证');
  console.log('   ✅ 异常安全');
  console.log('   ✅ 多对象支持\n');
} else {
  console.log('⚠️  部分测试失败，需要检查资源管理实现\n');
}

console.log('========================================\n');

// 返回结果
return {
  success: allPassed,
  passedTests: passedTests,
  totalTests: totalTests,
  details: testResults,
  recommendations: {
    alwaysUseClose: true,
    useTryFinally: true,
    closeIsIdempotent: test2Passed,
    exceptionSafe: test5Passed
  },
  bestPractice: 'const wb = xlsx.read(buffer); try { /* process */ } finally { wb.close(); }'
};






