/**
 * 测试 Buffer 底层实现
 */

const { Buffer } = require('buffer');

try {
  const buf = Buffer.allocUnsafe(16);

  // 尝试访问底层属性
  const hasBuffer = buf.buffer !== undefined;
  const hasByteOffset = buf.byteOffset !== undefined;
  const hasLength = buf.length !== undefined;

  // 测试 buffer 属性类型
  let bufferType = 'unknown';
  if (buf.buffer) {
    bufferType = Object.prototype.toString.call(buf.buffer);
  }

  const result = {
    success: true,
    bufferProperties: {
      hasBuffer: hasBuffer,
      hasByteOffset: hasByteOffset,
      hasLength: hasLength,
      bufferType: bufferType,
      byteOffset: buf.byteOffset,
      length: buf.length
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
