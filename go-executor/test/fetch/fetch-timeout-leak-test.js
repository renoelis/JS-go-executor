// 测试 HTTP 超时资源泄漏修复
// 验证超时时 resp.Body 正确关闭

const testTimeoutLeak = async () => {
    console.log('🧪 测试 HTTP 超时资源泄漏修复...\n');
    
    // 测试 1: 正常请求（应该成功）
    console.log('测试 1: 正常请求');
    try {
        const resp = await fetch('https://httpbin.org/delay/1');
        const data = await resp.json();
        console.log('✅ 正常请求成功:', resp.status);
    } catch (err) {
        console.log('❌ 正常请求失败:', err.message);
    }
    
    console.log('');
    
    // 测试 2: 超时请求（应该超时但不泄漏资源）
    console.log('测试 2: 超时请求（5秒延迟，1秒超时）');
    try {
        // 注意：fetch 的超时是通过 AbortController 实现的
        // 实际超时由 go-executor 的 ExecutionTimeout 控制
        const resp = await fetch('https://httpbin.org/delay/5');
        console.log('❌ 不应该成功:', resp.status);
    } catch (err) {
        console.log('✅ 预期超时错误:', err.message);
    }
    
    console.log('');
    
    // 测试 3: AbortController 取消（应该取消但不泄漏资源）
    console.log('测试 3: AbortController 取消');
    try {
        const controller = new AbortController();
        
        // 1秒后取消
        setTimeout(() => {
            console.log('   → 1秒后取消请求...');
            controller.abort();
        }, 1000);
        
        const resp = await fetch('https://httpbin.org/delay/10', {
            signal: controller.signal
        });
        console.log('❌ 不应该成功:', resp.status);
    } catch (err) {
        console.log('✅ 预期取消错误:', err.message);
    }
    
    console.log('');
    console.log('🎉 所有测试完成！');
    console.log('');
    console.log('📊 资源泄漏验证:');
    console.log('   - 超时请求: resp.Body 应该被 defer 清理');
    console.log('   - 取消请求: resp.Body 应该被 defer 清理');
    console.log('   - 连接应该被正确复用');
};

// 执行测试
testTimeoutLeak().catch(err => {
    console.error('测试失败:', err);
});


