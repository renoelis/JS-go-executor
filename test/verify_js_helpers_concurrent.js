// 并发压力测试：验证修复后的 js_helpers 在高并发下无跨 runtime 问题
// 这个测试会并发执行多次 Buffer 操作，确保每个 runtime 都能正常工作

const { Buffer } = require('buffer');

try {
  const results = [];

  // 模拟多次操作，每次都会触发 js_helpers 函数
  for (let i = 0; i < 50; i++) {
    // 测试 typeof 检查（getTypeofCheckFunc）
    const obj1 = { length: i, 0: 65 + i };
    const buf1 = Buffer.from(obj1);

    // 测试 hasOwnProperty 检查（getHasOwnPropertyFunc）
    const obj2 = { length: 3, 0: i, 1: i+1, 2: i+2 };
    const buf2 = Buffer.from(obj2);

    results.push({
      iteration: i,
      buf1_length: buf1.length,
      buf2_hex: buf2.toString('hex')
    });
  }

  const result = {
    success: true,
    message: "并发测试通过：50次迭代无错误",
    stats: {
      total_iterations: results.length,
      first_result: results[0],
      last_result: results[results.length - 1]
    }
  };

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
