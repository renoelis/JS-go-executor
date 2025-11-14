/**
 * 测试快速路径是否工作
 */

const { Buffer } = require('buffer');

try {
  const buf = Buffer.allocUnsafe(16);

  // 写入一个测试值
  buf.writeDoubleBE(3.14159, 0);

  // 读取
  const val = buf.readDoubleBE(0);

  // 验证
  const match = Math.abs(val - 3.14159) < 0.00001;

  const result = {
    success: true,
    written: 3.14159,
    read: val,
    match: match
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
