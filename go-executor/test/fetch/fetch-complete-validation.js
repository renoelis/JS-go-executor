// Fetch API 完整功能验证测试
// 测试接口：https://kc.oalite.com/returnAll
// 该接口会返回所有发送的参数（query、headers、body）

console.log('========================================');
console.log('Fetch API 完整功能验证测试');
console.log('测试接口: https://kc.oalite.com/returnAll');
console.log('========================================\n');

var testResults = [];
var testStartTime = Date.now();

// ============================================
// 测试 1: 基本 GET 请求
// ============================================
function test1_BasicGet() {
    console.log('测试 1: 基本 POST 请求（改为 POST，因为接口不支持 GET）');
    var startTime = Date.now();
    
    return fetch('https://kc.oalite.com/returnAll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'basic' })
    })
        .then(function(response) {
            var elapsed = Date.now() - startTime;
            console.log('  ✓ 请求完成，耗时: ' + elapsed + 'ms');
            console.log('  - Status: ' + response.status);
            console.log('  - StatusText: ' + response.statusText);
            console.log('  - OK: ' + response.ok);
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            return response.json();
        })
        .then(function(data) {
            var totalTime = Date.now() - startTime;
            console.log('  ✓ JSON 解析完成');
            console.log('  - 总耗时: ' + totalTime + 'ms');
            console.log('  - 返回数据: ' + JSON.stringify(data, null, 2));
            
            return {
                test: 'test1_BasicGet',
                success: true,
                elapsed: totalTime,
                status: 200,
                data: data
            };
        })
        .catch(function(error) {
            var elapsed = Date.now() - startTime;
            console.log('  ✗ 测试失败: ' + error.message);
            return {
                test: 'test1_BasicGet',
                success: false,
                elapsed: elapsed,
                error: error.message
            };
        });
}

// ============================================
// 测试 2: 带查询参数的 GET 请求
// ============================================
function test2_GetWithQuery() {
    console.log('\n测试 2: POST 请求带查询参数');
    var startTime = Date.now();
    
    var url = 'https://kc.oalite.com/returnAll?name=test&age=25&city=Beijing';
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: 'testing query params' })
    })
        .then(function(response) {
            var elapsed = Date.now() - startTime;
            console.log('  ✓ 请求完成，耗时: ' + elapsed + 'ms');
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            return response.json();
        })
        .then(function(data) {
            var totalTime = Date.now() - startTime;
            console.log('  ✓ 查询参数: name=test, age=25, city=Beijing');
            console.log('  - 总耗时: ' + totalTime + 'ms');
            console.log('  - Query 参数: ' + JSON.stringify(data.request_info.query_params, null, 2));
            
            return {
                test: 'test2_GetWithQuery',
                success: true,
                elapsed: totalTime,
                query: { name: 'test', age: '25', city: 'Beijing' },
                data: data
            };
        })
        .catch(function(error) {
            var elapsed = Date.now() - startTime;
            console.log('  ✗ 测试失败: ' + error.message);
            return {
                test: 'test2_GetWithQuery',
                success: false,
                elapsed: elapsed,
                error: error.message
            };
        });
}

// ============================================
// 测试 3: POST 请求 - JSON 数据
// ============================================
function test3_PostJson() {
    console.log('\n测试 3: POST 请求 - JSON 数据');
    var startTime = Date.now();
    
    var postData = {
        username: 'testuser',
        email: 'test@example.com',
        age: 30,
        active: true,
        timestamp: Date.now()
    };
    
    return fetch('https://kc.oalite.com/returnAll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    })
    .then(function(response) {
        var elapsed = Date.now() - startTime;
        console.log('  ✓ POST 请求完成，耗时: ' + elapsed + 'ms');
        console.log('  - Status: ' + response.status);
        return response.json();
    })
    .then(function(data) {
        var totalTime = Date.now() - startTime;
        console.log('  ✓ 发送数据: ' + JSON.stringify(postData, null, 2));
        console.log('  - 总耗时: ' + totalTime + 'ms');
        console.log('  - 接收数据: ' + JSON.stringify(data, null, 2));
        
        return {
            test: 'test3_PostJson',
            success: true,
            elapsed: totalTime,
            sentData: postData,
            receivedData: data
        };
    })
    .catch(function(error) {
        var elapsed = Date.now() - startTime;
        console.log('  ✗ 测试失败: ' + error.message);
        return {
            test: 'test3_PostJson',
            success: false,
            elapsed: elapsed,
            error: error.message
        };
    });
}

// ============================================
// 测试 4: 自定义 Headers
// ============================================
function test4_CustomHeaders() {
    console.log('\n测试 4: 自定义 Headers');
    var startTime = Date.now();
    
    return fetch('https://kc.oalite.com/returnAll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'CustomValue123',
            'X-Request-ID': 'req-' + Date.now(),
            'X-Client-Version': '1.0.0',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ test: 'custom headers' })
    })
    .then(function(response) {
        var elapsed = Date.now() - startTime;
        console.log('  ✓ 请求完成，耗时: ' + elapsed + 'ms');
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        
        return response.json();
    })
    .then(function(data) {
        var totalTime = Date.now() - startTime;
        console.log('  ✓ 自定义 Headers 已发送');
        console.log('  - 总耗时: ' + totalTime + 'ms');
        console.log('  - Headers: ' + JSON.stringify(data.request_info.headers || {}, null, 2));
        
        return {
            test: 'test4_CustomHeaders',
            success: true,
            elapsed: totalTime,
            headers: {
                'X-Custom-Header': 'CustomValue123',
                'X-Client-Version': '1.0.0'
            },
            data: data
        };
    })
    .catch(function(error) {
        var elapsed = Date.now() - startTime;
        console.log('  ✗ 测试失败: ' + error.message);
        return {
            test: 'test4_CustomHeaders',
            success: false,
            elapsed: elapsed,
            error: error.message
        };
    });
}

// ============================================
// 测试 5: POST + Query + Headers 组合
// ============================================
function test5_ComplexRequest() {
    console.log('\n测试 5: POST + Query + Headers 组合');
    var startTime = Date.now();
    
    var url = 'https://kc.oalite.com/returnAll?source=test&version=1.0';
    var postData = {
        action: 'create',
        data: {
            name: 'New Item',
            priority: 'high'
        }
    };
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key-123',
            'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(postData)
    })
    .then(function(response) {
        var elapsed = Date.now() - startTime;
        console.log('  ✓ 复杂请求完成，耗时: ' + elapsed + 'ms');
        console.log('  - Status: ' + response.status);
        return response.json();
    })
    .then(function(data) {
        var totalTime = Date.now() - startTime;
        console.log('  ✓ Query: source=test, version=1.0');
        console.log('  ✓ Body: ' + JSON.stringify(postData));
        console.log('  - 总耗时: ' + totalTime + 'ms');
        console.log('  - 完整返回: ' + JSON.stringify(data, null, 2));
        
        return {
            test: 'test5_ComplexRequest',
            success: true,
            elapsed: totalTime,
            query: { source: 'test', version: '1.0' },
            body: postData,
            data: data
        };
    })
    .catch(function(error) {
        var elapsed = Date.now() - startTime;
        console.log('  ✗ 测试失败: ' + error.message);
        return {
            test: 'test5_ComplexRequest',
            success: false,
            elapsed: elapsed,
            error: error.message
        };
    });
}

// ============================================
// 测试 6: Response 对象属性
// ============================================
function test6_ResponseProperties() {
    console.log('\n测试 6: Response 对象属性');
    var startTime = Date.now();
    
    return fetch('https://kc.oalite.com/returnAll', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'response properties' })
    })
        .then(function(response) {
            var elapsed = Date.now() - startTime;
            
            // 测试 Response 对象的各种属性
            var properties = {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                type: response.type || 'unknown',
                url: response.url || 'unknown'
            };
            
            console.log('  ✓ Response 属性测试');
            console.log('  - status: ' + properties.status);
            console.log('  - statusText: ' + properties.statusText);
            console.log('  - ok: ' + properties.ok);
            console.log('  - type: ' + properties.type);
            console.log('  - url: ' + properties.url);
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            return response.json().then(function(data) {
                var totalTime = Date.now() - startTime;
                console.log('  - 总耗时: ' + totalTime + 'ms');
                
                return {
                    test: 'test6_ResponseProperties',
                    success: true,
                    elapsed: totalTime,
                    properties: properties,
                    data: data
                };
            });
        })
        .catch(function(error) {
            var elapsed = Date.now() - startTime;
            console.log('  ✗ 测试失败: ' + error.message);
            return {
                test: 'test6_ResponseProperties',
                success: false,
                elapsed: elapsed,
                error: error.message
            };
        });
}

// ============================================
// 测试 7: 不同的 Content-Type
// ============================================
function test7_DifferentContentTypes() {
    console.log('\n测试 7: text/plain Content-Type');
    var startTime = Date.now();
    
    return fetch('https://kc.oalite.com/returnAll', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: 'This is plain text content for testing'
    })
    .then(function(response) {
        var elapsed = Date.now() - startTime;
        console.log('  ✓ 请求完成，耗时: ' + elapsed + 'ms');
        return response.json();
    })
    .then(function(data) {
        var totalTime = Date.now() - startTime;
        console.log('  ✓ 发送 text/plain 数据');
        console.log('  - 总耗时: ' + totalTime + 'ms');
        console.log('  - 接收: ' + JSON.stringify(data, null, 2));
        
        return {
            test: 'test7_DifferentContentTypes',
            success: true,
            elapsed: totalTime,
            contentType: 'text/plain',
            data: data
        };
    })
    .catch(function(error) {
        var elapsed = Date.now() - startTime;
        console.log('  ✗ 测试失败: ' + error.message);
        return {
            test: 'test7_DifferentContentTypes',
            success: false,
            elapsed: elapsed,
            error: error.message
        };
    });
}

// ============================================
// 主测试流程
// ============================================
function runAllTests() {
    console.log('开始执行所有测试...\n');
    
    // 链式执行所有测试
    return test1_BasicGet()
        .then(function(result) {
            testResults.push(result);
            return test2_GetWithQuery();
        })
        .then(function(result) {
            testResults.push(result);
            return test3_PostJson();
        })
        .then(function(result) {
            testResults.push(result);
            return test4_CustomHeaders();
        })
        .then(function(result) {
            testResults.push(result);
            return test5_ComplexRequest();
        })
        .then(function(result) {
            testResults.push(result);
            return test6_ResponseProperties();
        })
        .then(function(result) {
            testResults.push(result);
            return test7_DifferentContentTypes();
        })
        .then(function(result) {
            testResults.push(result);
            
            // 打印汇总结果
            printSummary();
            
            return {
                success: true,
                results: testResults
            };
        })
        .catch(function(error) {
            console.log('\n❌ 测试执行出错: ' + error.message);
            printSummary();
            return {
                success: false,
                error: error.message,
                results: testResults
            };
        });
}

// ============================================
// 打印汇总结果
// ============================================
function printSummary() {
    var totalElapsed = Date.now() - testStartTime;
    
    console.log('\n========================================');
    console.log('测试结果汇总');
    console.log('========================================');
    
    var successCount = 0;
    var totalTime = 0;
    
    for (var i = 0; i < testResults.length; i++) {
        var result = testResults[i];
        if (result.success) {
            successCount++;
            console.log('✓ ' + result.test + ' - ' + result.elapsed + 'ms');
        } else {
            console.log('✗ ' + result.test + ' - ' + (result.error || 'Unknown error'));
        }
        totalTime += result.elapsed || 0;
    }
    
    console.log('\n统计信息:');
    console.log('- 总测试数: ' + testResults.length);
    console.log('- 通过: ' + successCount);
    console.log('- 失败: ' + (testResults.length - successCount));
    console.log('- 成功率: ' + (successCount / testResults.length * 100).toFixed(2) + '%');
    console.log('- 总耗时: ' + totalElapsed + 'ms');
    console.log('- 平均耗时: ' + (totalTime / testResults.length).toFixed(2) + 'ms');
    
    console.log('\n详细结果:');
    console.log(JSON.stringify(testResults, null, 2));
}

// 执行测试
return runAllTests();

