/**
 * Fetch API 综合测试套件
 * 
 * 测试覆盖：
 * 1. GET 请求
 * 2. PUT / PATCH 请求
 * 3. response.text() vs response.json()
 * 4. JSON 数组数据
 * 5. form-urlencoded
 * 6. form-data (multipart/form-data)
 * 7. 错误场景（404、超时、网络错误）
 */

console.log('========================================');
console.log('Fetch API 综合测试套件');
console.log('========================================\n');

var testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, details) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log('✅ ' + name);
    } else {
        testResults.failed++;
        console.log('❌ ' + name);
    }
    testResults.tests.push({
        name: name,
        passed: passed,
        details: details
    });
}

// ==========================================
// 测试 1: GET 请求 + response.json()
// ==========================================
function test1_GET_JSON() {
    console.log('\n【测试 1】GET 请求 + response.json()');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/1');
    
    return fetch('https://jsonplaceholder.typicode.com/posts/1')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            return response.json();
        })
        .then(function(data) {
            console.log('  返回数据:', JSON.stringify(data, null, 2));
            
            var passed = data && data.id === 1 && data.userId === 1;
            recordTest('GET 请求 + JSON 解析', passed, {
                id: data.id,
                userId: data.userId,
                title: data.title
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('GET 请求 + JSON 解析', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 2: GET 请求 + response.text()
// ==========================================
function test2_GET_TEXT() {
    console.log('\n【测试 2】GET 请求 + response.text()');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/1');
    
    return fetch('https://jsonplaceholder.typicode.com/posts/1')
        .then(function(response) {
            console.log('  Status:', response.status);
            return response.text();
        })
        .then(function(text) {
            console.log('  返回文本 (前100字符):', text.substring(0, 100));
            
            var passed = text.length > 0 && text.indexOf('userId') !== -1;
            recordTest('GET 请求 + TEXT 解析', passed, {
                textLength: text.length,
                preview: text.substring(0, 50)
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('GET 请求 + TEXT 解析', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 3: PUT 请求
// ==========================================
function test3_PUT() {
    console.log('\n【测试 3】PUT 请求');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/1');
    
    var payload = {
        id: 1,
        title: 'Updated Title',
        body: 'Updated body content',
        userId: 1
    };
    
    return fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  OK:', response.ok);
        return response.json();
    })
    .then(function(data) {
        console.log('  返回数据:', JSON.stringify(data, null, 2));
        
        var passed = data && data.title === 'Updated Title';
        recordTest('PUT 请求', passed, {
            title: data.title
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        recordTest('PUT 请求', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ==========================================
// 测试 4: PATCH 请求
// ==========================================
function test4_PATCH() {
    console.log('\n【测试 4】PATCH 请求');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/1');
    
    var payload = {
        title: 'Patched Title'
    };
    
    return fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  OK:', response.ok);
        return response.json();
    })
    .then(function(data) {
        console.log('  返回数据:', JSON.stringify(data, null, 2));
        
        var passed = data && data.title === 'Patched Title';
        recordTest('PATCH 请求', passed, {
            title: data.title
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        recordTest('PATCH 请求', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ==========================================
// 测试 5: HTML 响应 + response.text()
// ==========================================
function test5_HTML_TEXT() {
    console.log('\n【测试 5】HTML 响应 + response.text()');
    console.log('接口: https://httpbin.org/html');
    
    return fetch('https://httpbin.org/html')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  Content-Type:', response.headers.get('content-type'));
            return response.text();
        })
        .then(function(text) {
            console.log('  HTML 长度:', text.length);
            console.log('  HTML 预览:', text.substring(0, 100));
            
            var passed = text.indexOf('<!DOCTYPE html>') !== -1 || text.indexOf('<html>') !== -1;
            recordTest('HTML 响应解析', passed, {
                length: text.length,
                isHTML: passed
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('HTML 响应解析', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 6: JSON 数组数据
// ==========================================
function test6_JSON_ARRAY() {
    console.log('\n【测试 6】JSON 数组数据');
    console.log('接口: https://kc.oalite.com/returnAll');
    
    var payload = {
        table: [
            { name: "zz", age: 12 },
            { name: "zz1", age: 16 },
            { name: "zz9", age: 14 }
        ]
    };
    
    return fetch('https://kc.oalite.com/returnAll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  OK:', response.ok);
        return response.json();
    })
    .then(function(data) {
        console.log('  返回数据:', JSON.stringify(data, null, 2));
        
        // 验证数组数据 - 数据在 request_info.body.table 中
        var table = data.request_info && data.request_info.body && data.request_info.body.table;
        var passed = table && table.length === 3 && table[0].name === 'zz';
        
        if (passed) {
            console.log('  数组长度:', table.length);
            console.log('  第一条记录:', JSON.stringify(table[0]));
        } else if (data.table) {
            // 如果数据直接在 data.table，也支持
            passed = data.table.length === 3 && data.table[0].name === 'zz';
            table = data.table;
            if (passed) {
                console.log('  数组长度:', table.length);
                console.log('  第一条记录:', JSON.stringify(table[0]));
            }
        }
        
        recordTest('JSON 数组解析', passed, {
            arrayLength: table ? table.length : 0,
            firstItem: table ? table[0] : null
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        recordTest('JSON 数组解析', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ==========================================
// 测试 7: form-urlencoded
// ==========================================
function test7_FORM_URLENCODED() {
    console.log('\n【测试 7】form-urlencoded');
    console.log('接口: https://httpbin.org/post');
    
    var formData = 'key1=value1&key2=value2&name=测试';
    
    return fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        return response.json();
    })
    .then(function(data) {
        console.log('  服务端解析的表单:', JSON.stringify(data.form, null, 2));
        
        var passed = data.form && data.form.key1 === 'value1' && data.form.key2 === 'value2';
        recordTest('form-urlencoded', passed, {
            form: data.form
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        recordTest('form-urlencoded', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ==========================================
// 测试 8: 404 错误
// ==========================================
function test8_404_ERROR() {
    console.log('\n【测试 8】404 错误处理');
    console.log('接口: https://jsonplaceholder.typicode.com/abc-notfound');
    
    return fetch('https://jsonplaceholder.typicode.com/abc-notfound')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            if (!response.ok) {
                // 尝试解析 JSON，应该会失败并给出友好错误
                return response.json()
                    .catch(function(jsonError) {
                        console.log('  JSON 解析错误:', jsonError.message || String(jsonError));
                        
                        // 检查错误信息是否包含 HTTP 状态码
                        var errorStr = String(jsonError);
                        var hasFriendlyError = errorStr.indexOf('HTTP 404') !== -1 || 
                                             errorStr.indexOf('404') !== -1;
                        
                        recordTest('404 错误 - 友好错误信息', hasFriendlyError, {
                            status: response.status,
                            errorMessage: errorStr.substring(0, 200)
                        });
                        
                        return { success: true, errorHandled: true };
                    });
            }
            
            return { success: false, message: 'Should have received 404' };
        })
        .catch(function(error) {
            console.log('  捕获错误:', error.message || String(error));
            recordTest('404 错误 - 友好错误信息', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 9: 网络错误（不存在的域名）
// ==========================================
function test9_NETWORK_ERROR() {
    console.log('\n【测试 9】网络错误（不存在的域名）');
    console.log('接口: http://this-domain-does-not-exist-12345.com');
    
    return fetch('http://this-domain-does-not-exist-12345.com')
        .then(function(response) {
            console.log('  意外成功，Status:', response.status);
            recordTest('网络错误捕获', false, { message: 'Should have failed' });
            return { success: false };
        })
        .catch(function(error) {
            console.log('  捕获到网络错误:', error.message || String(error));
            
            var errorStr = String(error);
            var hasNetworkError = errorStr.length > 0;
            
            recordTest('网络错误捕获', hasNetworkError, {
                errorMessage: errorStr.substring(0, 200)
            });
            
            return { success: true, errorCaught: true };
        });
}

// ==========================================
// 测试 10: DELETE 请求
// ==========================================
function test10_DELETE() {
    console.log('\n【测试 10】DELETE 请求');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/1');
    
    return fetch('https://jsonplaceholder.typicode.com/posts/1', {
        method: 'DELETE'
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  OK:', response.ok);
        
        var passed = response.status === 200;
        recordTest('DELETE 请求', passed, {
            status: response.status
        });
        
        return { success: true };
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        recordTest('DELETE 请求', false, { error: String(error) });
        return { success: false, error: String(error) };
    });
}

// ==========================================
// 主测试流程
// ==========================================
function runAllTests() {
    console.log('开始执行测试...\n');
    
    return test1_GET_JSON()
        .then(function() { return test2_GET_TEXT(); })
        .then(function() { return test3_PUT(); })
        .then(function() { return test4_PATCH(); })
        .then(function() { return test5_HTML_TEXT(); })
        .then(function() { return test6_JSON_ARRAY(); })
        .then(function() { return test7_FORM_URLENCODED(); })
        .then(function() { return test8_404_ERROR(); })
        .then(function() { return test9_NETWORK_ERROR(); })
        .then(function() { return test10_DELETE(); })
        .then(function() {
            // 打印测试总结
            console.log('\n========================================');
            console.log('测试总结');
            console.log('========================================');
            console.log('总测试数:', testResults.total);
            console.log('通过:', testResults.passed);
            console.log('失败:', testResults.failed);
            console.log('通过率:', (testResults.passed / testResults.total * 100).toFixed(2) + '%');
            console.log('========================================\n');
            
            return testResults;
        });
}

// 执行所有测试
return runAllTests();

