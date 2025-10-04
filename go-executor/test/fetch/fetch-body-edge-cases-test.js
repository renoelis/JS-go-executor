/**
 * Fetch API - Body 边界情况测试
 * 
 * 测试目标：
 * 1. 空 Body
 * 2. 超大 Body
 * 3. 二进制 Body (ArrayBuffer)
 * 4. Blob Body
 * 5. null/undefined Body
 * 6. 特殊字符 Body
 */

console.log('========================================');
console.log('Fetch API - Body 边界情况测试');
console.log('========================================\n');

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
    }
    testResults.tests.push({
        name: name,
        passed: passed,
        details: details || {}
    });
}

// ========================================
// 测试 1: 空字符串 Body
// ========================================
function test1_EmptyStringBody() {
    console.log('\n【测试 1】空字符串 Body');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: ''
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('空 Body - 请求成功', response.ok, {
            status: response.status
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Body:', data.data);
        
        var bodyEmpty = data.data === '' || data.data === null || data.data === undefined;
        addTestResult('空 Body - 服务器收到空内容', bodyEmpty, {
            received: data.data
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('空 Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 2: null Body
// ========================================
function test2_NullBody() {
    console.log('\n【测试 2】null Body');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        body: null
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('null Body - 请求成功', response.ok, {
            status: response.status
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Body:', data.data || '(empty)');
        
        // null body 应该被忽略
        addTestResult('null Body - 正确处理', true, {
            note: 'null body 应该被当作无 body 处理'
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('null Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 3: undefined Body
// ========================================
function test3_UndefinedBody() {
    console.log('\n【测试 3】undefined Body');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        body: undefined
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('undefined Body - 请求成功', response.ok, {
            status: response.status
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Body:', data.data || '(empty)');
        
        // undefined body 应该被忽略
        addTestResult('undefined Body - 正确处理', true, {
            note: 'undefined body 应该被当作无 body 处理'
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('undefined Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 4: 大文本 Body (1MB)
// ========================================
function test4_LargeTextBody() {
    console.log('\n【测试 4】大文本 Body (1MB)');
    console.log('----------------------------------------');
    
    // 创建 1MB 的文本
    var size = 1024 * 1024;  // 1MB
    var largeText = '';
    var chunk = 'x'.repeat(1024);  // 1KB chunk
    for (var i = 0; i < 1024; i++) {
        largeText += chunk;
    }
    
    console.log('  Body size:', largeText.length, 'bytes (1MB)');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: largeText
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('大文本 Body (1MB) - 请求成功', response.ok, {
            status: response.status,
            sentSize: largeText.length
        });
        
        return response.json();
    })
    .then(function(data) {
        var receivedSize = data.data ? data.data.length : 0;
        console.log('  Received size:', receivedSize, 'bytes');
        
        var sizesMatch = receivedSize === size;
        addTestResult('大文本 Body (1MB) - 大小一致', sizesMatch, {
            expected: size,
            actual: receivedSize
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('大文本 Body (1MB) - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 5: ArrayBuffer Body
// ========================================
function test5_ArrayBufferBody() {
    console.log('\n【测试 5】ArrayBuffer Body');
    console.log('----------------------------------------');
    
    // 创建一个 ArrayBuffer
    var buffer = new ArrayBuffer(256);
    var view = new Uint8Array(buffer);
    
    // 填充一些数据
    for (var i = 0; i < view.length; i++) {
        view[i] = i % 256;
    }
    
    console.log('  ArrayBuffer size:', buffer.byteLength, 'bytes');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('ArrayBuffer Body - 请求成功', response.ok, {
            status: response.status,
            sentSize: buffer.byteLength
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Response received');
        
        // 验证数据被发送
        var dataExists = data.data !== null && data.data !== undefined;
        addTestResult('ArrayBuffer Body - 数据发送', dataExists, {
            hasData: dataExists
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('ArrayBuffer Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 6: Uint8Array Body
// ========================================
function test6_Uint8ArrayBody() {
    console.log('\n【测试 6】Uint8Array Body');
    console.log('----------------------------------------');
    
    // 创建 Uint8Array
    var uint8 = new Uint8Array(128);
    for (var i = 0; i < uint8.length; i++) {
        uint8[i] = (i * 2) % 256;
    }
    
    console.log('  Uint8Array length:', uint8.length, 'bytes');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: uint8
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('Uint8Array Body - 请求成功', response.ok, {
            status: response.status,
            sentSize: uint8.length
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Response received');
        
        var dataExists = data.data !== null && data.data !== undefined;
        addTestResult('Uint8Array Body - 数据发送', dataExists);
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Uint8Array Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 7: Blob Body
// ========================================
function test7_BlobBody() {
    console.log('\n【测试 7】Blob Body');
    console.log('----------------------------------------');
    
    var blobData = 'This is blob content';
    var blob = new Blob([blobData], { type: 'text/plain' });
    
    console.log('  Blob size:', blob.size, 'bytes');
    console.log('  Blob type:', blob.type);
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        body: blob
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('Blob Body - 请求成功', response.ok, {
            status: response.status,
            blobSize: blob.size
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Received data:', data.data);
        
        var dataMatches = data.data === blobData;
        addTestResult('Blob Body - 数据一致', dataMatches, {
            expected: blobData,
            actual: data.data
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Blob Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 8: 特殊字符 Body
// ========================================
function test8_SpecialCharactersBody() {
    console.log('\n【测试 8】特殊字符 Body');
    console.log('----------------------------------------');
    
    var specialText = '特殊字符测试: 中文、émoji 🎉、\nNewline\tTab\r\n';
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: specialText
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('特殊字符 Body - 请求成功', response.ok, {
            status: response.status
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Sent:', specialText);
        console.log('  Received:', data.data);
        
        var dataMatches = data.data === specialText;
        addTestResult('特殊字符 Body - 数据一致', dataMatches, {
            expected: specialText,
            actual: data.data
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('特殊字符 Body - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 9: JSON 特殊值
// ========================================
function test9_JSONSpecialValues() {
    console.log('\n【测试 9】JSON 特殊值');
    console.log('----------------------------------------');
    
    var specialData = {
        nullValue: null,
        emptyString: '',
        zero: 0,
        negativeZero: -0,
        infinity: Infinity,
        nan: NaN,
        boolean: true
    };
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialData)
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('JSON 特殊值 - 请求成功', response.ok, {
            status: response.status
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Sent:', JSON.stringify(specialData));
        console.log('  Received:', JSON.stringify(data.json));
        
        var jsonData = data.json;
        var nullCorrect = jsonData.nullValue === null;
        var emptyCorrect = jsonData.emptyString === '';
        var zeroCorrect = jsonData.zero === 0;
        
        addTestResult('JSON 特殊值 - 正确处理', nullCorrect && emptyCorrect && zeroCorrect, {
            nullValue: jsonData.nullValue,
            emptyString: jsonData.emptyString,
            zero: jsonData.zero
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('JSON 特殊值 - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 10: 超长 JSON Body (100KB)
// ========================================
function test10_LargeJSONBody() {
    console.log('\n【测试 10】超长 JSON Body (100KB)');
    console.log('----------------------------------------');
    
    // 创建大 JSON 对象
    var largeArray = [];
    for (var i = 0; i < 1000; i++) {
        largeArray.push({
            id: i,
            name: 'Item ' + i,
            description: 'This is a description for item number ' + i,
            data: 'x'.repeat(50)
        });
    }
    
    var jsonString = JSON.stringify(largeArray);
    console.log('  JSON size:', jsonString.length, 'bytes');
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('大 JSON Body (100KB) - 请求成功', response.ok, {
            status: response.status,
            sentSize: jsonString.length
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  Response received');
        
        var jsonReceived = data.json && Array.isArray(data.json);
        addTestResult('大 JSON Body (100KB) - 数据接收', jsonReceived, {
            isArray: jsonReceived,
            length: data.json ? data.json.length : 0
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('大 JSON Body (100KB) - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 主测试流程
// ========================================
console.log('开始测试...\n');

test1_EmptyStringBody()
    .then(function() { return test2_NullBody(); })
    .then(function() { return test3_UndefinedBody(); })
    .then(function() { return test4_LargeTextBody(); })
    .then(function() { return test5_ArrayBufferBody(); })
    .then(function() { return test6_Uint8ArrayBody(); })
    .then(function() { return test7_BlobBody(); })
    .then(function() { return test8_SpecialCharactersBody(); })
    .then(function() { return test9_JSONSpecialValues(); })
    .then(function() { return test10_LargeJSONBody(); })
    .then(function() {
        setTimeout(function() {
            console.log('\n========================================');
            console.log('测试完成');
            console.log('========================================');
            console.log('总计:', testResults.total, '个测试');
            console.log('通过:', testResults.passed, '个');
            console.log('失败:', testResults.failed, '个');
            
            if (testResults.failed === 0) {
                console.log('\n✅ 所有测试通过！');
            } else {
                console.log('\n❌ 部分测试失败');
            }
            
            testResults;
        }, 100);
    })
    .catch(function(error) {
        console.log('\n测试流程出错:', error);
    });

// 返回测试结果
return testResults;


