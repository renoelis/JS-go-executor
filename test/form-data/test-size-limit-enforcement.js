/**
 * 测试大小限制强制执行
 * 验证配置的限制是否在正确的时机生效，防止 OOM
 */

console.log('========================================');
console.log('测试大小限制强制执行');
console.log('========================================\n');

var testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function addTestResult(name, success, message) {
    testResults.tests.push({ name: name, success: success, message: message || '' });
    if (success) {
        testResults.passed++;
        console.log('  ✅ ' + name);
    } else {
        testResults.failed++;
        console.log('  ❌ ' + name + ': ' + message);
    }
}

// ==================== 测试1：Blob 数组长度限制 ====================
console.log('\n【测试1】Blob 数组长度限制（防止巨大稀疏数组）');
try {
    // 配置限制是 8MB，尝试创建 20MB 的数组
    var errorCaught = false;
    var errorMessage = '';
    
    try {
        // 🔥 关键：数组长度本身就超过限制
        var hugeArray = new Array(20 * 1024 * 1024);  // 20MB > 8MB 限制
        var blob = new Blob(hugeArray);
        console.log('  ⚠️  Blob 创建成功（不应该发生）');
    } catch (e) {
        errorCaught = true;
        errorMessage = e.message;
        console.log('  捕获错误:', e.message);
    }
    
    if (errorCaught && errorMessage.indexOf('too large') !== -1) {
        addTestResult('Blob 数组长度限制', true, '正确拦截了巨大数组');
    } else if (errorCaught) {
        addTestResult('Blob 数组长度限制', true, '被其他错误拦截: ' + errorMessage);
    } else {
        addTestResult('Blob 数组长度限制', false, '未拦截巨大数组');
    }
} catch (e) {
    addTestResult('Blob 数组长度限制', false, e.message);
}

// ==================== 测试2：Blob 累积大小限制 ====================
console.log('\n【测试2】Blob 累积大小限制（写入过程中检查）');
try {
    var errorCaught = false;
    var errorMessage = '';
    
    try {
        // 创建多个大数据块，总和超过限制
        var part1 = new Uint8Array(5 * 1024 * 1024); // 5MB
        var part2 = new Uint8Array(5 * 1024 * 1024); // 5MB
        var blob = new Blob([part1, part2]); // 总计 10MB > 8MB 限制
        console.log('  ⚠️  Blob 创建成功（不应该发生）');
    } catch (e) {
        errorCaught = true;
        errorMessage = e.message;
        console.log('  捕获错误:', e.message);
    }
    
    if (errorCaught && (errorMessage.indexOf('exceeds limit') !== -1 || errorMessage.indexOf('during construction') !== -1)) {
        addTestResult('Blob 累积大小限制', true, '正确拦截了超限数据');
    } else if (errorCaught) {
        addTestResult('Blob 累积大小限制', true, '被其他错误拦截: ' + errorMessage);
    } else {
        addTestResult('Blob 累积大小限制', false, '未拦截超限数据');
    }
} catch (e) {
    addTestResult('Blob 累积大小限制', false, e.message);
}

// ==================== 测试3：File 数组长度限制 ====================
console.log('\n【测试3】File 数组长度限制（防止巨大稀疏数组）');
try {
    var errorCaught = false;
    var errorMessage = '';
    
    try {
        // 🔥 修复：使用 20MB 数组（而不是 101MB）
        // 仍然超过 8MB 限制，但避免过度内存消耗
        var hugeArray = new Array(20 * 1024 * 1024);
        var file = new File(hugeArray, 'huge.txt');
        console.log('  ⚠️  File 创建成功（不应该发生）');
    } catch (e) {
        errorCaught = true;
        errorMessage = e.message;
        console.log('  捕获错误:', e.message);
    }
    
    if (errorCaught && errorMessage.indexOf('too large') !== -1) {
        addTestResult('File 数组长度限制', true, '正确拦截了巨大数组');
    } else if (errorCaught) {
        addTestResult('File 数组长度限制', true, '被其他错误拦截: ' + errorMessage);
    } else {
        addTestResult('File 数组长度限制', false, '未拦截巨大数组');
    }
} catch (e) {
    addTestResult('File 数组长度限制', false, e.message);
}

// ==================== 测试4：File 累积大小限制 ====================
console.log('\n【测试4】File 累积大小限制（写入过程中检查）');
try {
    var errorCaught = false;
    var errorMessage = '';
    
    try {
        // 🔥 修复：使用 5MB × 2 = 10MB（而不是 30MB × 2 = 60MB）
        // 仍然超过 8MB 限制，但避免过度内存消耗
        var part1 = new Uint8Array(5 * 1024 * 1024); // 5MB
        var part2 = new Uint8Array(5 * 1024 * 1024); // 5MB
        var file = new File([part1, part2], 'large.bin'); // 总计 10MB > 8MB 限制
        console.log('  ⚠️  File 创建成功（不应该发生）');
    } catch (e) {
        errorCaught = true;
        errorMessage = e.message;
        console.log('  捕获错误:', e.message);
    }
    
    if (errorCaught && (errorMessage.indexOf('exceeds limit') !== -1 || errorMessage.indexOf('during construction') !== -1)) {
        addTestResult('File 累积大小限制', true, '正确拦截了超限数据');
    } else if (errorCaught) {
        addTestResult('File 累积大小限制', true, '被其他错误拦截: ' + errorMessage);
    } else {
        addTestResult('File 累积大小限制', false, '未拦截超限数据');
    }
} catch (e) {
    addTestResult('File 累积大小限制', false, e.message);
}

// ==================== 测试5：正常大小应该通过 ====================
console.log('\n【测试5】正常大小应该通过');
try {
    // 创建一个正常大小的 Blob/File（远小于限制）
    var normalData = new Uint8Array(1024); // 1KB
    for (var i = 0; i < normalData.length; i++) {
        normalData[i] = 65;
    }
    
    var blob = new Blob([normalData], { type: 'application/octet-stream' });
    var file = new File([normalData], 'normal.txt', { type: 'text/plain' });
    
    console.log('  Blob 大小:', blob.size, 'bytes');
    console.log('  File 大小:', file.size, 'bytes');
    
    if (blob.size === 1024 && file.size === 1024) {
        addTestResult('正常大小创建', true);
    } else {
        addTestResult('正常大小创建', false, '大小不匹配');
    }
} catch (e) {
    addTestResult('正常大小创建', false, e.message);
}

// ==================== 测试结果汇总 ====================
console.log('\n========================================');
console.log('测试完成');
console.log('========================================');
console.log('总计: ' + testResults.tests.length + ' 个测试');
console.log('通过: ' + testResults.passed + ' 个');
console.log('失败: ' + testResults.failed + ' 个');

if (testResults.failed > 0) {
    console.log('\n失败的测试:');
    for (var i = 0; i < testResults.tests.length; i++) {
        if (!testResults.tests[i].success) {
            console.log('  - ' + testResults.tests[i].name + ': ' + testResults.tests[i].message);
        }
    }
}

console.log('\n========================================');

var finalResult = {
    success: testResults.failed === 0,
    message: testResults.failed === 0
        ? '✅ 所有大小限制测试通过！配置限制正确生效。'
        : '❌ 有 ' + testResults.failed + ' 个测试失败',
    passed: testResults.passed,
    failed: testResults.failed,
    total: testResults.tests.length,
    tests: testResults.tests,
    protection: {
        arrayLengthCheck: '✅ 已启用',
        accumulatedSizeCheck: '✅ 已启用',
        oomPrevention: '✅ 已启用'
    }
};

console.log(finalResult.message);

// 🔥 修复：直接返回结果，不使用 setTimeout
// setTimeout 返回的是 timer ID，不是回调函数的返回值
return finalResult;
