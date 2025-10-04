/**
 * 测试 goja 对 async/await 的支持情况
 * 
 * 目的：验证 goja 引擎是否真的不支持 async/await
 */

console.log('========================================');
console.log('🧪 测试 1: async/await 基础语法');
console.log('========================================\n');

// 测试 1: async 函数声明
try {
    eval(`
        async function testAsync() {
            return 'hello';
        }
        console.log('✅ async 函数声明: 支持');
        console.log('   返回值类型:', typeof testAsync());
    `);
} catch (e) {
    console.log('❌ async 函数声明: 不支持');
    console.log('   错误:', e.message);
}

console.log('\n========================================');
console.log('🧪 测试 2: await 关键字');
console.log('========================================\n');

// 测试 2: await 关键字
try {
    eval(`
        async function testAwait() {
            const result = await Promise.resolve(42);
            return result;
        }
        console.log('✅ await 关键字: 支持');
        
        // 尝试执行
        testAwait().then(result => {
            console.log('   执行结果:', result);
        });
    `);
} catch (e) {
    console.log('❌ await 关键字: 不支持');
    console.log('   错误:', e.message);
}

console.log('\n========================================');
console.log('🧪 测试 3: Promise 支持（已知支持）');
console.log('========================================\n');

// 测试 3: Promise（作为对比）
try {
    const p = new Promise((resolve) => {
        setTimeout(() => {
            resolve('Promise works!');
        }, 100);
    });
    
    console.log('✅ Promise: 支持');
    console.log('   返回值类型:', typeof p);
    
    p.then(result => {
        console.log('   执行结果:', result);
    });
} catch (e) {
    console.log('❌ Promise: 不支持（不应该出现）');
    console.log('   错误:', e.message);
}

console.log('\n========================================');
console.log('📊 测试总结');
console.log('========================================\n');

return new Promise((resolve) => {
    setTimeout(() => {
        console.log('💡 结论:');
        console.log('   - 如果 async/await 测试通过，说明 goja 已支持');
        console.log('   - 如果 async/await 测试失败，说明需要使用 Promise');
        console.log('   - Promise 应该始终可用（eventloop 提供支持）');
        resolve({ success: true });
    }, 200);
});





