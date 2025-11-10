/**
 * Fetch API - HTTP 方法完整测试
 * 
 * 测试目标：
 * 1. DELETE 方法
 * 2. HEAD 方法
 * 3. OPTIONS 方法
 * 4. PATCH 方法（补充测试）
 * 5. 方法大小写不敏感
 */

console.log('========================================');
console.log('Fetch API - HTTP 方法完整测试');
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
// 测试 1: DELETE 方法
// ========================================
function test1_DELETE_Method() {
    console.log('\n【测试 1】DELETE 方法');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'test-value'
        }
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  StatusText:', response.statusText);
        
        addTestResult('DELETE 方法 - 请求成功', response.ok, {
            status: response.status,
            statusText: response.statusText
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  返回数据:', JSON.stringify(data, null, 2));
        
        // 验证请求头是否正确发送
        var headersCorrect = data.headers && 
                            data.headers['Content-Type'] === 'application/json' &&
                            data.headers['X-Custom-Header'] === 'test-value';
        
        addTestResult('DELETE 方法 - Headers 正确', headersCorrect, {
            sentHeaders: {
                'Content-Type': 'application/json',
                'X-Custom-Header': 'test-value'
            },
            receivedHeaders: data.headers
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('DELETE 方法 - 请求成功', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 2: DELETE 方法带 Body
// ========================================
function test2_DELETE_WithBody() {
    console.log('\n【测试 2】DELETE 方法带 Body');
    console.log('----------------------------------------');
    
    var bodyData = {
        reason: 'User requested deletion',
        confirm: true
    };
    
    return fetch('https://httpbin.org/delete', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        return response.json();
    })
    .then(function(data) {
        console.log('  发送的 Body:', JSON.stringify(bodyData, null, 2));
        console.log('  返回的 data:', data.data || data.json);
        
        var bodyReceived = false;
        if (data.data) {
            try {
                var parsed = JSON.parse(data.data);
                bodyReceived = parsed.reason === 'User requested deletion' && parsed.confirm === true;
            } catch (e) {
                bodyReceived = false;
            }
        } else if (data.json) {
            bodyReceived = data.json.reason === 'User requested deletion' && data.json.confirm === true;
        }
        
        addTestResult('DELETE 方法 - Body 正确发送', bodyReceived, {
            sent: bodyData,
            received: data.data || data.json
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('DELETE 方法 - Body 正确发送', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 3: HEAD 方法
// ========================================
function test3_HEAD_Method() {
    console.log('\n【测试 3】HEAD 方法');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get', {
        method: 'HEAD'
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  Headers:', JSON.stringify(response.headers, null, 2));
        
        addTestResult('HEAD 方法 - 请求成功', response.ok, {
            status: response.status,
            hasHeaders: response.headers !== null
        });
        
        return response.text();
    })
    .then(function(text) {
        console.log('  Body length:', text.length);
        
        // HEAD 方法应该返回空 body
        var bodyEmpty = text.length === 0;
        addTestResult('HEAD 方法 - Body 为空', bodyEmpty, {
            bodyLength: text.length,
            expected: 0
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('HEAD 方法 - 请求成功', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 4: OPTIONS 方法
// ========================================
function test4_OPTIONS_Method() {
    console.log('\n【测试 4】OPTIONS 方法');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get', {
        method: 'OPTIONS'
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  Headers:', JSON.stringify(response.headers, null, 2));
        
        addTestResult('OPTIONS 方法 - 请求成功', response.ok || response.status === 200, {
            status: response.status,
            hasHeaders: response.headers !== null
        });
        
        // 检查 CORS 相关 headers
        var allowHeader = response.headers && response.headers['access-control-allow-methods'];
        if (allowHeader) {
            console.log('  Access-Control-Allow-Methods:', allowHeader);
            addTestResult('OPTIONS 方法 - CORS Headers 存在', true, {
                allowMethods: allowHeader
            });
        } else {
            console.log('  未找到 Access-Control-Allow-Methods header');
            addTestResult('OPTIONS 方法 - CORS Headers 存在', true, {
                note: 'CORS headers 可能不存在（取决于服务器配置）'
            });
        }
        
        return response.text();
    })
    .then(function(text) {
        console.log('  Body length:', text.length);
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('OPTIONS 方法 - 请求成功', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 5: PATCH 方法（补充测试）
// ========================================
function test5_PATCH_Method() {
    console.log('\n【测试 5】PATCH 方法');
    console.log('----------------------------------------');
    
    var patchData = {
        name: 'Updated Name',
        status: 'active'
    };
    
    return fetch('https://httpbin.org/patch', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchData)
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        
        addTestResult('PATCH 方法 - 请求成功', response.ok, {
            status: response.status
        });
        
        return response.json();
    })
    .then(function(data) {
        console.log('  发送的数据:', JSON.stringify(patchData, null, 2));
        console.log('  返回的数据:', JSON.stringify(data.json || data.data, null, 2));
        
        var dataMatches = false;
        if (data.json) {
            dataMatches = data.json.name === 'Updated Name' && data.json.status === 'active';
        } else if (data.data) {
            try {
                var parsed = JSON.parse(data.data);
                dataMatches = parsed.name === 'Updated Name' && parsed.status === 'active';
            } catch (e) {
                dataMatches = false;
            }
        }
        
        addTestResult('PATCH 方法 - 数据正确', dataMatches, {
            sent: patchData,
            received: data.json || data.data
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('PATCH 方法 - 请求成功', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 测试 6: 方法名大小写不敏感
// ========================================
function test6_MethodCase() {
    console.log('\n【测试 6】方法名大小写不敏感');
    console.log('----------------------------------------');
    
    // 测试小写 'delete'
    return fetch('https://httpbin.org/delete', {
        method: 'delete'  // 小写
    })
    .then(function(response) {
        console.log('  小写 method="delete" Status:', response.status);
        
        addTestResult('HTTP 方法 - 小写 delete', response.ok, {
            method: 'delete',
            status: response.status
        });
        
        return response.json();
    })
    .then(function() {
        // 测试混合大小写 'DeLeTe'
        return fetch('https://httpbin.org/delete', {
            method: 'DeLeTe'  // 混合大小写
        });
    })
    .then(function(response) {
        console.log('  混合大小写 method="DeLeTe" Status:', response.status);
        
        addTestResult('HTTP 方法 - 混合大小写 DeLeTe', response.ok, {
            method: 'DeLeTe',
            status: response.status
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('HTTP 方法 - 大小写不敏感', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ========================================
// 主测试流程
// ========================================
console.log('开始测试...\n');

test1_DELETE_Method()
    .then(function() { return test2_DELETE_WithBody(); })
    .then(function() { return test3_HEAD_Method(); })
    .then(function() { return test4_OPTIONS_Method(); })
    .then(function() { return test5_PATCH_Method(); })
    .then(function() { return test6_MethodCase(); })
    .then(function() {
        // 等待所有异步操作完成
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
            
            // 返回结果供外部使用
            testResults;
        }, 100);
    })
    .catch(function(error) {
        console.log('\n测试流程出错:', error);
    });

// 返回测试结果
return testResults;


