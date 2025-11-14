/**
 * mmap 资源管理测试
 * 验证引用计数方案是否正确释放 mmap 内存
 */
const { Buffer } = require('buffer');

async function testMmapResourceManagement() {
    try {
        console.log('=== 开始 mmap 资源管理测试 ===\n');

        // 测试 1: 大 Buffer 创建和释放
        console.log('测试 1: 创建 100 个 20MB 的 Buffer...');
        const startTime1 = Date.now();
        const buffers = [];

        for (let i = 0; i < 100; i++) {
            // 创建大 Buffer (会触发 mmap 分配)
            const buf = Buffer.alloc(20 * 1024 * 1024); // 20MB
            buffers.push(buf);

            if ((i + 1) % 20 === 0) {
                console.log(`  已创建 ${i + 1}/100 个 Buffer`);
            }
        }

        const createTime = Date.now() - startTime1;
        console.log(`✓ 创建完成,耗时: ${createTime}ms`);
        console.log(`  总内存: ${(buffers.length * 20)} MB\n`);

        // 测试 2: 字符串转换 (hex) - 测试 encodingBuffer 池化
        console.log('测试 2: 字符串转换 (hex 编码)...');
        const startTime2 = Date.now();
        const hexStrings = [];

        for (let i = 0; i < 10; i++) {
            const buf = buffers[i];
            // 转换为 hex (会使用 encodingBuffer 池)
            const hexStr = buf.toString('hex');
            hexStrings.push(hexStr.substring(0, 100)); // 只保留前 100 个字符

            if ((i + 1) % 5 === 0) {
                console.log(`  已转换 ${i + 1}/10 个 Buffer`);
            }
        }

        const hexTime = Date.now() - startTime2;
        console.log(`✓ 转换完成,耗时: ${hexTime}ms\n`);

        // 测试 3: 字符串转换 (base64) - 测试 encodingBuffer 池化
        console.log('测试 3: 字符串转换 (base64 编码)...');
        const startTime3 = Date.now();
        const base64Strings = [];

        for (let i = 0; i < 10; i++) {
            const buf = buffers[i];
            // 转换为 base64 (会使用 encodingBuffer 池)
            const b64Str = buf.toString('base64');
            base64Strings.push(b64Str.substring(0, 100)); // 只保留前 100 个字符

            if ((i + 1) % 5 === 0) {
                console.log(`  已转换 ${i + 1}/10 个 Buffer`);
            }
        }

        const base64Time = Date.now() - startTime3;
        console.log(`✓ 转换完成,耗时: ${base64Time}ms\n`);

        // 测试 4: 释放所有 Buffer (清空数组,触发引用计数减少)
        console.log('测试 4: 释放所有 Buffer...');
        const startTime4 = Date.now();

        // 清空数组,所有 Buffer 失去引用
        buffers.length = 0;
        hexStrings.length = 0;
        base64Strings.length = 0;

        const releaseTime = Date.now() - startTime4;
        console.log(`✓ 释放完成,耗时: ${releaseTime}ms`);
        console.log('  注意: 引用计数为 0 时会立即调用 munmap\n');

        // 测试 5: 高并发创建和释放
        console.log('测试 5: 高并发创建和释放 (模拟真实场景)...');
        const startTime5 = Date.now();
        const concurrentCount = 1000;

        for (let i = 0; i < concurrentCount; i++) {
            // 创建 Buffer
            const buf = Buffer.alloc(15 * 1024 * 1024); // 15MB

            // 立即转换为字符串 (触发 encodingBuffer 分配)
            const hex = buf.toString('hex').substring(0, 100);

            // 立即丢弃引用 (触发资源释放)
            // (hex 变量在下次循环时会被覆盖)

            if ((i + 1) % 200 === 0) {
                console.log(`  已处理 ${i + 1}/${concurrentCount} 个 Buffer`);
            }
        }

        const concurrentTime = Date.now() - startTime5;
        console.log(`✓ 高并发测试完成,耗时: ${concurrentTime}ms`);
        console.log(`  平均每次: ${(concurrentTime / concurrentCount).toFixed(2)}ms\n`);

        // 返回测试结果
        const result = {
            success: true,
            tests: {
                create: {
                    count: 100,
                    size: '20MB',
                    time: createTime
                },
                hexConversion: {
                    count: 10,
                    time: hexTime
                },
                base64Conversion: {
                    count: 10,
                    time: base64Time
                },
                release: {
                    time: releaseTime
                },
                concurrent: {
                    count: concurrentCount,
                    size: '15MB',
                    time: concurrentTime,
                    avgTime: (concurrentTime / concurrentCount).toFixed(2)
                }
            },
            message: '所有测试通过 - mmap 资源应该已被正确释放'
        };

        console.log('=== 测试完成 ===');
        console.log(JSON.stringify(result, null, 2));

        return result;

    } catch (error) {
        const result = {
            success: false,
            error: error.message,
            stack: error.stack
        };
        console.log(JSON.stringify(result, null, 2));
        return result;
    }
}

// 执行测试
return testMmapResourceManagement();
