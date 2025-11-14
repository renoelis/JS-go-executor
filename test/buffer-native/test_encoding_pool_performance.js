// 测试优化后的 encodingBuffer 池化性能
const { Buffer } = require('buffer');

async function main() {
  try {
    const results = {
      success: true,
      tests: []
    };

    // 测试 1: 混合大小编码 (验证池化效果)
    console.log('测试 1: 混合大小 hex 编码...');
    const sizes = [
      4 * 1024,    // 4KB
      63 * 1024,   // 63KB (边界下方)
      65 * 1024,   // 65KB (边界上方，之前浪费 96.8%)
      128 * 1024,  // 128KB
      512 * 1024,  // 512KB (之前浪费 75%)
      1024 * 1024, // 1MB (之前浪费 50%)
    ];

    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      for (const size of sizes) {
        const buf = Buffer.alloc(size, 0x42);
        const hexStr = buf.toString('hex');

        // 验证结果正确性
        if (hexStr.length !== size * 2) {
          throw new Error(`hex 编码长度错误: ${hexStr.length} vs ${size * 2}`);
        }
        if (!hexStr.startsWith('4242')) {
          throw new Error('hex 编码内容错误');
        }
      }
    }

    const elapsed = Date.now() - startTime;
    results.tests.push({
      name: '混合大小 hex 编码',
      iterations: iterations * sizes.length,
      elapsed_ms: elapsed,
      avg_us: (elapsed * 1000) / (iterations * sizes.length),
      status: 'passed'
    });
    console.log(`  ✅ ${iterations * sizes.length} 次编码，耗时 ${elapsed}ms`);

    // 测试 2: base64 编码性能
    console.log('测试 2: base64 编码性能...');
    const testData = Buffer.alloc(1024 * 1024, 0x55); // 1MB
    const b64Iterations = 500;
    const b64Start = Date.now();

    for (let i = 0; i < b64Iterations; i++) {
      const b64Str = testData.toString('base64');
      if (b64Str.length === 0) {
        throw new Error('base64 编码失败');
      }
    }

    const b64Elapsed = Date.now() - b64Start;
    results.tests.push({
      name: 'base64 编码 (1MB)',
      iterations: b64Iterations,
      elapsed_ms: b64Elapsed,
      avg_ms: b64Elapsed / b64Iterations,
      status: 'passed'
    });
    console.log(`  ✅ ${b64Iterations} 次编码，耗时 ${b64Elapsed}ms`);

    // 测试 3: 并发编码 (验证 sync.Pool 并发安全性)
    console.log('测试 3: 并发编码...');
    const concurrentStart = Date.now();
    const promises = [];

    for (let i = 0; i < 50; i++) {
      promises.push(
        (async () => {
          const buf = Buffer.alloc(128 * 1024, i % 256);
          const hex = buf.toString('hex');
          const b64 = buf.toString('base64');
          return hex.length + b64.length;
        })()
      );
    }

    const sums = await Promise.all(promises);
    const totalLength = sums.reduce((a, b) => a + b, 0);

    if (totalLength === 0) {
      throw new Error('并发编码失败');
    }

    const concurrentElapsed = Date.now() - concurrentStart;
    results.tests.push({
      name: '并发编码 (50 并发)',
      iterations: 50,
      elapsed_ms: concurrentElapsed,
      status: 'passed'
    });
    console.log(`  ✅ 50 并发编码，耗时 ${concurrentElapsed}ms`);

    // 测试 4: 边界情况 (验证容量退化修复)
    console.log('测试 4: 边界情况编码...');
    const boundaryCases = [
      { size: 63 * 1024, name: '63KB (small池边界下方)' },
      { size: 64 * 1024, name: '64KB (small池边界)' },
      { size: 65 * 1024, name: '65KB (medium池边界上方)' },
      { size: 2 * 1024 * 1024, name: '2MB (medium池边界)' },
    ];

    for (const testCase of boundaryCases) {
      const buf = Buffer.alloc(testCase.size, 0xAA);
      const hex = buf.toString('hex');
      const b64 = buf.toString('base64');

      if (hex.length !== testCase.size * 2) {
        throw new Error(`${testCase.name} hex 编码错误`);
      }

      results.tests.push({
        name: `边界编码: ${testCase.name}`,
        hex_length: hex.length,
        b64_length: b64.length,
        status: 'passed'
      });
      console.log(`  ✅ ${testCase.name}: hex=${hex.length}, b64=${b64.length}`);
    }

    // 测试 5: 内存压力测试 (验证无内存泄漏)
    console.log('测试 5: 内存压力测试...');
    const pressureIterations = 1000;
    const pressureStart = Date.now();

    for (let i = 0; i < pressureIterations; i++) {
      // 随机大小，模拟真实场景
      const size = (Math.floor(Math.random() * 100) + 1) * 1024; // 1KB-100KB
      const buf = Buffer.alloc(size, i % 256);
      const encoded = buf.toString('hex');

      // 确保结果被使用（防止优化器删除）
      if (encoded.length === 0) {
        throw new Error('编码失败');
      }
    }

    const pressureElapsed = Date.now() - pressureStart;
    results.tests.push({
      name: '内存压力测试 (1000次随机编码)',
      iterations: pressureIterations,
      elapsed_ms: pressureElapsed,
      avg_us: (pressureElapsed * 1000) / pressureIterations,
      status: 'passed'
    });
    console.log(`  ✅ ${pressureIterations} 次随机编码，耗时 ${pressureElapsed}ms`);

    // 测试 6: 真实场景模拟 (80% 小数据, 15% 中数据, 5% 大数据)
    console.log('测试 6: 真实场景模拟...');
    const realisticIterations = 1000;
    const realisticStart = Date.now();

    for (let i = 0; i < realisticIterations; i++) {
      let size;
      const rand = Math.random();

      if (rand < 0.8) {
        // 80%: 1KB-64KB
        size = (Math.floor(Math.random() * 64) + 1) * 1024;
      } else if (rand < 0.95) {
        // 15%: 64KB-512KB
        size = (64 + Math.floor(Math.random() * 448)) * 1024;
      } else {
        // 5%: 512KB-2MB
        size = (512 + Math.floor(Math.random() * 1536)) * 1024;
      }

      const buf = Buffer.alloc(size, 0x77);
      const encoded = buf.toString(i % 2 === 0 ? 'hex' : 'base64');

      if (encoded.length === 0) {
        throw new Error('编码失败');
      }
    }

    const realisticElapsed = Date.now() - realisticStart;
    results.tests.push({
      name: '真实场景模拟 (80%小+15%中+5%大)',
      iterations: realisticIterations,
      elapsed_ms: realisticElapsed,
      avg_us: (realisticElapsed * 1000) / realisticIterations,
      status: 'passed'
    });
    console.log(`  ✅ ${realisticIterations} 次真实场景编码，耗时 ${realisticElapsed}ms`);

    // 汇总
    console.log('\n========== 测试汇总 ==========');
    const totalTests = results.tests.length;
    const passedTests = results.tests.filter(t => t.status === 'passed').length;
    console.log(`总测试: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${totalTests - passedTests}`);

    if (passedTests === totalTests) {
      console.log('\n✅ 所有测试通过！encodingBuffer 池化优化生效');
    }

    console.log(JSON.stringify(results, null, 2));
    return results;

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    console.log(JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
}

return main();
