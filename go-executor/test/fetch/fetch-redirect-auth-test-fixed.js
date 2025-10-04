/**
 * Fetch API - 重定向和认证测试 (改进版)
 * 
 * 🔥 修复要点:
 * 1. 移除全局状态依赖
 * 2. 每个测试返回结果对象
 * 3. 使用 Promise 链串联测试
 */

console.log('========================================');
console.log('Fetch API - 重定向和认证测试 (改进版)');
console.log('========================================');

// 主测试函数
function runAllTests() {
    var results = [];
    
    // 链式执行所有测试
    return Promise.resolve()
        .then(function() { 
            console.log('\n开始测试...\n');
            return test1_301_REDIRECT(); 
        })
        .then(function(result) { 
            results.push(result);
            return test2_302_REDIRECT();
        })
        .then(function(result) { 
            results.push(result);
            return test3_MULTIPLE_REDIRECTS();
        })
        .then(function(result) { 
            results.push(result);
            return test4_401_NO_AUTH();
        })
        .then(function(result) { 
            results.push(result);
            return test5_401_WITH_AUTH();
        })
        .then(function(result) { 
            results.push(result);
            return test6_403_FORBIDDEN();
        })
        .then(function(result) { 
            results.push(result);
            
            // 汇总结果
            var passed = results.filter(function(r) { return r.passed; }).length;
            var failed = results.filter(function(r) { return !r.passed; }).length;
            
            console.log('\n========================================');
            console.log('📊 测试完成!');
            console.log('总计:', results.length);
            console.log('通过:', passed);
            console.log('失败:', failed);
            console.log('成功率:', Math.round(passed / results.length * 100) + '%');
            console.log('========================================');
            
            return {
                success: true,
                summary: { 
                    total: results.length, 
                    passed: passed, 
                    failed: failed,
                    successRate: Math.round(passed / results.length * 100)
                },
                details: results
            };
        })
        .catch(function(error) {
            console.log('\n❌ 测试执行失败:', error.message || String(error));
            return {
                success: false,
                error: error.message || String(error),
                results: results
            };
        });
}

// ==========================================
// 测试 1: 301 永久重定向
// ==========================================
function test1_301_REDIRECT() {
    console.log('【测试 1】301 永久重定向');
    console.log('接口: https://httpbin.org/redirect-to?url=https://httpbin.org/get&status_code=301');
    
    return fetch('https://httpbin.org/redirect-to?url=https://httpbin.org/get&status_code=301')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            console.log('  Final URL:', response.url);
            
            var passed = response.status === 200 && response.ok;
            console.log(passed ? '  ✅ 通过' : '  ❌ 失败');
            
            return response.json().then(function(data) {
                return {
                    testName: '301 永久重定向',
                    passed: passed,
                    status: response.status,
                    finalUrl: response.url
                };
            });
        })
        .catch(function(error) {
            console.log('  ❌ 错误:', error.message || String(error));
            return {
                testName: '301 永久重定向',
                passed: false,
                error: error.message || String(error)
            };
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
            console.log(passed ? '  ✅ 通过' : '  ❌ 失败');
            
            return response.json().then(function(data) {
                return {
                    testName: '302 临时重定向',
                    passed: passed,
                    status: response.status,
                    finalUrl: response.url
                };
            });
        })
        .catch(function(error) {
            console.log('  ❌ 错误:', error.message || String(error));
            return {
                testName: '302 临时重定向',
                passed: false,
                error: error.message || String(error)
            };
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
            console.log(passed ? '  ✅ 通过' : '  ❌ 失败');
            
            return response.json().then(function(data) {
                return {
                    testName: '多次重定向',
                    passed: passed,
                    status: response.status,
                    finalUrl: response.url
                };
            });
        })
        .catch(function(error) {
            console.log('  ❌ 错误:', error.message || String(error));
            return {
                testName: '多次重定向',
                passed: false,
                error: error.message || String(error)
            };
        });
}

// ==========================================
// 测试 4: 401 未授权
// ==========================================
function test4_401_NO_AUTH() {
    console.log('\n【测试 4】401 未授权');
    console.log('接口: https://httpbin.org/basic-auth/user/passwd (不提供认证)');
    
    return fetch('https://httpbin.org/basic-auth/user/passwd')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  OK:', response.ok);
            
            var passed = response.status === 401 && !response.ok;
            console.log(passed ? '  ✅ 通过' : '  ❌ 失败');
            
            return response.text().then(function(text) {
                return {
                    testName: '401 未授权',
                    passed: passed,
                    status: response.status
                };
            });
        })
        .catch(function(error) {
            console.log('  ❌ 错误:', error.message || String(error));
            return {
                testName: '401 未授权',
                passed: false,
                error: error.message || String(error)
            };
        });
}

// ==========================================
// 测试 5: 401 正确认证
// ==========================================
function test5_401_WITH_AUTH() {
    console.log('\n【测试 5】401 正确认证');
    console.log('接口: https://httpbin.org/basic-auth/user/passwd (提供认证)');
    
    // Basic Auth: user:passwd
    var credentials = btoa('user:passwd');
    
    return fetch('https://httpbin.org/basic-auth/user/passwd', {
        headers: {
            'Authorization': 'Basic ' + credentials
        }
    })
    .then(function(response) {
        console.log('  Status:', response.status);
        console.log('  OK:', response.ok);
        
        return response.json().then(function(data) {
            console.log('  响应数据:', JSON.stringify(data, null, 2));
            
            var passed = response.status === 200 && data.authenticated === true;
            
            if (passed) {
                console.log('  ✅ 通过 - 认证成功');
            } else {
                console.log('  ❌ 失败 - 认证失败');
            }
            
            return {
                testName: '401 正确认证',
                passed: passed,
                status: response.status,
                authenticated: data.authenticated,
                user: data.user
            };
        });
    })
    .catch(function(error) {
        console.log('  ❌ 错误:', error.message || String(error));
        return {
            testName: '401 正确认证',
            passed: false,
            error: error.message || String(error)
        };
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
            
            var passed = response.status === 403 && !response.ok;
            console.log(passed ? '  ✅ 通过' : '  ❌ 失败');
            
            return response.text().then(function(text) {
                return {
                    testName: '403 禁止访问',
                    passed: passed,
                    status: response.status
                };
            });
        })
        .catch(function(error) {
            console.log('  ❌ 错误:', error.message || String(error));
            return {
                testName: '403 禁止访问',
                passed: false,
                error: error.message || String(error)
            };
        });
}

// 执行所有测试
return runAllTests();


