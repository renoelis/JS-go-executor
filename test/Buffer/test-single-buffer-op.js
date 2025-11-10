/**
 * 测试单个 Buffer 操作
 * 找出哪个方法导致问题
 */

console.log('=== 测试单个 Buffer 操作 ===\n');

// 简化的辅助函数
function testBufferOp(buffer, method, value, offset) {
    console.log('测试:', method, 'value:', value, 'offset:', offset);
    
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                console.log('  执行 buffer.' + method + '(' + value + ', ' + offset + ')');
                buffer[method](value, offset);
                console.log('  ✅ 成功');
                resolve({success: true, method: method});
            } catch (e) {
                console.log('  ❌ 失败:', e.message);
                reject(e);
            }
        }, 10);
    });
}

console.log('步骤 1: 创建 Buffer');
const buf = Buffer.alloc(20);
console.log('  Buffer 创建成功, 长度:', buf.length);

console.log('\n步骤 2: 测试 writeInt16BE');

return testBufferOp(buf, 'writeInt16BE', 12345, 0)
    .then(function(result) {
        console.log('\n步骤 3: 第一个操作完成:', result.method);
        
        // 测试第二个操作
        console.log('\n步骤 4: 测试 writeInt16LE');
        return testBufferOp(buf, 'writeInt16LE', -6789, 2);
    })
    .then(function(result) {
        console.log('\n步骤 5: 第二个操作完成:', result.method);
        
        // 测试读取
        console.log('\n步骤 6: 测试 readInt16BE');
        const value = buf.readInt16BE(0);
        console.log('  读取值:', value);
        
        return {
            success: true,
            message: '所有 Buffer 操作正常',
            value: value
        };
    })
    .catch(function(error) {
        console.log('\n=== 错误 ===');
        console.log('错误:', error.message);
        console.log('堆栈:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    });







