// ====================================
// Response.body.cancel() 标准 API 测试
// ====================================
//
// 测试目标：
// 1. response.body.cancel() 立即关闭连接
// 2. 动态超时机制按响应大小调整
// 3. 符合 ReadableStream 标准

console.log('='.repeat(60));
console.log('Response Body Cancel 功能测试');
console.log('='.repeat(60));

var TEST_API = 'https://httpbin.org';
var testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function addTestResult(testName, success, details) {
    testResults.tests.push({
        name: testName,
        success: success,
        details: details || {}
    });
    
    if (success) {
        testResults.passed++;
        console.log('  ✅', testName);
    } else {
        testResults.failed++;
        console.log('  ❌', testName);
        if (details && details.error) {
            console.log('     错误:', details.error);
        }
    }
}

// ==================== 测试 1: response.body.cancel() 基础功能 ====================
function test1_BasicCancel() {
    console.log('\n【测试 1】response.body.cancel() - 基础功能');
    
    return fetch(TEST_API + '/bytes/1024')  // 1KB 响应
        .then(function(response) {
            console.log('  收到响应:', response.status);
            
            // 检查 body.cancel 方法存在
            if (typeof response.body.cancel !== 'function') {
                addTestResult('body.cancel 方法存在', false, {
                    error: 'response.body.cancel is not a function'
                });
                return { success: false };
            }
            
            addTestResult('body.cancel 方法存在', true);
            
            // 调用 cancel() 立即关闭
            var cancelPromise = response.body.cancel();
            
            // cancel() 应该返回 Promise
            var isPromise = cancelPromise && typeof cancelPromise.then === 'function';
            addTestResult('cancel() 返回 Promise', isPromise);
            
            return cancelPromise.then(function() {
                addTestResult('cancel() 成功执行', true);
                return { success: true };
            });
        })
        .catch(function(error) {
            addTestResult('基础 cancel 功能', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 2: cancel() 后不能再读取 ====================
function test2_CannotReadAfterCancel() {
    console.log('\n【测试 2】cancel() 后不能再读取');
    
    return fetch(TEST_API + '/bytes/1024')
        .then(function(response) {
            console.log('  收到响应:', response.status);
            
            // 先 cancel
            return response.body.cancel().then(function() {
                console.log('  已调用 cancel()');
                
                // 尝试读取（应该失败或返回空）
                return response.text()
                    .then(function(text) {
                        // 有些实现可能返回空字符串
                        var isEmpty = text === '' || text.length === 0;
                        addTestResult('cancel 后读取返回空', isEmpty, {
                            textLength: text.length
                        });
                        return { success: isEmpty };
                    })
                    .catch(function(error) {
                        // 或者抛出错误（更标准）
                        addTestResult('cancel 后读取抛出错误', true, {
                            errorMessage: error.message
                        });
                        return { success: true };
                    });
            });
        })
        .catch(function(error) {
            addTestResult('cancel 后读取测试', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 3: 只检查状态，立即 cancel ====================
function test3_CheckStatusAndCancel() {
    console.log('\n【测试 3】只检查状态，立即 cancel');
    
    return fetch(TEST_API + '/status/200')
        .then(function(response) {
            console.log('  状态码:', response.status);
            
            // 只关心状态，不需要 body
            var statusOk = response.status === 200;
            addTestResult('状态码检查', statusOk);
            
            // 立即 cancel，释放连接
            return response.body.cancel().then(function() {
                addTestResult('立即 cancel 成功', true);
                return { success: true };
            });
        })
        .catch(function(error) {
            addTestResult('检查状态并 cancel', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 4: 多次调用 cancel() ====================
function test4_MultipleCancels() {
    console.log('\n【测试 4】多次调用 cancel()');
    
    return fetch(TEST_API + '/bytes/1024')
        .then(function(response) {
            console.log('  收到响应:', response.status);
            
            // 第一次 cancel
            return response.body.cancel().then(function() {
                console.log('  第一次 cancel 成功');
                
                // 第二次 cancel（应该安全，不报错）
                return response.body.cancel().then(function() {
                    addTestResult('多次 cancel 不报错', true);
                    return { success: true };
                });
            });
        })
        .catch(function(error) {
            addTestResult('多次 cancel', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 5: cancel() 与 text() 竞争 ====================
function test5_CancelVsText() {
    console.log('\n【测试 5】cancel() 与 text() 竞争');
    
    return fetch(TEST_API + '/bytes/10240')  // 10KB
        .then(function(response) {
            console.log('  收到响应:', response.status);
            
            // 同时调用 cancel 和 text
            var cancelPromise = response.body.cancel();
            var textPromise = response.text();
            
            return Promise.all([
                cancelPromise.then(function() { return { success: true }; })
                    .catch(function(e) { return { error: e.message }; }),
                textPromise.then(function() { return { success: true }; })
                    .catch(function(e) { return { error: e.message }; })
            ]).then(function(results) {
                // 至少有一个成功
                var hasSuccess = results.some(function(r) { return r.success; });
                addTestResult('cancel 与 text 竞争', hasSuccess, {
                    cancelResult: results[0],
                    textResult: results[1]
                });
                return { success: hasSuccess };
            });
        })
        .catch(function(error) {
            addTestResult('cancel 与 text 竞争', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 6: cancel() 用于错误响应 ====================
function test6_CancelErrorResponse() {
    console.log('\n【测试 6】cancel() 用于错误响应');
    
    return fetch(TEST_API + '/status/500')
        .then(function(response) {
            console.log('  状态码:', response.status);
            
            // 检测到错误状态，不需要读取 body
            if (!response.ok) {
                return response.body.cancel().then(function() {
                    addTestResult('错误响应立即 cancel', true);
                    return { success: true };
                });
            }
            
            addTestResult('错误响应检测', false, {
                error: '应该返回 500'
            });
            return { success: false };
        })
        .catch(function(error) {
            addTestResult('cancel 错误响应', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 7: 大响应立即 cancel ====================
function test7_CancelLargeResponse() {
    console.log('\n【测试 7】大响应立即 cancel');
    
    var startTime = Date.now();
    
    return fetch(TEST_API + '/bytes/102400')  // 100KB
        .then(function(response) {
            console.log('  收到响应:', response.status);
            
            // 立即 cancel，不下载完整内容
            return response.body.cancel().then(function() {
                var elapsed = Date.now() - startTime;
                console.log('  cancel 耗时:', elapsed + 'ms');
                
                // cancel 应该很快（< 1 秒）
                var isFast = elapsed < 1000;
                addTestResult('大响应立即 cancel（< 1秒）', isFast, {
                    elapsed: elapsed + 'ms'
                });
                
                return { success: true };
            });
        })
        .catch(function(error) {
            addTestResult('cancel 大响应', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 测试 8: getReader().cancel() 也能工作 ====================
function test8_ReaderCancel() {
    console.log('\n【测试 8】getReader().cancel() 也能工作');
    
    return fetch(TEST_API + '/bytes/1024')
        .then(function(response) {
            console.log('  收到响应:', response.status);
            
            var reader = response.body.getReader();
            
            // 检查 reader.cancel 存在
            if (typeof reader.cancel !== 'function') {
                addTestResult('reader.cancel 方法存在', false);
                return { success: false };
            }
            
            addTestResult('reader.cancel 方法存在', true);
            
            // 调用 reader.cancel()
            return reader.cancel().then(function() {
                addTestResult('reader.cancel() 成功', true);
                return { success: true };
            });
        })
        .catch(function(error) {
            addTestResult('reader.cancel 测试', false, {
                error: error.message
            });
            return { success: false };
        });
}

// ==================== 执行所有测试 ====================
console.log('\n开始执行测试...\n');

return test1_BasicCancel()
    .then(function() { return test2_CannotReadAfterCancel(); })
    .then(function() { return test3_CheckStatusAndCancel(); })
    .then(function() { return test4_MultipleCancels(); })
    .then(function() { return test5_CancelVsText(); })
    .then(function() { return test6_CancelErrorResponse(); })
    .then(function() { return test7_CancelLargeResponse(); })
    .then(function() { return test8_ReaderCancel(); })
    .then(function() {
        // 延迟输出总结，确保所有异步操作完成
        return new Promise(function(resolve) {
            setTimeout(function() {
                console.log('\n' + '='.repeat(60));
                console.log('测试总结');
                console.log('='.repeat(60));
                console.log('总测试数:', testResults.passed + testResults.failed);
                console.log('✅ 通过:', testResults.passed);
                console.log('❌ 失败:', testResults.failed);
                console.log('成功率:', (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(2) + '%');
                console.log('='.repeat(60));
                
                if (testResults.failed === 0) {
                    console.log('\n🎉 所有测试通过！');
                } else {
                    console.log('\n⚠️ 部分测试失败，请检查详情');
                }
                
                resolve(testResults);
            }, 100);
        });
    })
    .catch(function(error) {
        console.log('\n测试流程出错:', error);
        return testResults;
    });

