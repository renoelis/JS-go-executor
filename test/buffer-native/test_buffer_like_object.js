/**
 * 测试类 Buffer 对象调用
 */

const { Buffer } = require('buffer');

try {
  // 测试 1: 类 Buffer 对象调用 readInt16BE
  const notBuffer = { length: 2, 0: 0x12, 1: 0x34 };
  const result1 = Buffer.prototype.readInt16BE.call(notBuffer, 0);

  // 测试 2: 真正的 Buffer 调用
  const realBuffer = Buffer.from([0x12, 0x34]);
  const result2 = realBuffer.readInt16BE(0);

  const testResults = {
    success: true,
    test1_类Buffer对象: result1,
    test1_expected: 0x1234,
    test1_match: result1 === 0x1234,
    test2_真Buffer: result2,
    test2_expected: 0x1234,
    test2_match: result2 === 0x1234
  };

  console.log(JSON.stringify(testResults, null, 2));
  return testResults;

} catch (error) {
  const testResults = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(testResults, null, 2));
  return testResults;
}
