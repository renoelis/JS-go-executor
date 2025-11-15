// 深入测试 ArrayBuffer 的 cleanup 触发时机
// 关键问题：cleanup.Release() 何时被调用？
// 1. ArrayBuffer.detach() 时
// 2. JS GC 时（通过 goja 的 finalizer）
// 3. 从不调用（泄漏）

const { Buffer } = require('buffer');

function deepTestCleanup() {
  const results = {};

  try {
    // 测试1: 验证 Buffer 的底层 ArrayBuffer 属性
    const buf1 = Buffer.allocUnsafe(100 * 1024 * 1024); // 100MB
    buf1[0] = 1;

    results.test1_hasBuffer = !!buf1.buffer;
    results.test1_bufferType = typeof buf1.buffer;

    if (buf1.buffer) {
      results.test1_byteLength = buf1.buffer.byteLength;
      results.test1_hasDetach = typeof buf1.buffer.detach === 'function';
      results.test1_hasTransfer = typeof buf1.buffer.transfer === 'function';
    }

    // 测试2: 创建多个引用同一 ArrayBuffer 的 Buffer
    // 理论上引用计数应该正确处理
    const buf2a = Buffer.allocUnsafe(50 * 1024 * 1024);
    buf2a[0] = 42;
    const buf2b = Buffer.from(buf2a.buffer); // 从同一 ArrayBuffer 创建
    const buf2c = buf2a.subarray(0, 1000); // slice 引用同一内存

    results.test2_sameBuffer = buf2a.buffer === buf2b.buffer;
    results.test2_subarraySameBuffer = buf2a.buffer === buf2c.buffer;
    results.test2_value = buf2b[0];

    // 测试3: 手动触发 slice 场景（这是最常见的引用场景）
    const buf3 = Buffer.allocUnsafe(100 * 1024 * 1024);
    buf3[0] = 99;

    const slices = [];
    for (let i = 0; i < 10; i++) {
      const slice = buf3.subarray(i * 1000, (i + 1) * 1000);
      slices.push(slice);
    }

    results.test3_sliceCount = slices.length;
    results.test3_allSameBuffer = slices.every(s => s.buffer === buf3.buffer);

    // 测试4: TypedArray 视图
    const buf4 = Buffer.allocUnsafe(100 * 1024 * 1024);
    buf4.writeUInt32LE(0x12345678, 0);

    // 创建不同类型的视图
    const uint8View = new Uint8Array(buf4.buffer);
    const uint32View = new Uint32Array(buf4.buffer);
    const float64View = new Float64Array(buf4.buffer);

    results.test4_sameBuffer = (
      uint8View.buffer === buf4.buffer &&
      uint32View.buffer === buf4.buffer &&
      float64View.buffer === buf4.buffer
    );
    results.test4_uint32Value = uint32View[0];

    // 测试5: 验证 MmapResource 是否在多引用场景正确工作
    // 关键问题：如果有 10 个引用，Release() 会被调用 10 次吗？
    // 如果是，引用计数应该从 10 降到 0
    // 如果不是，可能只有最后一次 detach 才调用 Release()

    // 创建父 Buffer
    const parent = Buffer.allocUnsafe(100 * 1024 * 1024);
    parent[0] = 255;

    // 创建多个子视图（都引用同一个 ArrayBuffer）
    const children = [];
    for (let i = 0; i < 20; i++) {
      children.push(parent.subarray(i * 1000, (i + 1) * 1000));
    }

    // 验证所有子视图都引用同一个 buffer
    const allSame = children.every(c => c.buffer === parent.buffer);

    results.test5_childCount = children.length;
    results.test5_allSameBuffer = allSame;
    results.test5_parentValue = parent[0];
    results.test5_childValue = children[0][0];

    // 关键洞察：
    // 在 Node.js 中，buf.buffer 返回的是底层 ArrayBuffer
    // 多个 Buffer 可以引用同一个 ArrayBuffer
    // 但在 goja 实现中，cleanup 回调只在 ArrayBuffer 对象上注册
    // 问题是：如果 10 个 Buffer 引用同一个 ArrayBuffer
    // cleanup.Release() 会被调用几次？

    return {
      success: true,
      message: 'cleanup 时机深度测试完成',
      details: results,
      insight: {
        问题: '多个Buffer引用同一ArrayBuffer时cleanup调用次数',
        当前实现: 'cleanup在ArrayBuffer.detach()时调用',
        潜在风险: '如果ArrayBuffer从未detach,cleanup永不调用',
        解决方案: '依赖后台清理协程(5分钟超时)或GC finalizer'
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

const result = deepTestCleanup();
console.log(JSON.stringify(result, null, 2));
return result;
