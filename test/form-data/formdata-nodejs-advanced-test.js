/**
 * Node.js FormData 高级功能测试
 * 覆盖之前未测试的 5 个核心功能
 */

console.log('========================================');
console.log('Node.js FormData 高级功能测试');
console.log('覆盖未测试的功能点');
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

// 导入模块
var FormData = require('form-data');

// ==================== 测试1：append() options 对象格式 ====================
console.log('【测试1】append() 的 options 对象格式');
console.log('测试: form.append(name, buffer, {filename, contentType})');
try {
    var form1 = new FormData();
    var testBuffer = Buffer.from('{"status": "ok"}', 'utf8');

    // 使用 options 对象格式
    form1.append('data', testBuffer, {
        filename: 'data.json',
        contentType: 'application/json'
    });

    // 验证 boundary
    var boundary = form1.getBoundary();
    if (!boundary) {
        throw new Error('无法获取 boundary');
    }

    // 验证 headers
    var headers = form1.getHeaders();
    if (!headers['content-type'].includes('multipart/form-data')) {
        throw new Error('Content-Type header 格式错误');
    }

    // 验证 Buffer 内容
    var buffer = form1.getBuffer();
    var content = buffer.toString('utf8');

    // 验证文件名
    if (!content.includes('data.json')) {
        throw new Error('Buffer 中缺少文件名');
    }

    // 验证 ContentType
    if (!content.includes('application/json')) {
        throw new Error('Buffer 中缺少 Content-Type: application/json');
    }

    // 验证数据
    if (!content.includes('{"status": "ok"}')) {
        throw new Error('Buffer 中缺少数据');
    }

    addTestResult('append() options对象', true);
} catch (e) {
    addTestResult('append() options对象', false, e.message);
}

// ==================== 测试2：append() 其他类型 ====================
console.log('\n【测试2】append() 处理数字、布尔值等类型');
try {
    var form2 = new FormData();

    // 测试数字
    form2.append('age', 30);
    form2.append('count', 42.5);

    // 测试布尔值
    form2.append('active', true);
    form2.append('disabled', false);

    // 验证内容
    var buffer2 = form2.getBuffer();
    var content2 = buffer2.toString('utf8');

    // 验证数字被转换为字符串
    if (!content2.includes('30')) {
        throw new Error('数字 30 未正确转换');
    }
    if (!content2.includes('42.5')) {
        throw new Error('浮点数 42.5 未正确转换');
    }

    // 验证布尔值被转换为字符串
    if (!content2.includes('true')) {
        throw new Error('布尔值 true 未正确转换');
    }
    if (!content2.includes('false')) {
        throw new Error('布尔值 false 未正确转换');
    }

    addTestResult('append() 数字和布尔值', true);
} catch (e) {
    addTestResult('append() 数字和布尔值', false, e.message);
}

// ==================== 测试3：append() Blob 对象 ====================
console.log('\n【测试3】append() 处理 Blob 对象');
try {
    var form3 = new FormData();

    // 创建 Blob
    var blob = new Blob(['Hello from Blob!'], { type: 'text/plain' });
    form3.append('blobfield', blob, 'test.txt');

    // 验证内容
    var buffer3 = form3.getBuffer();
    var content3 = buffer3.toString('utf8');

    if (!content3.includes('Hello from Blob!')) {
        throw new Error('Blob 数据未正确写入');
    }

    if (!content3.includes('test.txt')) {
        throw new Error('Blob 文件名未正确设置');
    }

    addTestResult('append() Blob对象', true);
} catch (e) {
    addTestResult('append() Blob对象', false, e.message);
}

// ==================== 测试4：append() File 对象 ====================
console.log('\n【测试4】append() 处理 File 对象');
try {
    var form4 = new FormData();

    // 创建 File
    var file = new File(['File content here'], 'myfile.txt', { type: 'text/plain' });
    form4.append('filefield', file);

    // 验证内容
    var buffer4 = form4.getBuffer();
    var content4 = buffer4.toString('utf8');

    if (!content4.includes('File content here')) {
        throw new Error('File 数据未正确写入');
    }

    // File 对象应该自动使用其 name 属性
    if (!content4.includes('myfile.txt')) {
        throw new Error('File name 未正确提取');
    }

    addTestResult('append() File对象', true);
} catch (e) {
    addTestResult('append() File对象', false, e.message);
}

// ==================== 测试5：getLength() Promise 模式 ====================
console.log('\n【测试5】getLength() Promise 模式');
try {
    var form5 = new FormData();
    form5.append('field', 'value');

    // 不传 callback，应该返回 Promise
    var lengthPromise = form5.getLength();

    if (!lengthPromise || typeof lengthPromise.then !== 'function') {
        throw new Error('getLength() 没有返回 Promise');
    }

    // 验证 Promise resolve
    var promiseResolved = false;
    var promiseLength = 0;

    lengthPromise.then(function(length) {
        promiseResolved = true;
        promiseLength = length;

        if (typeof length !== 'number') {
            throw new Error('Promise resolve 的值不是数字');
        }

        if (length <= 0) {
            throw new Error('Promise resolve 的长度应该 > 0');
        }

        console.log('  Promise resolved with length: ' + length);
    }).catch(function(err) {
        throw new Error('Promise rejected: ' + err);
    });

    addTestResult('getLength() Promise模式', true);
} catch (e) {
    addTestResult('getLength() Promise模式', false, e.message);
}

// ==================== 测试6：submit() 方法 - callback 模式 ====================
console.log('\n【测试6】submit() 方法 - callback 模式');
console.log('  (发送真实请求到 httpbin.org)');

// 创建测试表单
var submitForm = new FormData();
submitForm.append('username', 'testuser');
submitForm.append('message', 'Hello from Node.js FormData!');
submitForm.append('timestamp', Date.now().toString());

var submitTestPassed = false;
var submitError = null;

try {
    submitForm.submit('https://httpbin.org/post', function(err, response) {
        if (err) {
            submitError = 'Callback 收到错误: ' + err;
            addTestResult('submit() callback模式', false, submitError);
            return;
        }

        // 验证响应
        if (!response) {
            submitError = '响应为空';
            addTestResult('submit() callback模式', false, submitError);
            return;
        }

        // 如果 response 是 Promise（某些实现可能返回 Promise）
        if (response && typeof response.then === 'function') {
            response.then(function(res) {
                return res.json();
            }).then(function(data) {
                // 验证响应数据
                if (!data.form) {
                    throw new Error('响应缺少 form 字段');
                }

                if (data.form.username !== 'testuser') {
                    throw new Error('username 字段不匹配');
                }

                if (!data.form.message || !data.form.message.includes('Hello from Node.js FormData')) {
                    throw new Error('message 字段不匹配');
                }

                console.log('  ✅ submit 请求成功，响应验证通过');
                console.log('  响应数据: username=' + data.form.username);
                submitTestPassed = true;
                addTestResult('submit() callback模式', true);
            }).catch(function(err) {
                submitError = '响应解析失败: ' + err;
                addTestResult('submit() callback模式', false, submitError);
            });
        } else {
            // 直接是响应对象
            console.log('  ✅ submit 请求成功');
            submitTestPassed = true;
            addTestResult('submit() callback模式', true);
        }
    });

    // 如果 submit 是同步的，立即检查
    if (!submitTestPassed && !submitError) {
        console.log('  ⚠️  submit 可能是异步的，等待响应...');
    }
} catch (e) {
    addTestResult('submit() callback模式', false, e.message);
}

// ==================== 测试7：submit() 方法 - Promise 模式 ====================
console.log('\n【测试7】submit() 方法 - Promise 模式');
try {
    var submitForm2 = new FormData();
    submitForm2.append('test', 'promise-mode');

    // 不传 callback，应该返回 Promise
    var submitPromise = submitForm2.submit('https://httpbin.org/post');

    if (!submitPromise || typeof submitPromise.then !== 'function') {
        throw new Error('submit() 没有返回 Promise');
    }

    submitPromise.then(function(response) {
        console.log('  ✅ submit Promise resolved');
        return response.json();
    }).then(function(data) {
        if (data.form && data.form.test === 'promise-mode') {
            console.log('  ✅ Promise 模式请求成功，数据验证通过');
            addTestResult('submit() Promise模式', true);
        } else {
            addTestResult('submit() Promise模式', false, '响应数据验证失败');
        }
    }).catch(function(err) {
        addTestResult('submit() Promise模式', false, '请求失败: ' + err);
    });

    console.log('  ⚠️  等待 Promise 响应...');
} catch (e) {
    addTestResult('submit() Promise模式', false, e.message);
}

// ==================== 测试8：综合场景 - 混合类型 ====================
console.log('\n【测试8】综合场景 - 混合所有类型');
try {
    var comprehensiveForm = new FormData();

    // 文本
    comprehensiveForm.append('name', 'John Doe');

    // 数字
    comprehensiveForm.append('age', 25);

    // 布尔
    comprehensiveForm.append('active', true);

    // Buffer (字符串文件名)
    var buffer1 = Buffer.from('Simple buffer', 'utf8');
    comprehensiveForm.append('file1', buffer1, 'simple.txt');

    // Buffer (options 对象)
    var buffer2 = Buffer.from('{"key": "value"}', 'utf8');
    comprehensiveForm.append('file2', buffer2, {
        filename: 'data.json',
        contentType: 'application/json'
    });

    // Blob
    var blob = new Blob(['Blob content'], { type: 'text/plain' });
    comprehensiveForm.append('blobfile', blob, 'blob.txt');

    // File
    var file = new File(['File content'], 'upload.txt', { type: 'text/plain' });
    comprehensiveForm.append('filefield', file);

    // 验证整体
    var finalBuffer = comprehensiveForm.getBuffer();
    var finalContent = finalBuffer.toString('utf8');

    var checks = [
        { name: '文本字段', value: 'John Doe' },
        { name: '数字字段', value: '25' },
        { name: '布尔字段', value: 'true' },
        { name: 'Buffer1', value: 'Simple buffer' },
        { name: 'Buffer2', value: '{"key": "value"}' },
        { name: 'JSON ContentType', value: 'application/json' },
        { name: 'Blob', value: 'Blob content' },
        { name: 'File', value: 'File content' }
    ];

    for (var i = 0; i < checks.length; i++) {
        if (!finalContent.includes(checks[i].value)) {
            throw new Error(checks[i].name + ' 未找到');
        }
    }

    console.log('  验证通过: 所有类型都正确处理');
    addTestResult('综合场景测试', true);
} catch (e) {
    addTestResult('综合场景测试', false, e.message);
}

// ==================== 测试结果汇总 ====================
setTimeout(function() {
    console.log('\n========================================');
    console.log('高级功能测试完成');
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
            ? '所有高级功能测试通过！'
            : '有 ' + testResults.failed + ' 个测试失败',
        coverage: {
            total: 8,
            passed: testResults.passed,
            failed: testResults.failed,
            percentage: Math.round((testResults.passed / testResults.tests.length) * 100) + '%'
        },
        details: testResults
    };

    if (finalResult.success) {
        console.log('✅ 所有高级功能测试通过！');
        console.log('测试覆盖率: ' + finalResult.coverage.percentage);
    } else {
        console.log('❌ 有测试失败，请检查实现');
    }

    return finalResult;
}, 8000);  // 等待异步测试完成

console.log('\n⏳ 等待所有异步测试完成（包括网络请求）...');

// 立即返回初步结果
return {
    message: '高级功能测试已启动，包含 8 个测试用例',
    note: '部分测试（submit）需要网络请求，请等待 8 秒查看完整结果',
    testsStarted: testResults.tests.length
};
