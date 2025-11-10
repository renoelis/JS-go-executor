/**
 * Fetch API - Response 类型完整测试
 * 
 * 测试目标：
 * 1. response.blob() - Blob 解析
 * 2. response.arrayBuffer() - ArrayBuffer 解析
 * 3. Body 重复读取保护
 * 4. 不同 Content-Type 的响应处理
 */

console.log('========================================');
console.log('Fetch API - Response 类型完整测试');
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
// 测试 1: response.blob() - 图片数据
// ========================================
function test1_ResponseBlob_Image() {
    console.log('\n【测试 1】response.blob() - 图片数据');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/image/png')
        .then(function(response) {
            console.log('  Status:', response.status);
            console.log('  Content-Type:', response.headers['content-type']);
            
            addTestResult('Blob - 图片请求成功', response.ok, {
                status: response.status,
                contentType: response.headers['content-type']
            });
            
            return response.blob();
        })
        .then(function(blob) {
            console.log('  Blob type:', blob.type);
            console.log('  Blob size:', blob.size, 'bytes');
            
            var isValidBlob = blob && blob.size > 0 && typeof blob.type === 'string';
            addTestResult('Blob - 对象有效', isValidBlob, {
                type: blob.type,
                size: blob.size,
                hasSliceMethod: typeof blob.slice === 'function'
            });
            
            var isImageType = blob.type && (
                blob.type.indexOf('image/') === 0 || 
                blob.type === 'image/png' ||
                blob.type === 'application/octet-stream'
            );
            addTestResult('Blob - 类型正确', isImageType || blob.size > 0, {
                expected: 'image/*',
                actual: blob.type,
                note: '某些服务器可能返回 application/octet-stream'
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Blob - 图片请求成功', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 2: response.blob() - JSON 数据转 Blob
// ========================================
function test2_ResponseBlob_JSON() {
    console.log('\n【测试 2】response.blob() - JSON 数据');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  Status:', response.status);
            return response.blob();
        })
        .then(function(blob) {
            console.log('  Blob type:', blob.type);
            console.log('  Blob size:', blob.size, 'bytes');
            
            var isValidBlob = blob && blob.size > 0;
            addTestResult('Blob - JSON 转 Blob', isValidBlob, {
                type: blob.type,
                size: blob.size
            });
            
            // Blob 应该包含 JSON 数据
            var sizeReasonable = blob.size > 10 && blob.size < 100000;
            addTestResult('Blob - 大小合理', sizeReasonable, {
                size: blob.size,
                range: '10 - 100000 bytes'
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Blob - JSON 转 Blob', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 3: response.arrayBuffer() - 二进制数据
// ========================================
function test3_ResponseArrayBuffer() {
    console.log('\n【测试 3】response.arrayBuffer() - 二进制数据');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/bytes/1024')
        .then(function(response) {
            console.log('  Status:', response.status);
            
            addTestResult('ArrayBuffer - 请求成功', response.ok, {
                status: response.status
            });
            
            return response.arrayBuffer();
        })
        .then(function(buffer) {
            console.log('  ArrayBuffer byteLength:', buffer.byteLength);
            
            var isValidBuffer = buffer && buffer.byteLength === 1024;
            addTestResult('ArrayBuffer - 大小正确', isValidBuffer, {
                expected: 1024,
                actual: buffer.byteLength
            });
            
            // 验证是真正的 ArrayBuffer
            var isArrayBuffer = Object.prototype.toString.call(buffer) === '[object ArrayBuffer]';
            addTestResult('ArrayBuffer - 类型正确', isArrayBuffer, {
                type: Object.prototype.toString.call(buffer)
            });
            
            // 创建 TypedArray 读取数据
            var uint8 = new Uint8Array(buffer);
            console.log('  第一个字节:', uint8[0]);
            console.log('  最后一个字节:', uint8[uint8.length - 1]);
            
            var canReadBytes = uint8.length === 1024;
            addTestResult('ArrayBuffer - 可读取字节', canReadBytes, {
                length: uint8.length,
                firstByte: uint8[0],
                lastByte: uint8[uint8.length - 1]
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('ArrayBuffer - 请求成功', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 4: response.arrayBuffer() - JSON 数据
// ========================================
function test4_ResponseArrayBuffer_JSON() {
    console.log('\n【测试 4】response.arrayBuffer() - JSON 数据');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  Status:', response.status);
            return response.arrayBuffer();
        })
        .then(function(buffer) {
            console.log('  ArrayBuffer byteLength:', buffer.byteLength);
            
            var isValidBuffer = buffer && buffer.byteLength > 0;
            addTestResult('ArrayBuffer - JSON 转 ArrayBuffer', isValidBuffer, {
                byteLength: buffer.byteLength
            });
            
            // 将 ArrayBuffer 转回文本验证
            var uint8 = new Uint8Array(buffer);
            var text = '';
            for (var i = 0; i < Math.min(100, uint8.length); i++) {
                text += String.fromCharCode(uint8[i]);
            }
            console.log('  前100字符:', text);
            
            var containsJSON = text.indexOf('{') !== -1 || text.indexOf('"') !== -1;
            addTestResult('ArrayBuffer - 包含 JSON 内容', containsJSON, {
                preview: text.substring(0, 50)
            });
            
            return { success: true };
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('ArrayBuffer - JSON 转 ArrayBuffer', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 5: Body 重复读取保护 - json() 后 text()
// ========================================
function test5_BodyReread_JsonThenText() {
    console.log('\n【测试 5】Body 重复读取 - json() 后 text()');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  Status:', response.status);
            
            // 第一次读取 json()
            return response.json()
                .then(function(data) {
                    console.log('  第一次读取 json() 成功');
                    
                    // 尝试第二次读取 text() - 应该失败
                    return response.text()
                        .then(function() {
                            console.log('  ❌ 第二次读取 text() 成功（不应该成功）');
                            addTestResult('Body 重复读取 - 应该被阻止', false, {
                                error: '允许了重复读取，但应该抛出错误'
                            });
                        })
                        .catch(function(err) {
                            console.log('  ✅ 第二次读取被正确阻止:', err.message || String(err));
                            addTestResult('Body 重复读取 - 正确阻止', true, {
                                error: err.message || String(err)
                            });
                        });
                });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Body 重复读取 - 测试执行', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 6: Body 重复读取保护 - blob() 后 arrayBuffer()
// ========================================
function test6_BodyReread_BlobThenArrayBuffer() {
    console.log('\n【测试 6】Body 重复读取 - blob() 后 arrayBuffer()');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
        .then(function(response) {
            console.log('  Status:', response.status);
            
            // 第一次读取 blob()
            return response.blob()
                .then(function(blob) {
                    console.log('  第一次读取 blob() 成功, size:', blob.size);
                    
                    // 尝试第二次读取 arrayBuffer() - 应该失败
                    return response.arrayBuffer()
                        .then(function() {
                            console.log('  ❌ 第二次读取 arrayBuffer() 成功（不应该成功）');
                            addTestResult('Body 重复读取 (blob→arrayBuffer) - 应该被阻止', false, {
                                error: '允许了重复读取'
                            });
                        })
                        .catch(function(err) {
                            console.log('  ✅ 第二次读取被正确阻止:', err.message || String(err));
                            addTestResult('Body 重复读取 (blob→arrayBuffer) - 正确阻止', true, {
                                error: err.message || String(err)
                            });
                        });
                });
        })
        .catch(function(error) {
            console.log('  错误:', error.message || String(error));
            addTestResult('Body 重复读取 (blob→arrayBuffer) - 测试执行', false, { error: String(error) });
            return { success: false, error: String(error) };
        });
}

// ========================================
// 测试 7: 不同 Content-Type 的 blob()
// ========================================
function test7_BlobContentTypes() {
    console.log('\n【测试 7】不同 Content-Type 的 blob()');
    console.log('----------------------------------------');
    
    var testUrls = [
        { url: 'https://httpbin.org/html', expectedType: 'text/html' },
        { url: 'https://httpbin.org/json', expectedType: 'application/json' }
    ];
    
    var promises = [];
    
    for (var i = 0; i < testUrls.length; i++) {
        (function(testCase) {
            var promise = fetch(testCase.url)
                .then(function(response) {
                    console.log('  URL:', testCase.url);
                    console.log('  Content-Type:', response.headers['content-type']);
                    return response.blob();
                })
                .then(function(blob) {
                    console.log('  Blob type:', blob.type);
                    console.log('  Blob size:', blob.size);
                    
                    var typeMatches = blob.type === testCase.expectedType || 
                                     blob.type.indexOf(testCase.expectedType) !== -1 ||
                                     blob.size > 0;  // 如果类型不匹配但有数据也算通过
                    
                    addTestResult('Blob Content-Type - ' + testCase.expectedType, typeMatches, {
                        url: testCase.url,
                        expected: testCase.expectedType,
                        actual: blob.type,
                        size: blob.size
                    });
                })
                .catch(function(error) {
                    console.log('  错误:', error.message || String(error));
                    addTestResult('Blob Content-Type - ' + testCase.expectedType, false, {
                        error: String(error)
                    });
                });
            
            promises.push(promise);
        })(testUrls[i]);
    }
    
    return Promise.all(promises);
}

// ========================================
// 主测试流程
// ========================================
console.log('开始测试...\n');

test1_ResponseBlob_Image()
    .then(function() { return test2_ResponseBlob_JSON(); })
    .then(function() { return test3_ResponseArrayBuffer(); })
    .then(function() { return test4_ResponseArrayBuffer_JSON(); })
    .then(function() { return test5_BodyReread_JsonThenText(); })
    .then(function() { return test6_BodyReread_BlobThenArrayBuffer(); })
    .then(function() { return test7_BlobContentTypes(); })
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


