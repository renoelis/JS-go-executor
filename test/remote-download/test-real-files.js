/**
 * 测试真实的远程文件
 * 验证是否存在 100KB 限制
 */

const axios = require('axios');
const FormData = require('form-data');

console.log('========================================');
console.log('真实文件下载测试');
console.log('========================================\n');

async function testRealFile(name, url, expectedSize) {
    console.log(`\n测试: ${name}`);
    console.log('─'.repeat(60));
    console.log(`URL: ${url}`);
    console.log(`预期大小: ${expectedSize}`);
    
    try {
        const startTime = Date.now();
        
        // 下载文件
        const response = await axios.get(url, {
            responseType: 'stream',
            timeout: 60000,  // 60秒超时
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        console.log(`\n响应状态: ${response.status}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);
        console.log(`Content-Length: ${response.headers['content-length']}`);
        
        // 消费 stream
        let receivedBytes = 0;
        let chunkCount = 0;
        const chunkSizes = [];
        
        response.data.on('data', function(chunk) {
            receivedBytes += chunk.length;
            chunkCount++;
            chunkSizes.push(chunk.length);
            
            // 打印前5个 chunk
            if (chunkCount <= 5) {
                console.log(`  chunk ${chunkCount}: ${chunk.length} bytes (总计: ${receivedBytes})`);
            }
            
            // 每接收 500KB 报告一次
            if (receivedBytes % (500 * 1024) < chunk.length && chunkCount > 5) {
                console.log(`  进度: ${(receivedBytes / 1024 / 1024).toFixed(2)} MB...`);
            }
        });
        
        await new Promise(function(resolve, reject) {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });
        
        const duration = Date.now() - startTime;
        
        // 结果分析
        console.log(`\n下载完成:`);
        console.log(`  实际接收: ${receivedBytes} bytes (${(receivedBytes / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`  耗时: ${duration}ms`);
        console.log(`  分块数: ${chunkCount}`);
        
        if (chunkSizes.length > 0) {
            const avgChunkSize = receivedBytes / chunkCount;
            const minChunk = Math.min(...chunkSizes);
            const maxChunk = Math.max(...chunkSizes);
            console.log(`  块大小: min=${minChunk}, max=${maxChunk}, avg=${avgChunkSize.toFixed(0)}`);
        }
        
        // 完整性检查
        const contentLength = parseInt(response.headers['content-length'] || '0');
        const isComplete = contentLength > 0 && receivedBytes === contentLength;
        const percentage = contentLength > 0 ? (receivedBytes / contentLength * 100).toFixed(1) : 'N/A';
        
        console.log(`\n完整性:`);
        console.log(`  Content-Length: ${contentLength} bytes`);
        console.log(`  完整度: ${percentage}%`);
        
        if (isComplete) {
            console.log(`  ✅ 完整下载`);
        } else if (receivedBytes === 102400) {
            console.log(`  ❌ 遇到 100KB 限制`);
        } else {
            console.log(`  ⚠️  不完整，但不是 100KB 限制`);
        }
        
        // 测试 FormData 集成
        console.log(`\n测试 FormData 集成...`);
        
        const response2 = await axios.get(url, {
            responseType: 'stream',
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        const form = new FormData();
        form.append('file', response2.data, {
            filename: name.replace(/\s+/g, '-') + '.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        form.append('test_field', 'test_value');
        
        console.log(`  ✅ FormData 创建成功`);
        
        return {
            success: true,
            name: name,
            url: url,
            receivedBytes: receivedBytes,
            expectedBytes: contentLength,
            complete: isComplete,
            isHundredKBLimit: receivedBytes === 102400,
            duration: duration,
            chunkCount: chunkCount
        };
        
    } catch (error) {
        console.log(`\n❌ 错误: ${error.message}`);
        if (error.code) {
            console.log(`  错误代码: ${error.code}`);
        }
        return {
            success: false,
            name: name,
            error: error.message
        };
    }
}

async function main() {
    console.log('测试真实的远程文件（华为云 OBS）\n');
    
    const tests = [
        {
            name: '287KB Excel文件',
            url: 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/cf235930-f657-4b2f-b59c-468dd993adc1.xlsx',
            expectedSize: '287KB'
        },
        {
            name: '2.1MB Excel文件',
            url: 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/39646295-ad37-4be9-b55d-f242c636b7a3.xlsx',
            expectedSize: '2.1MB'
        }
    ];
    
    const results = [];
    
    for (const test of tests) {
        const result = await testRealFile(test.name, test.url, test.expectedSize);
        results.push(result);
        
        // 等待 2 秒再进行下一个测试
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 总结
    console.log('\n========================================');
    console.log('测试总结');
    console.log('========================================\n');
    
    const successResults = results.filter(r => r.success);
    const completeResults = successResults.filter(r => r.complete);
    const hundredKBLimit = successResults.filter(r => r.isHundredKBLimit);
    
    console.log(`总测试数: ${results.length}`);
    console.log(`成功: ${successResults.length}`);
    console.log(`完整下载: ${completeResults.length}`);
    console.log(`遇到100KB限制: ${hundredKBLimit.length}\n`);
    
    // 详细结果
    results.forEach(function(result) {
        if (result.success) {
            const sizeMB = (result.receivedBytes / 1024 / 1024).toFixed(2);
            const status = result.complete ? '✅ 完整' : 
                          result.isHundredKBLimit ? '❌ 100KB限制' : '⚠️ 不完整';
            console.log(`${result.name}:`);
            console.log(`  状态: ${status}`);
            console.log(`  大小: ${sizeMB} MB`);
            console.log(`  耗时: ${result.duration}ms`);
            console.log(`  分块: ${result.chunkCount}个\n`);
        } else {
            console.log(`${result.name}:`);
            console.log(`  状态: ❌ 失败`);
            console.log(`  错误: ${result.error}\n`);
        }
    });
    
    // 关键结论
    console.log('========================================');
    console.log('关键结论');
    console.log('========================================\n');
    
    if (completeResults.length === successResults.length && successResults.length > 0) {
        console.log('🎉 所有真实文件都完整下载！\n');
        console.log('结论:');
        console.log('1. ✅ 100KB 限制只存在于 httpbin 测试端点');
        console.log('2. ✅ 真实文件下载完全正常');
        console.log('3. ✅ 流式处理工作完美');
        console.log('4. ✅ 可以安全提高文件大小限制\n');
        console.log('建议:');
        console.log('- 提高限制到 15-20MB');
        console.log('- 部署并监控内存使用');
        console.log('- 对于更大的文件，考虑 URL 传递方案');
        
    } else if (hundredKBLimit.length > 0) {
        console.log('⚠️  真实文件也遇到 100KB 限制\n');
        console.log('结论:');
        console.log('1. ❌ 限制来自 goja 或 axios 实现');
        console.log('2. ⚠️  虽然限制存在，但仍是流式处理');
        console.log('3. ✅ 不会缓存整个文件到内存\n');
        console.log('建议:');
        console.log('- 保持当前 8-12MB 限制');
        console.log('- 实现 URL 传递方案（后端Go直接处理）');
        console.log('- 或使用分片上传');
        
    } else {
        console.log('📊 测试结果混合\n');
        console.log('请查看上面的详细结果进行分析');
    }
    
    return results;
}

return main();
