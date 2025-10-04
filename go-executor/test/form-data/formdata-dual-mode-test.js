/**
 * FormData 双模式测试
 * 测试浏览器 FormData 和 Node.js form-data 的兼容性
 * 注意：此测试需要网络连接（使用 httpbin.org）
 */

console.log("=== FormData 双模式测试 ===\n");

// 使用 httpbin.org 测试 (需要网络)
var testUrl = 'https://httpbin.org/post';
var testResults = [];

// ==================== 测试 1: 浏览器 FormData ====================
console.log("📦 测试 1: 浏览器版本 FormData (全局 new FormData())");
try {
    console.log("  步骤1.1: 创建 FormData...");
    var browserFormData = new FormData();
    console.log("  步骤1.2: 调用 append('name', 'John Doe')...");
    browserFormData.append('name', 'John Doe');
    console.log("  步骤1.3: 调用 append('age', '30')...");
    browserFormData.append('age', '30');
    console.log("  步骤1.4: 调用 append('city', 'New York')...");
    browserFormData.append('city', 'New York');

    // 检查类型标识
    console.log("✓ 浏览器 FormData 创建成功");
    
    // 安全地访问属性
    console.log("  步骤1.5: 读取 __isFormData...");
    var isFormData = browserFormData.__isFormData;
    console.log("  步骤1.6: 读取 __isNodeFormData...");
    var isNodeFormData = browserFormData.__isNodeFormData;
    console.log("  步骤1.7: 读取 __type...");
    var typeValue = browserFormData.__type;
    
    console.log("  __isFormData: " + (isFormData !== undefined ? isFormData : 'undefined'));
    console.log("  __isNodeFormData: " + (isNodeFormData !== undefined ? isNodeFormData : 'undefined'));
    console.log("  __type: " + (typeValue !== undefined ? typeValue : 'undefined'));

    // 浏览器版本没有 getHeaders() 方法
    var hasGetHeaders = typeof browserFormData.getHeaders === 'function';
    console.log("  有 getHeaders() 方法: " + hasGetHeaders);

    if (hasGetHeaders) {
        console.error("❌ 错误: 浏览器 FormData 不应该有 getHeaders() 方法");
        testResults.push({ name: '测试1', success: false });
    } else {
        console.log("✅ 浏览器 FormData 验证通过\n");
        testResults.push({ name: '测试1', success: true });
    }
} catch (error) {
    console.error("❌ 浏览器 FormData 测试失败: " + error.message);
    console.error("  Stack: " + (error.stack || 'no stack'));
    testResults.push({ name: '测试1', success: false, error: error.message });
}

// ==================== 测试 2: Node.js FormData ====================
console.log("📦 测试 2: Node.js 版本 FormData (require('form-data'))");
try {
    var NodeFormDataClass = require('form-data');
    var nodeFormData = new NodeFormDataClass();

    nodeFormData.append('username', 'alice');
    nodeFormData.append('email', 'alice@example.com');

    // 检查类型标识
    console.log("✓ Node.js FormData 创建成功");
    console.log("  __isFormData: " + nodeFormData.__isFormData);
    console.log("  __isNodeFormData: " + nodeFormData.__isNodeFormData);
    console.log("  __type: " + nodeFormData.__type);

    // Node.js 版本应该有 getHeaders() 方法
    var hasGetHeaders2 = typeof nodeFormData.getHeaders === 'function';
    console.log("  有 getHeaders() 方法: " + hasGetHeaders2);

    if (!hasGetHeaders2) {
        console.error("❌ 错误: Node.js FormData 应该有 getHeaders() 方法");
        testResults.push({ name: '测试2', success: false });
    } else {
        // 测试 getHeaders()
        var headers = nodeFormData.getHeaders();
        console.log("  headers: " + JSON.stringify(headers));
        
        // 检查 Content-Type
        if (headers['content-type'] && headers['content-type'].includes('multipart/form-data')) {
            console.log("✅ getHeaders() 返回正确的 Content-Type");
        } else {
            console.error("❌ Content-Type 格式错误");
        }

        // 测试 getBoundary()
        if (typeof nodeFormData.getBoundary === 'function') {
            var boundary = nodeFormData.getBoundary();
            console.log("  boundary: " + boundary);
            console.log("✅ getBoundary() 正常工作");
        } else {
            console.error("❌ 缺少 getBoundary() 方法");
        }

        // 测试 getLengthSync()
        if (typeof nodeFormData.getLengthSync === 'function') {
            var length = nodeFormData.getLengthSync();
            console.log("  length (sync): " + length + " bytes");
            console.log("✅ getLengthSync() 正常工作");
        } else {
            console.error("❌ 缺少 getLengthSync() 方法");
        }

        console.log("✅ Node.js FormData 验证通过\n");
        testResults.push({ name: '测试2', success: true });
    }
} catch (error) {
    console.error("❌ Node.js FormData 测试失败: " + error.message);
    console.error("   Stack: " + error.stack);
    testResults.push({ name: '测试2', success: false, error: error.message });
}

// ==================== 测试 3: Node.js FormData 添加 Buffer ====================
console.log("📦 测试 3: Node.js FormData 添加 Buffer 作为文件");
try {
    var FormData3 = require('form-data');
    var form3 = new FormData3();

    // 创建 Buffer
    var fileContent = Buffer.from('Hello, this is file content!', 'utf8');
    form3.append('file', fileContent, 'test.txt');
    form3.append('description', 'Test file upload');

    console.log("✓ 成功添加 Buffer 作为文件");
    
    var headers3 = form3.getHeaders();
    console.log("  Content-Type: " + headers3['content-type']);
    
    var length3 = form3.getLengthSync();
    console.log("  Total size: " + length3 + " bytes");
    
    console.log("✅ Buffer 文件上传测试通过\n");
    testResults.push({ name: '测试3', success: true });
} catch (error) {
    console.error("❌ Buffer 文件测试失败: " + error.message);
    testResults.push({ name: '测试3', success: false, error: error.message });
}

// ==================== 测试 4: 浏览器 FormData + fetch ====================
console.log("📦 测试 4: 浏览器 FormData 与 fetch 集成");

var test4Promise = (function() {
    var formData4 = new FormData();
    formData4.append('browser_field', 'browser_value');
    formData4.append('timestamp', Date.now().toString());

    console.log("  发送请求到: " + testUrl);
    
    return fetch(testUrl, {
        method: 'POST',
        body: formData4
    })
    .then(function(response) {
        if (!response.ok) {
            console.error("❌ 请求失败: " + response.status + " " + response.statusText);
            testResults.push({ name: '测试4', success: false });
            return null;
        }
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        console.log("  响应状态: 200");
        console.log("  接收到的字段: " + Object.keys(data.form || {}).join(', '));
        
        if (data.form && data.form.browser_field === 'browser_value') {
            console.log("✅ 浏览器 FormData + fetch 测试通过\n");
            testResults.push({ name: '测试4', success: true });
        } else {
            console.error("❌ 服务器未正确接收数据");
            testResults.push({ name: '测试4', success: false });
        }
    })
    .catch(function(error) {
        console.error("❌ 浏览器 FormData fetch 测试失败: " + error.message);
        testResults.push({ name: '测试4', success: false, error: error.message });
    });
})();

// ==================== 测试 5: Node.js FormData + fetch (手动 headers) ====================
console.log("📦 测试 5: Node.js FormData 与 fetch 集成（手动 headers）");

var test5Promise = test4Promise.then(function() {
    var FormData5 = require('form-data');
    var form5 = new FormData5();
    
    form5.append('nodejs_field', 'nodejs_value');
    form5.append('server', 'go-executor');
    form5.append('timestamp', Date.now().toString());

    console.log("  发送请求到: " + testUrl);

    // 方式1: 手动设置 headers
    var headers5 = form5.getHeaders();
    headers5['User-Agent'] = 'Go-Executor-Test';

    return fetch(testUrl, {
        method: 'POST',
        headers: headers5,
        body: form5
    })
    .then(function(response) {
        if (!response.ok) {
            console.error("❌ 请求失败: " + response.status + " " + response.statusText);
            testResults.push({ name: '测试5', success: false });
            return null;
        }
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        console.log("  响应状态: 200");
        console.log("  接收到的字段: " + Object.keys(data.form || {}).join(', '));

        if (data.form && data.form.nodejs_field === 'nodejs_value') {
            console.log("✅ Node.js FormData + fetch 测试通过（手动 headers）\n");
            testResults.push({ name: '测试5', success: true });
        } else {
            console.error("❌ 服务器未正确接收数据");
            testResults.push({ name: '测试5', success: false });
        }
    })
    .catch(function(error) {
        console.error("❌ Node.js FormData fetch 测试失败: " + error.message);
        console.error("   Stack: " + error.stack);
        testResults.push({ name: '测试5', success: false, error: error.message });
    });
});

// ==================== 测试 6: Node.js FormData 自动 headers ====================
console.log("📦 测试 6: Node.js FormData 自动设置 Content-Type");

var test6Promise = test5Promise.then(function() {
    var FormData6 = require('form-data');
    var form6 = new FormData6();
    
    form6.append('auto_field', 'auto_value');

    console.log("  发送请求（不手动设置 headers）");

    // 方式2: 不手动设置 headers，让 fetch 自动处理
    return fetch(testUrl, {
        method: 'POST',
        body: form6
    })
    .then(function(response) {
        if (!response.ok) {
            console.error("❌ 请求失败: " + response.status + " " + response.statusText);
            testResults.push({ name: '测试6', success: false });
            return null;
        }
        return response.json();
    })
    .then(function(data) {
        if (!data) return;
        
        console.log("  响应状态: 200");
        console.log("  Content-Type: " + data.headers['Content-Type']);

        if (data.form && data.form.auto_field === 'auto_value') {
            console.log("✅ Node.js FormData 自动 headers 测试通过\n");
            testResults.push({ name: '测试6', success: true });
        } else {
            console.error("❌ 自动 headers 未正常工作");
            testResults.push({ name: '测试6', success: false });
        }
    })
    .catch(function(error) {
        console.error("❌ 自动 headers 测试失败: " + error.message);
        testResults.push({ name: '测试6', success: false, error: error.message });
    });
});

// ==================== 测试 7: getBuffer() 方法 ====================
console.log("📦 测试 7: Node.js FormData getBuffer() 方法");
try {
    var FormData7 = require('form-data');
    var form7 = new FormData7();

    form7.append('field1', 'value1');
    form7.append('field2', 'value2');

    if (typeof form7.getBuffer === 'function') {
        var buffer7 = form7.getBuffer();
        console.log("  getBuffer() 返回类型: " + buffer7.constructor.name);
        console.log("  Buffer 长度: " + buffer7.length + " bytes");
        
        // 验证 Buffer 内容包含字段名
        var content7 = buffer7.toString('utf8');
        if (content7.includes('field1') && content7.includes('field2')) {
            console.log("✅ getBuffer() 测试通过\n");
            testResults.push({ name: '测试7', success: true });
        } else {
            console.error("❌ Buffer 内容不正确");
            testResults.push({ name: '测试7', success: false });
        }
    } else {
        console.error("❌ 缺少 getBuffer() 方法");
        testResults.push({ name: '测试7', success: false });
    }
} catch (error) {
    console.error("❌ getBuffer() 测试失败: " + error.message);
    testResults.push({ name: '测试7', success: false, error: error.message });
}

// ==================== 测试 8: 边界自定义 ====================
console.log("📦 测试 8: 自定义边界 (setBoundary)");
try {
    var FormData8 = require('form-data');
    var form8 = new FormData8();

    var customBoundary = '----CustomBoundary12345';
    form8.setBoundary(customBoundary);
    form8.append('test', 'value');

    var boundary8 = form8.getBoundary();
    console.log("  设置的边界: " + customBoundary);
    console.log("  读取的边界: " + boundary8);

    if (boundary8 === customBoundary) {
        var headers8 = form8.getHeaders();
        if (headers8['content-type'].includes(customBoundary)) {
            console.log("✅ 自定义边界测试通过\n");
            testResults.push({ name: '测试8', success: true });
        } else {
            console.error("❌ headers 中的边界不匹配");
            testResults.push({ name: '测试8', success: false });
        }
    } else {
        console.error("❌ 边界设置失败");
        testResults.push({ name: '测试8', success: false });
    }
} catch (error) {
    console.error("❌ 自定义边界测试失败: " + error.message);
    testResults.push({ name: '测试8', success: false, error: error.message });
}

// ==================== 总结 ====================
return test6Promise.then(function() {
    console.log("\n" + "=".repeat(60));
    console.log("测试完成！");
    console.log("=".repeat(60));
    
    var passedCount = 0;
    var failedCount = 0;
    
    for (var i = 0; i < testResults.length; i++) {
        if (testResults[i].success) {
            passedCount++;
        } else {
            failedCount++;
        }
    }
    
    console.log("总计: " + testResults.length + " 个测试");
    console.log("通过: " + passedCount);
    console.log("失败: " + failedCount);
    
    if (failedCount === 0) {
        console.log("\n✅ 所有测试通过!");
    } else {
        console.log("\n❌ 有 " + failedCount + " 个测试失败");
    }
    
    return {
        success: failedCount === 0,
        total: testResults.length,
        passed: passedCount,
        failed: failedCount,
        results: testResults
    };
});
