/**
 * mmap 极限压力测试
 * 创建大量 Buffer 并立即释放,测试引用计数机制的可靠性
 */
const { Buffer } = require('buffer');

async function testMmapStressTest() {
    try {
        console.log('=== mmap 极限压力测试 ===\n');

        const count = 2000; // 创建 2000 个 Buffer
        const bufferSize = 12 * 1024 * 1024; // 12MB

        console.log(`准备创建 ${count} 个 ${bufferSize / 1024 / 1024}MB 的 Buffer`);
        console.log(`理论总内存: ${(count * bufferSize / 1024 / 1024 / 1024).toFixed(2)}GB\n`);

        let successCount = 0;
        const startTime = Date.now();

        for (let i = 0; i < count; i++) {
            // 创建 Buffer
            const buf = Buffer.alloc(bufferSize);

            // 立即使用并转换
            const hex = buf.toString('hex').substring(0, 50);

            // 立即丢弃引用 (引用计数应立即为 0 并释放)
            // buf 和 hex 在下次循环时会被覆盖

            successCount++;

            if ((i + 1) % 500 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = (i + 1) / (elapsed / 1000);
                console.log(`  已处理 ${i + 1}/${count} 个 Buffer (速率: ${rate.toFixed(1)}/秒)`);
            }
        }

        const totalTime = Date.now() - startTime;

        console.log('\n=== 测试完成 ===');
        console.log(`✓ 成功处理 ${successCount}/${count} 个 Buffer`);
        console.log(`✓ 总耗时: ${totalTime}ms`);
        console.log(`✓ 平均速率: ${(count / (totalTime / 1000)).toFixed(1)} 个/秒`);
        console.log(`✓ 平均延迟: ${(totalTime / count).toFixed(2)}ms`);

        return {
            success: true,
            count: count,
            bufferSize: `${bufferSize / 1024 / 1024}MB`,
            totalTime: totalTime,
            rate: (count / (totalTime / 1000)).toFixed(1),
            avgLatency: (totalTime / count).toFixed(2),
            message: '压力测试完成 - 所有 Buffer 应该已被立即释放'
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

return testMmapStressTest();
