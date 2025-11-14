// 性能测试：验证预编译 Program 优化的性能提升
// 通过大量循环调用来体现编译开销的差异

const { Buffer } = require('buffer');

async function main() {
  try {
    const results = {
      success: true,
      iterations: 1000,
      tests: []
    };

    console.log('开始性能测试 - 1000 次迭代');

    // 测试1: 高频 Buffer.from（触发 getTypeofCheckFunc）
    const start1 = Date.now();
    for (let i = 0; i < 1000; i++) {
      Buffer.from([i % 256, (i + 1) % 256, (i + 2) % 256]);
    }
    const time1 = Date.now() - start1;
    console.log(`Buffer.from 1000次调用耗时: ${time1}ms`);
    results.tests.push({
      name: 'Buffer.from x1000',
      time_ms: time1
    });

    // 测试2: 高频 Buffer.byteLength（触发 getIsSymbolCheckFunc）
    const start2 = Date.now();
    for (let i = 0; i < 1000; i++) {
      Buffer.byteLength('test string ' + i);
    }
    const time2 = Date.now() - start2;
    console.log(`Buffer.byteLength 1000次调用耗时: ${time2}ms`);
    results.tests.push({
      name: 'Buffer.byteLength x1000',
      time_ms: time2
    });

    // 测试3: 混合调用
    const start3 = Date.now();
    for (let i = 0; i < 500; i++) {
      Buffer.from([i % 256]);
      Buffer.byteLength('test' + i);
    }
    const time3 = Date.now() - start3;
    console.log(`混合调用 1000次耗时: ${time3}ms`);
    results.tests.push({
      name: '混合调用 x1000',
      time_ms: time3
    });

    const totalTime = time1 + time2 + time3;
    console.log(`总耗时: ${totalTime}ms`);
    results.total_time_ms = totalTime;

    console.log('\n✅ 性能测试完成');
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
