/**
 * 验证快速路径是否被执行
 */

const { Buffer } = require('buffer');

try {
  // 测试 1: 基本的 readDoubleBE
  const buf1 = Buffer.allocUnsafe(16);

  // 写入一个已知的值
  buf1.writeDoubleBE(3.141592653589793, 0);

  // 读取
  const val1 = buf1.readDoubleBE(0);

  // 测试 2: readInt16BE
  const buf2 = Buffer.allocUnsafe(8);
  buf2.writeInt16BE(32767, 0);
  const val2 = buf2.readInt16BE(0);

  // 测试 3: 视图场景 - Buffer.from(arrayBuffer, offset)
  const ab = new ArrayBuffer(32);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 32; i++) {
    view[i] = i;
  }

  const buf3 = Buffer.from(ab, 8, 16);  // byteOffset=8, length=16
  const val3 = buf3[0];  // 应该是 8
  const val4 = buf3.readUInt8(0);  // 应该也是 8

  const result = {
    success: true,
    test1_writeDoubleBE: 3.141592653589793,
    test1_readDoubleBE: val1,
    test1_match: Math.abs(val1 - 3.141592653589793) < 0.0000001,
    test2_writeInt16BE: 32767,
    test2_readInt16BE: val2,
    test2_match: val2 === 32767,
    test3_bufferFromAB_byte0: val3,
    test3_readUInt8: val4,
    test3_match: val3 === 8 && val4 === 8
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
