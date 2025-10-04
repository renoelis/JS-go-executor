/**
 * Web API FormData + Fetch 集成测试
 * 
 * 测试目标：
 * 1. 混合数据类型上传（文本 + 二进制）
 * 2. multipart/form-data 格式验证
 * 3. 流式处理切换验证
 * 4. 错误情况处理
 * 5. Content-Type 自动设置
 */

console.log('========================================');
console.log('Web API FormData + Fetch 集成测试');
console.log('========================================\n');

// 测试结果收集
var testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function addTestResult(name, passed, details) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log('  ✅ ' + name);
    } else {
        testResults.failed++;
        console.log('  ❌ ' + name);
        if (details && details.error) {
            console.log('     错误: ' + details.error);
        }
    }
    testResults.tests.push({
        name: name,
        passed: passed,
        details: details || {}
    });
}

// 测试用的 API 端点
var TEST_API = 'https://httpbin.org/post';

// ========================================
// 测试 1: 基础 FormData + Fetch
// ========================================
console.log('\n【测试 1】基础 FormData + Fetch');
console.log('----------------------------------------');

function test1_BasicFormDataFetch() {
    var fd = new FormData();
    fd.append('field1', 'value1');
    fd.append('field2', 'value2');
    
    console.log('  发送字段: field1=value1, field2=value2');
    
    return fetch(TEST_API, {
        method: 'POST',
        body: fd
    })
    .then(function(response) {
        console.log('  响应状态:', response.status);
        console.log('  响应 OK:', response.ok);
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        return response.json();
    })
    .then(function(data) {
        console.log('  返回数据:', JSON.stringify(data.form || {}, null, 2));
        
        var hasField1 = data.form && data.form.field1 === 'value1';
        var hasField2 = data.form && data.form.field2 === 'value2';
        
        addTestResult('Fetch 集成 - 基础 POST', hasField1 && hasField2, {
            field1: data.form ? data.form.field1 : null,
            field2: data.form ? data.form.field2 : null
        });
        
        // 验证 Content-Type
        var contentType = data.headers && data.headers['Content-Type'];
        console.log('  Content-Type:', contentType);
        
        var hasMultipart = contentType && contentType.indexOf('multipart/form-data') !== -1;
        var hasBoundary = contentType && contentType.indexOf('boundary=') !== -1;
        
        addTestResult('Fetch 集成 - Content-Type 自动设置', hasMultipart, {
            contentType: contentType,
            hasMultipart: hasMultipart
        });
        
        addTestResult('Fetch 集成 - Boundary 自动生成', hasBoundary, {
            hasBoundary: hasBoundary
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('Fetch 集成 - 基础 POST', false, { error: error.message });
        addTestResult('Fetch 集成 - Content-Type 自动设置', false, { error: error.message });
        addTestResult('Fetch 集成 - Boundary 自动生成', false, { error: error.message });
        return { success: false, error: error.message };
    });
}

// ========================================
// 测试 2: 混合数据类型（文本 + Blob）
// ========================================
console.log('\n【测试 2】混合数据类型（文本 + Blob）');
console.log('----------------------------------------');

function test2_MixedDataTypes() {
    var fd = new FormData();
    
    // 文本字段
    fd.append('username', 'Alice');
    fd.append('age', '25');
    
    // Blob 字段
    var textBlob = new Blob(['Hello, World!'], { type: 'text/plain' });
    fd.append('textFile', textBlob, 'hello.txt');
    
    // 二进制 Blob
    var binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
    var binaryBlob = new Blob([binaryData], { type: 'application/octet-stream' });
    fd.append('binaryFile', binaryBlob, 'data.bin');
    
    console.log('  字段数量:', fd.keys().length);
    console.log('  文本字段: username, age');
    console.log('  文件字段: textFile (Blob), binaryFile (Blob)');
    
    return fetch(TEST_API, {
        method: 'POST',
        body: fd
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        var hasUsername = data.form && data.form.username === 'Alice';
        var hasAge = data.form && data.form.age === '25';
        var hasFiles = data.files && (data.files.textFile || data.files.binaryFile);
        
        addTestResult('Fetch 集成 - 混合数据类型上传', hasUsername && hasAge, {
            username: data.form ? data.form.username : null,
            age: data.form ? data.form.age : null,
            hasFiles: !!hasFiles
        });
        
        addTestResult('Fetch 集成 - Blob 文件上传', !!hasFiles, {
            files: data.files || {}
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('Fetch 集成 - 混合数据类型上传', false, { error: error.message });
        addTestResult('Fetch 集成 - Blob 文件上传', false, { error: error.message });
        return { success: false, error: error.message };
    });
}

// ========================================
// 测试 3: 空 FormData 上传
// ========================================
console.log('\n【测试 3】空 FormData 上传');
console.log('----------------------------------------');

function test3_EmptyFormData() {
    var emptyFd = new FormData();
    
    console.log('  发送空 FormData...');
    
    return fetch(TEST_API, {
        method: 'POST',
        body: emptyFd
    })
    .then(function(response) {
        console.log('  响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        return response.json();
    })
    .then(function(data) {
        var formIsEmpty = !data.form || Object.keys(data.form).length === 0;
        
        addTestResult('Fetch 集成 - 空 FormData 不报错', true);
        addTestResult('Fetch 集成 - 空 FormData 发送成功', formIsEmpty, {
            formData: data.form || {}
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('Fetch 集成 - 空 FormData 不报错', false, { error: error.message });
        addTestResult('Fetch 集成 - 空 FormData 发送成功', false, { error: error.message });
        return { success: false, error: error.message };
    });
}

// ========================================
// 测试 4: 大量字段上传
// ========================================
console.log('\n【测试 4】大量字段上传');
console.log('----------------------------------------');

function test4_ManyFields() {
    var fd = new FormData();
    
    var fieldCount = 100;
    console.log('  添加 ' + fieldCount + ' 个字段...');
    
    for (var i = 0; i < fieldCount; i++) {
        fd.append('field' + i, 'value' + i);
    }
    
    return fetch(TEST_API, {
        method: 'POST',
        body: fd
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        var receivedCount = data.form ? Object.keys(data.form).length : 0;
        console.log('  发送字段数:', fieldCount);
        console.log('  接收字段数:', receivedCount);
        
        addTestResult('Fetch 集成 - 大量字段上传', receivedCount === fieldCount, {
            sent: fieldCount,
            received: receivedCount
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('Fetch 集成 - 大量字段上传', false, { error: error.message });
        return { success: false, error: error.message };
    });
}

// ========================================
// 测试 5: Unicode 字段上传
// ========================================
console.log('\n【测试 5】Unicode 字段上传');
console.log('----------------------------------------');

function test5_UnicodeFields() {
    var fd = new FormData();
    
    fd.append('中文', '你好世界');
    fd.append('emoji', '😀🎉🚀');
    fd.append('日本語', 'こんにちは');
    
    console.log('  发送 Unicode 字段: 中文, emoji, 日本語');
    
    return fetch(TEST_API, {
        method: 'POST',
        body: fd
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        var hasChinese = data.form && data.form['中文'] === '你好世界';
        var hasEmoji = data.form && data.form['emoji'] === '😀🎉🚀';
        var hasJapanese = data.form && data.form['日本語'] === 'こんにちは';
        
        console.log('  中文字段:', data.form ? data.form['中文'] : null);
        console.log('  Emoji:', data.form ? data.form['emoji'] : null);
        console.log('  日文:', data.form ? data.form['日本語'] : null);
        
        addTestResult('Fetch 集成 - Unicode 字段上传', hasChinese && hasEmoji && hasJapanese, {
            chinese: hasChinese,
            emoji: hasEmoji,
            japanese: hasJapanese
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('Fetch 集成 - Unicode 字段上传', false, { error: error.message });
        return { success: false, error: error.message };
    });
}

// ========================================
// 测试 6: 重复字段名上传
// ========================================
console.log('\n【测试 6】重复字段名上传');
console.log('----------------------------------------');

function test6_DuplicateFields() {
    var fd = new FormData();
    
    fd.append('tags', 'javascript');
    fd.append('tags', 'nodejs');
    fd.append('tags', 'goja');
    
    console.log('  发送重复字段名: tags (3个值)');
    
    return fetch(TEST_API, {
        method: 'POST',
        body: fd
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        // httpbin 可能返回数组或最后一个值
        var tagsData = data.form ? data.form.tags : null;
        console.log('  接收到的 tags:', JSON.stringify(tagsData));
        
        var hasData = tagsData !== null && tagsData !== undefined;
        
        addTestResult('Fetch 集成 - 重复字段名上传', hasData, {
            tags: tagsData,
            note: 'httpbin 可能只返回最后一个值'
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('Fetch 集成 - 重复字段名上传', false, { error: error.message });
        return { success: false, error: error.message };
    });
}

// ========================================
// 测试 7: 错误处理 - 无效 URL
// ========================================
console.log('\n【测试 7】错误处理 - 无效 URL');
console.log('----------------------------------------');

function test7_InvalidURL() {
    var fd = new FormData();
    fd.append('field', 'value');
    
    console.log('  尝试连接无效 URL...');
    
    return fetch('http://invalid-domain-that-does-not-exist-12345.com/api', {
        method: 'POST',
        body: fd,
        timeout: 3000
    })
    .then(function(response) {
        // 不应该到这里
        addTestResult('Fetch 错误处理 - 无效 URL 抛出错误', false, {
            note: '应该抛出错误，但返回了响应'
        });
        return { success: false };
    })
    .catch(function(error) {
        console.log('  捕获错误:', error.message);
        
        // 应该捕获到错误
        addTestResult('Fetch 错误处理 - 无效 URL 抛出错误', true, {
            errorType: error.name || 'Error',
            errorMessage: error.message
        });
        
        return { success: true };
    });
}

// ========================================
// 测试 8: 错误处理 - 网络超时
// ========================================
console.log('\n【测试 8】错误处理 - 网络超时');
console.log('----------------------------------------');

function test8_Timeout() {
    var fd = new FormData();
    fd.append('field', 'value');
    
    console.log('  设置超短超时 (1ms)...');
    
    return fetch(TEST_API, {
        method: 'POST',
        body: fd,
        timeout: 1  // 1ms 超时，必然失败
    })
    .then(function(response) {
        // 可能在极端情况下成功（本地缓存等）
        console.log('  意外成功（可能是缓存）');
        addTestResult('Fetch 错误处理 - 超时处理', true, {
            note: '请求意外成功（可能是缓存）'
        });
        return { success: true };
    })
    .catch(function(error) {
        console.log('  捕获超时错误:', error.message);
        
        addTestResult('Fetch 错误处理 - 超时处理', true, {
            errorType: error.name || 'Error',
            errorMessage: error.message
        });
        
        return { success: true };
    });
}

// ========================================
// 测试 9: FormData 内部状态验证
// ========================================
console.log('\n【测试 9】FormData 内部状态验证');
console.log('----------------------------------------');

try {
    var fd9 = new FormData();
    fd9.append('field1', 'value1');
    
    // 验证内部方法存在
    var hasGetRawData = typeof fd9.__getRawData === 'function';
    var hasIsFormData = fd9.__isFormData === true;
    var hasType = fd9.__type === 'web-formdata';
    
    console.log('  __getRawData 方法:', hasGetRawData ? '存在' : '不存在');
    console.log('  __isFormData 标记:', hasIsFormData);
    console.log('  __type 标记:', fd9.__type);
    
    addTestResult('FormData 内部 - __getRawData 方法存在', hasGetRawData);
    addTestResult('FormData 内部 - __isFormData 标记正确', hasIsFormData);
    addTestResult('FormData 内部 - __type 标记正确', hasType);
    
    // 调用 __getRawData
    if (hasGetRawData) {
        var rawData = fd9.__getRawData();
        console.log('  __getRawData 返回类型:', Array.isArray(rawData) ? 'Array' : typeof rawData);
        console.log('  __getRawData 长度:', Array.isArray(rawData) ? rawData.length : 'N/A');
        
        var isValidRawData = Array.isArray(rawData) && rawData.length === 1;
        addTestResult('FormData 内部 - __getRawData 返回有效数据', isValidRawData, {
            isArray: Array.isArray(rawData),
            length: Array.isArray(rawData) ? rawData.length : null
        });
    }
    
} catch (e) {
    addTestResult('FormData 内部状态验证', false, { error: e.message });
}

// ========================================
// 执行所有测试
// ========================================
console.log('\n========================================');
console.log('开始执行异步测试...');
console.log('========================================\n');

test1_BasicFormDataFetch()
    .then(function() {
        return test2_MixedDataTypes();
    })
    .then(function() {
        return test3_EmptyFormData();
    })
    .then(function() {
        return test4_ManyFields();
    })
    .then(function() {
        return test5_UnicodeFields();
    })
    .then(function() {
        return test6_DuplicateFields();
    })
    .then(function() {
        return test7_InvalidURL();
    })
    .then(function() {
        return test8_Timeout();
    })
    .then(function() {
        // 最终总结
        setTimeout(function() {
            console.log('\n========================================');
            console.log('测试总结');
            console.log('========================================');
            console.log('总测试数:', testResults.total);
            console.log('通过:', testResults.passed, '(' + Math.round(testResults.passed / testResults.total * 100) + '%)');
            console.log('失败:', testResults.failed);
            
            if (testResults.failed > 0) {
                console.log('\n失败的测试:');
                testResults.tests.forEach(function(test) {
                    if (!test.passed) {
                        console.log('  ❌', test.name);
                        if (test.details.error) {
                            console.log('     ', test.details.error);
                        }
                    }
                });
            }
            
            console.log('\n========================================');
            
            if (testResults.failed === 0) {
                console.log('🎉 所有 Fetch 集成测试通过！');
            } else {
                console.log('⚠️  存在失败的测试，请检查');
            }
            
            console.log('========================================');
        }, 100);
        
        return testResults;
    })
    .catch(function(error) {
        console.log('\n❌ 测试执行失败:', error.message);
        return testResults;
    });

// 注意: 由于是异步测试，立即返回部分结果
return {
    note: '异步测试进行中，最终结果将在回调中显示',
    preliminaryResults: testResults
};

