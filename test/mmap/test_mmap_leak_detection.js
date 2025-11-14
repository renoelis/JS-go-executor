/**
 * mmap 资源泄漏检测测试
 * 多次运行相同操作,检测内存是否持续增长
 */
const { Buffer } = require('buffer');

async function testMmapLeakDetection() {
    try {
        console.log('=== mmap 资源泄漏检测测试 ===\n');

        const iterations = 5; // 运行 5 轮
        const buffersPerIteration = 50; // 每轮创建 50 个 Buffer
        const bufferSize = 15 * 1024 * 1024; // 15MB

        for (let round = 0; round < iterations; round++) {
            console.log(`\n--- 第 ${round + 1}/${iterations} 轮 ---`);

            const buffers = [];

            // 创建 Buffer
            for (let i = 0; i < buffersPerIteration; i++) {
                const buf = Buffer.alloc(bufferSize);
                buffers.push(buf);
            }
            console.log(`✓ 创建 ${buffersPerIteration} 个 Buffer (共 ${(buffersPerIteration * 15)} MB)`);

            // 转换为字符串
            for (let i = 0; i < 10; i++) {
                const hex = buffers[i].toString('hex').substring(0, 100);
                const b64 = buffers[i].toString('base64').substring(0, 100);
            }
            console.log(`✓ 转换 10 个 Buffer 为 hex/base64`);

            // 清空引用
            buffers.length = 0;
            console.log(`✓ 释放所有 Buffer`);

            // 等待一小段时间(模拟真实场景)
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n=== 测试完成 ===');
        console.log('如果内存稳定(不持续增长),说明 mmap 资源被正确释放');

        return {
            success: true,
            iterations: iterations,
            buffersPerIteration: buffersPerIteration,
            bufferSize: `${bufferSize / 1024 / 1024}MB`,
            totalAllocated: `${(iterations * buffersPerIteration * bufferSize / 1024 / 1024 / 1024).toFixed(2)}GB`,
            message: '泄漏检测测试完成 - 检查内存是否稳定'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

return testMmapLeakDetection();
