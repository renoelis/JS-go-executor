/**
 * 测试远程文件下载的内存占用
 * 验证 axios stream 是否真正流式处理
 */

console.log('========================================');
console.log('远程文件下载内存测试');
console.log('========================================\n');

const axios = require('axios');
const FormData = require('form-data');

// 测试 URL（使用 httpbin 的 stream-bytes 端点）
const testSizes = [
    { size: 1024 * 1024, name: '1MB' },           // 1MB
    { size: 5 * 1024 * 1024, name: '5MB' },       // 5MB
    { size: 10 * 1024 * 1024, name: '10MB' },     // 10MB
];

// 获取内存使用（MB）
function getMemoryMB() {
    // 在 goja 环境中可能没有 process.memoryUsage
    // 返回一个占位符
    if (typeof process !== 'undefined' && process.memoryUsage) {
        return (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    }
    return 'N/A';
}

// 测试函数
async function testDownload(size, name) {
    console.log(`\n测试: ${name} 文件下载`);
    console.log('─'.repeat(40));
    
    try {
        // 使用 httpbin 的 stream-bytes 端点
        const url = `https://httpbin.org/stream-bytes/${size}`;
        
        console.log(`1. 下载前内存: ${getMemoryMB()} MB`);
        console.log(`2. 开始下载: ${url}`);
        
        const startTime = Date.now();
        
        // 下载文件（使用 stream）
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 30000
        });
        
        const downloadTime = Date.now() - startTime;
        console.log(`3. 下载完成: ${downloadTime}ms`);
        console.log(`4. 下载后内存: ${getMemoryMB()} MB`);
        
        // 检查响应类型
        console.log(`5. 响应类型: ${typeof response.data}`);
        console.log(`6. 是否有 'on' 方法: ${typeof response.data.on === 'function'}`);
        console.log(`7. 是否有 'pipe' 方法: ${typeof response.data.pipe === 'function'}`);
        
        // 尝试添加到 FormData
        console.log(`\n8. 测试 FormData...`);
        const form = new FormData();
        
        try {
            form.append('file', response.data, {
                filename: `test-${name}.bin`,
                contentType: 'application/octet-stream'
            });
            console.log(`   ✅ FormData.append 成功`);
            console.log(`   内存: ${getMemoryMB()} MB`);
        } catch (e) {
            console.log(`   ❌ FormData.append 失败: ${e.message}`);
        }
        
        // 如果是真正的 stream，尝试消费它
        if (typeof response.data.on === 'function') {
            console.log(`\n9. 消费 Stream...`);
            
            let receivedBytes = 0;
            let chunkCount = 0;
            
            response.data.on('data', function(chunk) {
                receivedBytes += chunk.length;
                chunkCount++;
                
                // 每 1MB 报告一次
                if (receivedBytes % (1024 * 1024) === 0) {
                    console.log(`   已接收: ${receivedBytes / 1024 / 1024} MB, 内存: ${getMemoryMB()} MB`);
                }
            });
            
            await new Promise(function(resolve, reject) {
                response.data.on('end', resolve);
                response.data.on('error', reject);
            });
            
            console.log(`   ✅ Stream 消费完成`);
            console.log(`   总接收: ${receivedBytes} bytes (${chunkCount} chunks)`);
            console.log(`   最终内存: ${getMemoryMB()} MB`);
        } else {
            console.log(`\n9. ⚠️  不是真正的 Stream 对象`);
            console.log(`   可能会导致完全缓存到内存`);
        }
        
        return {
            success: true,
            size: name,
            downloadTime: downloadTime
        };
        
    } catch (error) {
        console.log(`❌ 测试失败: ${error.message}`);
        return {
            success: false,
            size: name,
            error: error.message
        };
    }
}

// 主测试流程
async function runTests() {
    console.log('测试环境信息:');
    console.log(`- Node.js 版本: ${typeof process !== 'undefined' ? process.version : 'N/A'}`);
    console.log(`- axios 版本: ${axios.VERSION || 'unknown'}`);
    console.log(`- 初始内存: ${getMemoryMB()} MB\n`);
    
    const results = [];
    
    // 逐个测试（避免并发）
    for (const test of testSizes) {
        const result = await testDownload(test.size, test.name);
        results.push(result);
        
        // 等待一下，让 GC 运行
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 汇总结果
    console.log('\n========================================');
    console.log('测试结果汇总');
    console.log('========================================\n');
    
    results.forEach(function(result) {
        if (result.success) {
            console.log(`✅ ${result.size}: 成功 (${result.downloadTime}ms)`);
        } else {
            console.log(`❌ ${result.size}: 失败 - ${result.error}`);
        }
    });
    
    console.log('\n关键结论:');
    console.log('─'.repeat(40));
    
    const allSuccess = results.every(r => r.success);
    
    if (allSuccess) {
        console.log('✅ 所有测试通过');
        console.log('\n下一步:');
        console.log('1. 检查上面的内存增长情况');
        console.log('2. 如果内存增长 < 文件大小: 流式处理生效 ✅');
        console.log('3. 如果内存增长 ≈ 文件大小: 完全缓存 ❌');
        console.log('4. 根据结果决定是否提高文件大小限制');
    } else {
        console.log('⚠️  部分测试失败');
        console.log('\n可能原因:');
        console.log('1. 网络连接问题');
        console.log('2. httpbin.org 不可访问');
        console.log('3. axios stream 模式不支持');
    }
    
    return {
        summary: {
            total: results.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        },
        results: results
    };
}

// 执行测试
runTests()
    .then(function(finalResult) {
        console.log('\n========================================');
        console.log('测试完成');
        console.log('========================================');
        return finalResult;
    })
    .catch(function(error) {
        console.log('\n❌ 测试执行失败:', error.message);
        console.log(error.stack);
        return {
            error: error.message
        };
    });
