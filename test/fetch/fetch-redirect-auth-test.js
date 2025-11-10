/**
 * Fetch API - 重定向和认证测试
 * 
 * 测试 3xx 重定向、401/403 认证失败场景
 */

console.log('========================================');
console.log('Fetch API - 重定向和认证测试');
console.log('========================================\n');

var testResults = {
    total: 0,
    passed: 0,
    failed: 0
};

function recordTest(name, passed) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log('✅ ' + name);
    } else {
        testResults.failed++;
        console.log('❌ ' + name);
    }
}

// ==========================================
// 测试 1: 301 永久重定向
// ==========================================
function test1_301_REDIRECT() {
    console.log('\n【测试 1】301 永久重定向');
    console.log('接口: https://httpbin.org/redirect-to?url=https://httpbin.org/get&status_code=301');
    
    return fetch('https://httpbin.org/redirect-to?url=https://httpbin.org/get&status_code=301')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            console.log('  Final URL:', response.url);
            
            // fetch 默认会自动跟随重定向，最终应该是 200
            var passed = response.status === 200 && response.ok;
            
            return response.json().then(function(data) {
                console.log('  响应数据:', JSON.stringify(data, null, 2).substring(0, 200));
                recordTest('301 永久重定向', passed);
                return { success: true };
            });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('301 永久重定向', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 2: 302 临时重定向
// ==========================================
function test2_302_REDIRECT() {
    console.log('\n【测试 2】302 临时重定向');
    console.log('接口: https://httpbin.org/redirect-to?url=https://httpbin.org/get&status_code=302');
    
    return fetch('https://httpbin.org/redirect-to?url=https://httpbin.org/get&status_code=302')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            console.log('  Final URL:', response.url);
            
            var passed = response.status === 200 && response.ok;
            
            return response.json().then(function(data) {
                console.log('  响应数据:', JSON.stringify(data, null, 2).substring(0, 200));
                recordTest('302 临时重定向', passed);
                return { success: true };
            });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('302 临时重定向', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 3: 多次重定向
// ==========================================
function test3_MULTIPLE_REDIRECTS() {
    console.log('\n【测试 3】多次重定向');
    console.log('接口: https://httpbin.org/redirect/3 (3次重定向)');
    
    return fetch('https://httpbin.org/redirect/3')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            console.log('  Final URL:', response.url);
            
            var passed = response.status === 200 && response.ok;
            
            return response.json().then(function(data) {
                console.log('  最终响应:', JSON.stringify(data, null, 2).substring(0, 200));
                recordTest('多次重定向 (3次)', passed);
                return { success: true };
            });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('多次重定向 (3次)', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 4: 401 未授权
// ==========================================
function test4_401_UNAUTHORIZED() {
    console.log('\n【测试 4】401 未授权');
    console.log('接口: https://httpbin.org/basic-auth/user/passwd (不提供认证)');
    
    return fetch('https://httpbin.org/basic-auth/user/passwd')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            // 应该是 401
            var passed = response.status === 401 && !response.ok;
            
            if (passed) {
                console.log('  ✅ 正确返回 401');
            }
            
            // 尝试读取响应体
            return response.text().then(function(text) {
                console.log('  响应体:', text.substring(0, 100));
                recordTest('401 未授权响应', passed);
                return { success: true };
            });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('401 未授权响应', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 5: 401 正确认证
// ==========================================
function test5_401_WITH_AUTH() {
    console.log('\n【测试 5】401 正确认证');
    console.log('接口: https://httpbin.org/basic-auth/user/passwd (提供认证)');
    
    // Basic Auth: user:passwd
    var credentials = btoa('user:passwd'); // base64 编码
    
    return fetch('https://httpbin.org/basic-auth/user/passwd', {
        headers: {
            'Authorization': 'Basic ' + credentials
        }
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  OK:', response.ok);
        
        // 应该是 200
        var passed = response.status === 200 && response.ok;
        
        return response.json().then(function(data) {
            console.log('  响应数据:', JSON.stringify(data, null, 2));
            
            if (data.authenticated === true && data.user === 'user') {
                console.log('  ✅ 认证成功');
            }
            
            recordTest('401 正确认证', passed && data.authenticated);
            return { success: true };
        });
    })
    .catch(function(error) {
        console.log('  错误:', error.message || String(error));
        recordTest('401 正确认证', false);
        return { success: false, error: String(error) };
    });
}

// ==========================================
// 测试 6: 403 禁止访问
// ==========================================
function test6_403_FORBIDDEN() {
    console.log('\n【测试 6】403 禁止访问');
    console.log('接口: https://httpbin.org/status/403');
    
    return fetch('https://httpbin.org/status/403')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            // 应该是 403
            var passed = response.status === 403 && !response.ok;
            
            if (passed) {
                console.log('  ✅ 正确返回 403');
            }
            
            recordTest('403 禁止访问', passed);
            
            return response.text().then(function(text) {
                console.log('  响应体长度:', text.length);
                return { success: true };
            });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('403 禁止访问', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 7: 500 服务器错误
// ==========================================
function test7_500_SERVER_ERROR() {
    console.log('\n【测试 7】500 服务器错误');
    console.log('接口: https://httpbin.org/status/500');
    
    return fetch('https://httpbin.org/status/500')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            // 应该是 500
            var passed = response.status === 500 && !response.ok;
            
            if (passed) {
                console.log('  ✅ 正确返回 500');
            }
            
            recordTest('500 服务器错误', passed);
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('500 服务器错误', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 8: 503 服务不可用
// ==========================================
function test8_503_SERVICE_UNAVAILABLE() {
    console.log('\n【测试 8】503 服务不可用');
    console.log('接口: https://httpbin.org/status/503');
    
    return fetch('https://httpbin.org/status/503')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            // 应该是 503
            var passed = response.status === 503 && !response.ok;
            
            if (passed) {
                console.log('  ✅ 正确返回 503');
            }
            
            recordTest('503 服务不可用', passed);
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('503 服务不可用', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 9: Bearer Token 认证
// ==========================================
function test9_BEARER_TOKEN() {
    console.log('\n【测试 9】Bearer Token 认证');
    console.log('接口: https://httpbin.org/bearer (不提供 token)');
    
    return fetch('https://httpbin.org/bearer')
        .then(function(response) {
            console.log('  Status (无 token):', response.status);
            
            // 应该是 401
            var passed = response.status === 401;
            
            if (passed) {
                console.log('  ✅ 无 token 正确返回 401');
            }
            
            // 再测试提供 token
            console.log('\n  提供 token 重新请求...');
            return fetch('https://httpbin.org/bearer', {
                headers: {
                    'Authorization': 'Bearer test-token-12345'
                }
            });
        })
        .then(function(response) {
            console.log('  Status (有 token):', response.status);
            console.log('  OK:', response.ok);
            
            return response.json();
        })
        .then(function(data) {
            console.log('  响应数据:', JSON.stringify(data, null, 2));
            
            var passed = data.authenticated === true && data.token === 'test-token-12345';
            
            if (passed) {
                console.log('  ✅ Bearer Token 认证成功');
            }
            
            recordTest('Bearer Token 认证', passed);
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('Bearer Token 认证', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 主测试流程
// ==========================================
function runAllTests() {
    console.log('开始执行测试...\n');
    
    return test1_301_REDIRECT()
        .then(function() { return test2_302_REDIRECT(); })
        .then(function() { return test3_MULTIPLE_REDIRECTS(); })
        .then(function() { return test4_401_UNAUTHORIZED(); })
        .then(function() { return test5_401_WITH_AUTH(); })
        .then(function() { return test6_403_FORBIDDEN(); })
        .then(function() { return test7_500_SERVER_ERROR(); })
        .then(function() { return test8_503_SERVICE_UNAVAILABLE(); })
        .then(function() { return test9_BEARER_TOKEN(); })
        .then(function() {
            // 打印测试总结
            console.log('\n========================================');
            console.log('测试总结');
            console.log('========================================');
            console.log('总测试数:', testResults.total);
            console.log('通过:', testResults.passed);
            console.log('失败:', testResults.failed);
            console.log('通过率:', (testResults.passed / testResults.total * 100).toFixed(2) + '%');
            console.log('\n测试覆盖:');
            console.log('  ✅ 3xx 重定向 (301, 302, 多次重定向)');
            console.log('  ✅ 401 未授权 (Basic Auth, Bearer Token)');
            console.log('  ✅ 403 禁止访问');
            console.log('  ✅ 500 服务器错误');
            console.log('  ✅ 503 服务不可用');
            console.log('========================================\n');
            
            return testResults;
        });
}

// 执行所有测试
return runAllTests();


