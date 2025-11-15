// 测试 Finalizer 机制
// 目标：验证 ArrayBuffer GC 时是否正确触发 cleanup
//
// 测试策略：
// 1. 创建大 Buffer 并立即释放引用
// 2. 手动触发 GC（注意：goja 可能不支持 global.gc）
// 3. 等待一段时间让 GC 运行
// 4. 创建新的大 Buffer，观察是否成功（说明旧的已释放）

const { Buffer } = require('buffer');

function testFinalizer() {
  const results = {
    phase1: { name: '创建并释放大Buffer', success: false },
    phase2: { name: '再次创建大Buffer验证释放', success: false },
    phase3: { name: '多次创建释放循环', success: false },
  };

  try {
    // Phase 1: 创建大 Buffer 并释放引用
    (() => {
      const buf = Buffer.allocUnsafe(100 * 1024 * 1024); // 100MB
      buf[0] = 1;
      results.phase1.size = buf.length;
      results.phase1.value = buf[0];
      // buf 离开作用域，应该被 GC
    })();
    results.phase1.success = true;

    // 注意：由于 JS 中无法强制触发 GC，我们只能依赖 Go 的 GC
    // 在真实环境中，GC 会在内存压力下自动触发

    // Phase 2: 立即创建新的大 Buffer
    // 如果旧的 Buffer 没有释放，可能会导致内存不足
    const buf2 = Buffer.allocUnsafe(100 * 1024 * 1024); // 100MB
    buf2[0] = 2;
    results.phase2.size = buf2.length;
    results.phase2.value = buf2[0];
    results.phase2.success = true;

    // Phase 3: 循环创建释放，测试多次分配
    let successCount = 0;
    for (let i = 0; i < 5; i++) {
      try {
        const buf = Buffer.allocUnsafe(50 * 1024 * 1024); // 50MB
        buf[0] = i;
        successCount++;
        // 立即释放引用
      } catch (e) {
        results.phase3.error = e.message;
        break;
      }
    }
    results.phase3.successCount = successCount;
    results.phase3.success = successCount === 5;

    // 最终结论
    const allSuccess = Object.values(results).every(r => r.success);

    return {
      success: allSuccess,
      message: 'Finalizer测试完成',
      details: results,
      note: '此测试无法直接验证Finalizer是否被调用，但可以验证内存分配是否正常',
      insight: {
        关键点: 'Finalizer会在GC时异步调用',
        验证方法: '通过多次大内存分配间接验证',
        预期行为: '即使没有手动释放,后续分配仍能成功'
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      partialResults: results
    };
  }
}

const result = testFinalizer();
console.log(JSON.stringify(result, null, 2));
return result;
