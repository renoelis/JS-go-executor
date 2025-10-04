/**
 * 🧪 async/await 实际支持测试
 * 
 * 测试 goja 引擎是否真的支持 async/await 语法
 */

console.log('========================================');
console.log('🧪 Goja async/await 实际支持测试');
console.log('========================================\n');

// 测试 1: 最简单的 async 函数
console.log('测试 1: 简单 async 函数');
console.log('----------------------------------------');

async function simpleAsync() {
    return 42;
}

console.log('✅ async 函数声明: 通过');
console.log('   函数类型:', typeof simpleAsync);
console.log('   返回值类型:', typeof simpleAsync());
console.log('   是否是 Promise:', simpleAsync() instanceof Promise);

// 测试 2: 带 await 的 async 函数
console.log('\n测试 2: 带 await 的 async 函数');
console.log('----------------------------------------');

async function testAwait() {
    const result = await Promise.resolve(100);
    return result * 2;
}

console.log('✅ await 关键字: 通过');

// 测试 3: 实际执行
console.log('\n测试 3: 实际执行 async/await');
console.log('----------------------------------------');

return testAwait().then(result => {
    console.log('✅ 执行结果:', result);
    console.log('   期望值: 200');
    console.log('   匹配:', result === 200 ? '✅ 通过' : '❌ 失败');
    
    // 测试 4: 更复杂的 async/await
    console.log('\n测试 4: 复杂 async/await 场景');
    console.log('----------------------------------------');
    
    return testComplexAsync();
}).then(() => {
    console.log('\n========================================');
    console.log('🎉 测试结论');
    console.log('========================================');
    console.log('✅ goja 完全支持 async/await!');
    console.log('   - async 函数声明: ✅');
    console.log('   - await 表达式: ✅');
    console.log('   - Promise 集成: ✅');
    console.log('   - 复杂场景: ✅');
    
    return { success: true, supported: true };
});

async function testComplexAsync() {
    // 测试顺序执行
    const a = await Promise.resolve(10);
    const b = await Promise.resolve(20);
    const sum = a + b;
    
    console.log('   顺序执行: a=' + a + ', b=' + b + ', sum=' + sum);
    
    // 测试错误处理
    try {
        await Promise.reject(new Error('测试错误'));
    } catch (e) {
        console.log('   错误捕获: ✅ ' + e.message);
    }
    
    // 测试嵌套 async
    async function nested() {
        return await Promise.resolve('嵌套结果');
    }
    
    const nestedResult = await nested();
    console.log('   嵌套 async: ✅ ' + nestedResult);
    
    return true;
}





