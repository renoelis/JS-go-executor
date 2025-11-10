/**
 * 调试版本 - 找出 undefined 返回的位置
 */

console.log('=== 开始调试 ===\n');

// 测试最简单的 Promise 链
console.log('步骤 1: 创建 Promise');

return Promise.resolve()
    .then(function() {
        console.log('步骤 2: 第一个 then');
        
        // 测试 Buffer.alloc
        const buf = Buffer.alloc(10);
        console.log('  Buffer 创建成功, 长度:', buf.length);
        
        return {step: 1, bufferCreated: true};
    })
    .then(function(prev) {
        console.log('步骤 3: 第二个 then, prev:', JSON.stringify(prev));
        
        // 测试数组创建（可能的问题点）
        const testArray = [
            { method: 'writeInt16BE', value: 12345, offset: 0 }
        ];
        console.log('  数组创建成功, 长度:', testArray.length);
        
        return {step: 2, arrayCreated: true, arrayLength: testArray.length};
    })
    .then(function(prev) {
        console.log('步骤 4: 第三个 then, prev:', JSON.stringify(prev));
        
        // 测试 Promise.all（可能的问题点）
        return Promise.all([
            Promise.resolve({test: 'a'}),
            Promise.resolve({test: 'b'})
        ]);
    })
    .then(function(allResults) {
        console.log('步骤 5: Promise.all 结果:', allResults.length);
        
        // 最终返回
        return {
            success: true,
            message: '所有步骤完成',
            steps: 5
        };
    })
    .catch(function(error) {
        console.log('=== 错误捕获 ===');
        console.log('错误:', error.message);
        console.log('堆栈:', error.stack);
        
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    });







