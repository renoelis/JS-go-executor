const { Buffer } = require('buffer');

// 性能对比测试:BigInt 密集操作
function benchmarkBigIntOperations() {
  const iterations = 10000;
  const buf = Buffer.alloc(8);

  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    // 写入 BigInt
    buf.writeBigInt64BE(BigInt(i), 0);

    // 读取 BigInt
    const value = buf.readBigInt64BE(0);

    // asIntN 操作
    const result = BigInt.asIntN(32, value);
  }

  const duration = Date.now() - start;

  return {
    success: true,
    iterations: iterations,
    duration_ms: duration,
    ops_per_second: Math.round((iterations / duration) * 1000),
    message: `完成 ${iterations} 次 BigInt 写入/读取/asIntN 操作,耗时 ${duration}ms`
  };
}

try {
  const result = benchmarkBigIntOperations();
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
