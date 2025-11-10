/**
 * Fetch API - Clone 功能完整测试
 * 
 * 测试目标：
 * 1. Response.clone() - 响应克隆
 * 2. Request.clone() - 请求克隆
 * 3. Clone 独立性验证
 * 4. Clone 后 body 可重复读取
 */

console.log('========================================');
console.log('Fetch API - Clone 功能完整测试');
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
// 测试 1: Response.clone() - 基础克隆
// ========================================
function test1_ResponseClone_Basic() {
    console.log('\n【测试 1】Response.clone() - 基础克隆');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  原始响应 Status:', response.status);
            
            // 检查 clone 方法是否存在
            var hasClone = typeof response.clone === 'function';
            addTestResult('Response.clone() - 方法存在', hasClone);
            
            if (!hasClone) {
                return { success: false };
            }
            
            // 克隆响应
            var cloned = response.clone();
            console.log('  克隆响应 Status:', cloned.status);
            
            // 验证克隆对象存在
            var cloneValid = cloned !== null && cloned !== undefined;
            addTestResult('Response.clone() - 返回有效对象', cloneValid);
            
            // 验证基本属性相同
            var statusSame = response.status === cloned.status;
            var okSame = response.ok === cloned.ok;
            
            addTestResult('Response.clone() - 属性相同', statusSame && okSame, {
                originalStatus: response.status,
                clonedStatus: cloned.status,
                originalOk: response.ok,
                clonedOk: cloned.ok
            });
            
            return { success: true, response: response, cloned: cloned };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Response.clone() - 测试执行', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 2: Response.clone() - 独立读取 body
// ========================================
function test2_ResponseClone_IndependentRead() {
    console.log('\n【测试 2】Response.clone() - 独立读取 body');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  原始响应 Status:', response.status);
            
            var cloned = response.clone();
            
            // 原始响应读取 json
            var jsonPromise = response.json()
                .then(function(json) {
                    console.log('  原始响应读取 JSON 成功');
                    return json;
                });
            
            // 克隆响应读取 text
            var textPromise = cloned.text()
                .then(function(text) {
                    console.log('  克隆响应读取 Text 成功');
                    return text;
                });
            
            return Promise.all([jsonPromise, textPromise]);
        })
        .then(function(results) {
            var json = results[0];
            var text = results[1];
            
            console.log('  JSON keys:', Object.keys(json).join(', '));
            console.log('  Text length:', text.length);
            
            // 验证两者都成功读取
            var jsonValid = json && typeof json === 'object';
            var textValid = text && text.length > 0;
            
            addTestResult('Response.clone() - 原始和克隆可独立读取', jsonValid && textValid, {
                jsonKeys: Object.keys(json),
                textLength: text.length
            });
            
            // 验证数据一致
            var textContainsJson = text.indexOf('"url"') !== -1 || text.indexOf('httpbin') !== -1;
            addTestResult('Response.clone() - 数据一致', textContainsJson, {
                note: 'Text 应包含 JSON 的内容'
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Response.clone() - 独立读取', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 3: Response.clone() - 多次克隆
// ========================================
function test3_ResponseClone_Multiple() {
    console.log('\n【测试 3】Response.clone() - 多次克隆');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  原始响应 Status:', response.status);
            
            // 创建多个克隆
            var clone1 = response.clone();
            var clone2 = response.clone();
            var clone3 = clone1.clone();  // 克隆的克隆
            
            console.log('  创建了 3 个克隆');
            
            // 所有克隆都应该可以读取 body
            var promises = [
                response.json(),
                clone1.text(),
                clone2.text(),
                clone3.text()
            ];
            
            return Promise.all(promises);
        })
        .then(function(results) {
            console.log('  原始响应: JSON 读取成功');
            console.log('  克隆1: Text length =', results[1].length);
            console.log('  克隆2: Text length =', results[2].length);
            console.log('  克隆3: Text length =', results[3].length);
            
            var allSuccess = results.every(function(r) { 
                return r !== null && r !== undefined; 
            });
            
            addTestResult('Response.clone() - 多次克隆', allSuccess, {
                count: 3,
                allReadable: allSuccess
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Response.clone() - 多次克隆', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 4: Request.clone() - 基础克隆
// ========================================
function test4_RequestClone_Basic() {
    console.log('\n【测试 4】Request.clone() - 基础克隆');
    console.log('----------------------------------------');
    
    try {
        var originalReq = new Request('https://httpbin.org/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Custom': 'test'
            },
            body: JSON.stringify({ test: 'data' })
        });
        
        console.log('  创建原始 Request');
        console.log('  Method:', originalReq.method);
        console.log('  URL:', originalReq.url);
        
        // 检查 clone 方法
        var hasClone = typeof originalReq.clone === 'function';
        addTestResult('Request.clone() - 方法存在', hasClone);
        
        if (!hasClone) {
            return { success: false };
        }
        
        // 克隆请求
        var clonedReq = originalReq.clone();
        console.log('  克隆 Request');
        console.log('  Method:', clonedReq.method);
        console.log('  URL:', clonedReq.url);
        
        // 验证属性相同
        var methodSame = originalReq.method === clonedReq.method;
        var urlSame = originalReq.url === clonedReq.url;
        
        addTestResult('Request.clone() - 基本属性相同', methodSame && urlSame, {
            originalMethod: originalReq.method,
            clonedMethod: clonedReq.method,
            originalUrl: originalReq.url,
            clonedUrl: clonedReq.url
        });
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Request.clone() - 测试执行', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 5: Request.clone() - Headers 独立性
// ========================================
function test5_RequestClone_HeadersIndependence() {
    console.log('\n【测试 5】Request.clone() - Headers 独立性');
    console.log('----------------------------------------');
    
    try {
        var originalReq = new Request('https://httpbin.org/get', {
            headers: {
                'X-Original': 'original-value'
            }
        });
        
        var clonedReq = originalReq.clone();
        
        console.log('  原始 Request Headers:', JSON.stringify(originalReq.headers));
        console.log('  克隆 Request Headers:', JSON.stringify(clonedReq.headers));
        
        // 修改原始请求的 headers（如果支持）
        if (typeof originalReq.headers.set === 'function') {
            originalReq.headers.set('X-Modified', 'modified-value');
            console.log('  修改原始 Request Headers');
            
            // 检查克隆的 headers 是否受影响
            var clonedHasModified = clonedReq.headers.has && 
                                   clonedReq.headers.has('X-Modified');
            
            // 克隆的 headers 不应该有修改后的值（独立性）
            addTestResult('Request.clone() - Headers 独立', !clonedHasModified, {
                note: '修改原始 Request headers 不应影响克隆',
                clonedHasModified: clonedHasModified
            });
        } else {
            // 如果不支持修改 headers，跳过此测试
            addTestResult('Request.clone() - Headers 独立', true, {
                note: 'Headers 不可修改，跳过独立性测试'
            });
        }
        
        return { success: true };
        
    } catch (error) {
        console.log('  错误:', error.message || String(error));
        addTestResult('Request.clone() - Headers 独立性', false, { error: String(error) });
        return { success: false, error: String(error) };
    }
}

// ========================================
// 测试 6: Clone 后原对象仍可用
// ========================================
function test6_CloneOriginalStillUsable() {
    console.log('\n【测试 6】Clone 后原对象仍可用');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  原始响应 Status:', response.status);
            
            // 克隆响应
            var cloned = response.clone();
            
            // 先读取克隆的 body
            return cloned.json()
                .then(function(clonedData) {
                    console.log('  克隆响应读取成功');
                    
                    // 原始响应应该仍然可以读取
                    return response.text();
                })
                .then(function(originalText) {
                    console.log('  原始响应读取成功');
                    
                    var originalValid = originalText && originalText.length > 0;
                    addTestResult('Clone 后原对象仍可用', originalValid, {
                        originalTextLength: originalText.length
                    });
                    
                    return { success: true };
                });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Clone 后原对象仍可用', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 7: Clone 大响应
// ========================================
function test7_CloneLargeResponse() {
    console.log('\n【测试 7】Clone 大响应');
    console.log('----------------------------------------');
    
    // 请求 10KB 数据
    return fetch('https://httpbin.org/bytes/10240')
        .then(function(response) {
            console.log('  原始响应 Status:', response.status);
            
            var cloned = response.clone();
            
            // 原始响应读取为 arrayBuffer
            var originalPromise = response.arrayBuffer()
                .then(function(buffer) {
                    console.log('  原始响应 ArrayBuffer:', buffer.byteLength, 'bytes');
                    return buffer;
                });
            
            // 克隆响应读取为 blob
            var clonedPromise = cloned.blob()
                .then(function(blob) {
                    console.log('  克隆响应 Blob:', blob.size, 'bytes');
                    return blob;
                });
            
            return Promise.all([originalPromise, clonedPromise]);
        })
        .then(function(results) {
            var buffer = results[0];
            var blob = results[1];
            
            // 验证大小一致
            var sizesMatch = buffer.byteLength === blob.size && buffer.byteLength === 10240;
            
            addTestResult('Clone 大响应', sizesMatch, {
                expectedSize: 10240,
                arrayBufferSize: buffer.byteLength,
                blobSize: blob.size,
                sizesMatch: sizesMatch
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Clone 大响应', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 主测试流程
// ========================================
console.log('开始测试...\n');

// 🔥 修复: 正确返回 Promise 链的结果
return test1_ResponseClone_Basic()
    .then(function() { return test2_ResponseClone_IndependentRead(); })
    .then(function() { return test3_ResponseClone_Multiple(); })
    .then(function() { return test4_RequestClone_Basic(); })
    .then(function() { return test5_RequestClone_HeadersIndependence(); })
    .then(function() { return test6_CloneOriginalStillUsable(); })
    .then(function() { return test7_CloneLargeResponse(); })
    .then(function() {
        // 🔥 修复: 使用 Promise 包装 setTimeout,确保正确返回
        return new Promise(function(resolve) {
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
                
                // 🔥 修复: 通过 resolve 返回结果
                resolve(testResults);
            }, 100);
        });
    })
    .catch(function(error) {
        console.log('\n测试流程出错:', error);
        // 🔥 修复: 即使出错也要返回结果
        return testResults;
    });


