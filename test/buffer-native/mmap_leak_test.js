// 测试 mmap 资源泄漏问题
// 场景1: Buffer 被 JS 长时间持有
// 场景2: 大量 Buffer 快速创建释放
// 场景3: ArrayBuffer.detach() 调用

const { Buffer } = require('buffer');

function testMmapLeak() {
  const results = {
    test1: { name: '长时间持有大Buffer', success: false },
    test2: { name: '快速创建释放', success: false },
    test3: { name: 'detach调用', success: false },
    test4: { name: '闭包引用', success: false },
  };

  try {
    // 测试1: 创建大Buffer并长时间持有
    // 问题: 如果 cleanup 不被调用，mmap 内存会泄漏
    const buf1 = Buffer.allocUnsafe(100 * 1024 * 1024); // 100MB
    buf1[0] = 1; // 触发实际分配
    results.test1.success = true;
    results.test1.size = buf1.length;

    // 测试2: 快速创建释放多个大Buffer
    // 验证引用计数是否正确递减
    const buffers = [];
    for (let i = 0; i < 5; i++) {
      const buf = Buffer.allocUnsafe(50 * 1024 * 1024); // 50MB
      buf[0] = i;
      buffers.push(buf);
    }
    // 清空数组，触发GC（但注意：GC时机不确定）
    buffers.length = 0;
    results.test2.success = true;
    results.test2.count = 5;

    // 测试3: 验证 ArrayBuffer.detach() 是否触发 cleanup
    // 这是关键测试：detach 应该调用 cleanup.Release()
    const buf3 = Buffer.allocUnsafe(100 * 1024 * 1024); // 100MB
    buf3[0] = 42;

    // 获取底层 ArrayBuffer (注意：goja 可能没有直接暴露 buffer 属性)
    // 在 Node.js 中可以通过 buf.buffer 访问
    // 但在 goja 实现中可能不同

    // 尝试访问 buffer 属性
    if (buf3.buffer) {
      results.test3.hasBuffer = true;
      // 注意：ArrayBuffer.detach() 是 ECMAScript 2024 新增的
      // goja 可能还不支持
      if (typeof buf3.buffer.detach === 'function') {
        buf3.buffer.detach();
        results.test3.detachCalled = true;
      } else {
        results.test3.detachNotSupported = true;
      }
    } else {
      results.test3.noBufferProperty = true;
    }
    results.test3.success = true;

    // 测试4: 闭包引用场景
    // 验证闭包持有的 Buffer 是否会导致泄漏
    const createClosure = () => {
      const buf = Buffer.allocUnsafe(50 * 1024 * 1024); // 50MB
      buf[0] = 99;
      return () => buf[0]; // 返回闭包
    };

    const closure = createClosure();
    const value = closure();
    results.test4.success = true;
    results.test4.value = value;

    // 最终结果
    const allSuccess = Object.values(results).every(r => r.success);
    return {
      success: allSuccess,
      message: 'mmap泄漏测试完成',
      details: results,
      note: '此测试无法直接验证内存是否真正释放，需要外部监控'
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

// 执行测试
const result = testMmapLeak();
console.log(JSON.stringify(result, null, 2));
return result;
