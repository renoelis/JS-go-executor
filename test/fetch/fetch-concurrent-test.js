/**
 * Fetch API - 并发请求测试
 * 
 * 测试连接池、并发处理能力
 */

console.log('========================================');
console.log('Fetch API - 并发请求测试');
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
// 测试 1: 并发 GET 请求（5个）
// ==========================================
function test1_CONCURRENT_5() {
    console.log('\n【测试 1】并发 5 个 GET 请求');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/{id}');
    
    var startTime = Date.now();
    var urls = [
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://jsonplaceholder.typicode.com/posts/2',
        'https://jsonplaceholder.typicode.com/posts/3',
        'https://jsonplaceholder.typicode.com/posts/4',
        'https://jsonplaceholder.typicode.com/posts/5'
    ];
    
    console.log('  发起 5 个并发请求...');
    
    var promises = [];
    for (var i = 0; i < urls.length; i++) {
        var promise = fetch(urls[i])
            .then(function(response) {
                return response.json();
            });
        promises.push(promise);
    }
    
    return Promise.all(promises)
        .then(function(results) {
            var elapsed = Date.now() - startTime;
            
            console.log('  所有请求完成');
            console.log('  总耗时:', elapsed, 'ms');
            console.log('  平均耗时:', (elapsed / results.length).toFixed(2), 'ms/请求');
            
            // 验证结果
            var allSuccess = true;
            for (var i = 0; i < results.length; i++) {
                if (!results[i] || !results[i].id) {
                    allSuccess = false;
                    break;
                }
                console.log('  请求', (i + 1), '- ID:', results[i].id, '- Title:', results[i].title.substring(0, 30) + '...');
            }
            
            recordTest('并发 5 个 GET 请求', allSuccess);
            
            return { success: true, elapsed: elapsed, count: results.length };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('并发 5 个 GET 请求', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 2: 并发 POST 请求（3个）
// ==========================================
function test2_CONCURRENT_POST() {
    console.log('\n【测试 2】并发 3 个 POST 请求');
    console.log('接口: https://kc.oalite.com/returnAll');
    
    var startTime = Date.now();
    
    var payloads = [
        { name: 'Request 1', value: 100 },
        { name: 'Request 2', value: 200 },
        { name: 'Request 3', value: 300 }
    ];
    
    console.log('  发起 3 个并发 POST 请求...');
    
    var promises = [];
    for (var i = 0; i < payloads.length; i++) {
        var promise = fetch('https://kc.oalite.com/returnAll', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payloads[i])
        })
        .then(function(response) {
            return response.json();
        });
        
        promises.push(promise);
    }
    
    return Promise.all(promises)
        .then(function(results) {
            var elapsed = Date.now() - startTime;
            
            console.log('  所有请求完成');
            console.log('  总耗时:', elapsed, 'ms');
            console.log('  平均耗时:', (elapsed / results.length).toFixed(2), 'ms/请求');
            
            // 验证结果
            var allSuccess = true;
            for (var i = 0; i < results.length; i++) {
                if (!results[i]) {
                    allSuccess = false;
                    break;
                }
                console.log('  响应', (i + 1), ':', JSON.stringify(results[i]).substring(0, 100) + '...');
            }
            
            recordTest('并发 3 个 POST 请求', allSuccess);
            
            return { success: true, elapsed: elapsed, count: results.length };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('并发 3 个 POST 请求', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 3: 顺序请求对比（5个）
// ==========================================
function test3_SEQUENTIAL_5() {
    console.log('\n【测试 3】顺序 5 个 GET 请求（对比）');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/{id}');
    
    var startTime = Date.now();
    var urls = [
        'https://jsonplaceholder.typicode.com/posts/6',
        'https://jsonplaceholder.typicode.com/posts/7',
        'https://jsonplaceholder.typicode.com/posts/8',
        'https://jsonplaceholder.typicode.com/posts/9',
        'https://jsonplaceholder.typicode.com/posts/10'
    ];
    
    console.log('  发起顺序请求...');
    
    var results = [];
    
    function fetchSequential(index) {
        if (index >= urls.length) {
            var elapsed = Date.now() - startTime;
            
            console.log('  所有请求完成');
            console.log('  总耗时:', elapsed, 'ms');
            console.log('  平均耗时:', (elapsed / results.length).toFixed(2), 'ms/请求');
            
            // 验证结果
            var allSuccess = true;
            for (var i = 0; i < results.length; i++) {
                if (!results[i] || !results[i].id) {
                    allSuccess = false;
                    break;
                }
                console.log('  请求', (i + 1), '- ID:', results[i].id);
            }
            
            recordTest('顺序 5 个 GET 请求', allSuccess);
            
            return { success: true, elapsed: elapsed, count: results.length };
        }
        
        return fetch(urls[index])
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                results.push(data);
                return fetchSequential(index + 1);
            });
    }
    
    return fetchSequential(0)
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('顺序 5 个 GET 请求', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 4: 大量并发请求（10个）
// ==========================================
function test4_CONCURRENT_10() {
    console.log('\n【测试 4】并发 10 个 GET 请求');
    console.log('接口: https://jsonplaceholder.typicode.com/posts/{id}');
    
    var startTime = Date.now();
    var promises = [];
    
    console.log('  发起 10 个并发请求...');
    
    for (var i = 1; i <= 10; i++) {
        var url = 'https://jsonplaceholder.typicode.com/posts/' + i;
        var promise = fetch(url)
            .then(function(response) {
                return response.json();
            });
        promises.push(promise);
    }
    
    return Promise.all(promises)
        .then(function(results) {
            var elapsed = Date.now() - startTime;
            
            console.log('  所有请求完成');
            console.log('  总耗时:', elapsed, 'ms');
            console.log('  平均耗时:', (elapsed / results.length).toFixed(2), 'ms/请求');
            console.log('  吞吐量:', (results.length / (elapsed / 1000)).toFixed(2), '请求/秒');
            
            // 验证结果
            var allSuccess = results.length === 10;
            for (var i = 0; i < results.length; i++) {
                if (!results[i] || !results[i].id) {
                    allSuccess = false;
                    break;
                }
            }
            
            console.log('  成功响应数:', results.length, '/ 10');
            
            recordTest('并发 10 个 GET 请求', allSuccess);
            
            return { success: true, elapsed: elapsed, count: results.length };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('并发 10 个 GET 请求', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 测试 5: 混合请求（GET + POST）
// ==========================================
function test5_MIXED_REQUESTS() {
    console.log('\n【测试 5】混合并发请求（GET + POST）');
    
    var startTime = Date.now();
    
    console.log('  发起混合请求...');
    
    var promises = [];
    
    // 3 个 GET 请求
    for (var i = 1; i <= 3; i++) {
        var getPromise = fetch('https://jsonplaceholder.typicode.com/posts/' + i)
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                return { type: 'GET', data: data };
            });
        promises.push(getPromise);
    }
    
    // 2 个 POST 请求
    for (var i = 1; i <= 2; i++) {
        var postPromise = fetch('https://kc.oalite.com/returnAll', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: 'data' + i })
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            return { type: 'POST', data: data };
        });
        promises.push(postPromise);
    }
    
    return Promise.all(promises)
        .then(function(results) {
            var elapsed = Date.now() - startTime;
            
            console.log('  所有请求完成');
            console.log('  总耗时:', elapsed, 'ms');
            console.log('  请求统计:');
            
            var getCount = 0;
            var postCount = 0;
            
            for (var i = 0; i < results.length; i++) {
                if (results[i].type === 'GET') {
                    getCount++;
                } else if (results[i].type === 'POST') {
                    postCount++;
                }
            }
            
            console.log('    GET 请求:', getCount);
            console.log('    POST 请求:', postCount);
            
            var allSuccess = results.length === 5 && getCount === 3 && postCount === 2;
            recordTest('混合并发请求', allSuccess);
            
            return { success: true, elapsed: elapsed };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            recordTest('混合并发请求', false);
            return { success: false, error: String(error) };
        });
}

// ==========================================
// 主测试流程
// ==========================================
function runAllTests() {
    console.log('开始执行测试...\n');
    console.log('说明: 此测试用于验证连接池和并发处理能力');
    console.log('预期: 并发请求应该比顺序请求快\n');
    
    return test1_CONCURRENT_5()
        .then(function() { return test2_CONCURRENT_POST(); })
        .then(function() { return test3_SEQUENTIAL_5(); })
        .then(function() { return test4_CONCURRENT_10(); })
        .then(function() { return test5_MIXED_REQUESTS(); })
        .then(function() {
            // 打印测试总结
            console.log('\n========================================');
            console.log('测试总结');
            console.log('========================================');
            console.log('总测试数:', testResults.total);
            console.log('通过:', testResults.passed);
            console.log('失败:', testResults.failed);
            console.log('通过率:', (testResults.passed / testResults.total * 100).toFixed(2) + '%');
            console.log('\n连接池配置参考:');
            console.log('  MaxIdleConns: 100');
            console.log('  MaxIdleConnsPerHost: 10');
            console.log('  IdleConnTimeout: 90s');
            console.log('========================================\n');
            
            return testResults;
        });
}

// 执行所有测试
return runAllTests();


