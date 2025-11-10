/**
 * 验证修复的快速测试
 * 测试两个已修复的问题
 */

console.log('========================================');
console.log('验证修复测试');
console.log('========================================\n');

var FormData = require('form-data');
//var Buffer = require('buffer').Buffer;

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

// ==================== 修复验证1：null/undefined 处理 ====================
console.log('【修复验证1】null/undefined 值处理');
try {
    var form1 = new FormData();
    
    // 应该不再抛出异常
    form1.append('nullfield', null);
    form1.append('undefinedfield', undefined);
    
    var buffer1 = form1.getBuffer();
    var content1 = buffer1.toString('utf8');
    
    // 检查字段是否存在
    var hasNullField = content1.indexOf('name="nullfield"') !== -1;
    var hasUndefinedField = content1.indexOf('name="undefinedfield"') !== -1;
    
    console.log('  null 字段存在: ' + hasNullField);
    console.log('  undefined 字段存在: ' + hasUndefinedField);
    
    if (hasNullField && hasUndefinedField) {
        addTestResult('null/undefined 值处理', true);
    } else {
        addTestResult('null/undefined 值处理', false, '字段未正确添加');
    }
} catch (e) {
    addTestResult('null/undefined 值处理', false, e.message);
}

// ==================== 修复验证2：文件名换行符处理 ====================
console.log('\n【修复验证2】文件名换行符处理');
try {
    var form2 = new FormData();
    
    // 文件名包含换行符
    var filenameWithNewline = 'my\nfile.txt';
    form2.append('file', Buffer.from('content'), filenameWithNewline);
    
    var buffer2 = form2.getBuffer();
    var content2 = buffer2.toString('utf8');
    
    console.log('  原始文件名: "my\\nfile.txt" (包含换行符)');
    
    // 检查 Content-Disposition header
    var dispositionMatch = content2.match(/Content-Disposition:[^\r\n]+/);
    if (!dispositionMatch) {
        throw new Error('Content-Disposition header 缺失');
    }
    
    var dispositionLine = dispositionMatch[0];
    console.log('  Content-Disposition: ' + dispositionLine);
    
    // 检查文件名是否存在
    var hasFilename = dispositionLine.indexOf('filename=') !== -1;
    
    // 检查文件名中的换行符是否被正确移除
    var filenameValid = dispositionLine.indexOf('my') !== -1 && 
                       dispositionLine.indexOf('file.txt') !== -1;
    
    // 关键：不应该有未转义的换行符
    var hasRawNewline = dispositionLine.indexOf('\n') !== -1;
    
    console.log('  文件名字段存在: ' + hasFilename);
    console.log('  文件名格式有效: ' + filenameValid);
    console.log('  包含原始换行符: ' + hasRawNewline);
    
    if (hasFilename && filenameValid && !hasRawNewline) {
        addTestResult('文件名换行符处理', true);
    } else {
        addTestResult('文件名换行符处理', false, '换行符未被正确处理');
    }
} catch (e) {
    addTestResult('文件名换行符处理', false, e.message);
}

// ==================== 额外测试：其他特殊字符 ====================
console.log('\n【额外验证】其他特殊字符处理');
try {
    var form3 = new FormData();
    
    // 测试多种特殊字符
    form3.append('file1', Buffer.from('c1'), 'file"quote".txt');      // 引号
    form3.append('file2', Buffer.from('c2'), 'file\rcarriage.txt');   // 回车
    form3.append('file3', Buffer.from('c3'), 'file\ttab.txt');        // 制表符
    form3.append('file4', Buffer.from('c4'), 'file\\backslash.txt');  // 反斜杠
    
    var buffer3 = form3.getBuffer();
    var content3 = buffer3.toString('utf8');
    
    // 检查所有 Content-Disposition header 格式是否正确
    var allHeaders = content3.match(/Content-Disposition:[^\r\n]+/g);
    
    var allValid = true;
    var details = [];
    
    if (allHeaders) {
        for (var i = 0; i < allHeaders.length; i++) {
            var header = allHeaders[i];
            
            // 不应该包含未转义的特殊字符
            var hasRawNewline = header.indexOf('\n') !== -1;
            var hasRawCarriage = header.indexOf('\r') !== -1;
            
            if (hasRawNewline || hasRawCarriage) {
                allValid = false;
                details.push('Header ' + (i + 1) + ' 包含未转义的控制字符');
            }
        }
    } else {
        allValid = false;
        details.push('未找到 Content-Disposition headers');
    }
    
    console.log('  检查了 ' + (allHeaders ? allHeaders.length : 0) + ' 个 headers');
    console.log('  所有 headers 格式有效: ' + allValid);
    
    if (allValid) {
        addTestResult('特殊字符处理', true);
    } else {
        addTestResult('特殊字符处理', false, details.join(', '));
    }
} catch (e) {
    addTestResult('特殊字符处理', false, e.message);
}

// ==================== 测试结果汇总 ====================
return setTimeout(function() {
    console.log('\n========================================');
    console.log('修复验证测试完成');
    console.log('========================================');
    console.log('总计: ' + testResults.tests.length + ' 个验证');
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
            ? '✅ 所有修复验证通过！'
            : '❌ 有 ' + testResults.failed + ' 个验证失败',
        passed: testResults.passed,
        failed: testResults.failed,
        total: testResults.tests.length,
        fixes: {
            nullUndefinedHandling: testResults.tests[0] ? testResults.tests[0].success : false,
            newlineInFilename: testResults.tests[1] ? testResults.tests[1].success : false,
            specialCharacters: testResults.tests[2] ? testResults.tests[2].success : false
        },
        nextSteps: testResults.failed === 0 ? [
            '运行完整的错误处理测试: formdata-error-handling-test.js',
            '运行完整的边界情况测试: formdata-edge-cases-test.js',
            '运行所有测试套件: run-all-tests.sh'
        ] : [
            '检查修复代码',
            '查看日志获取详细错误信息'
        ]
    };

    console.log(finalResult.message);
    
    if (finalResult.nextSteps.length > 0) {
        console.log('\n下一步:');
        for (var i = 0; i < finalResult.nextSteps.length; i++) {
            console.log('  ' + (i + 1) + '. ' + finalResult.nextSteps[i]);
        }
    }
    
    return finalResult;
}, 100);
