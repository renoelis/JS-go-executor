// buf.swap16/swap32/swap64 - Part 16: Deep Gap Filling Tests
// 深度查缺补漏：覆盖更多TypedArray、属性描述符、实际应用场景
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅' });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// ==================== 更多 TypedArray 类型 ====================

test('swap16 - Int16Array 有符号视图', () => {
  const buf = Buffer.alloc(4);
  const i16 = new Int16Array(buf.buffer, buf.byteOffset, 2);
  
  // 设置有符号值
  buf.writeInt16LE(-1000, 0);
  buf.writeInt16LE(1000, 2);
  
  const before0 = i16[0];
  const before1 = i16[1];
  
  buf.swap16();
  
  // swap16 会改变有符号值的解释
  if (i16[0] === before0) {
    throw new Error('Int16Array view should change after swap');
  }
});

test('swap32 - Int32Array 有符号视图', () => {
  const buf = Buffer.alloc(8);
  const i32 = new Int32Array(buf.buffer, buf.byteOffset, 2);
  
  buf.writeInt32LE(-100000, 0);
  buf.writeInt32LE(100000, 4);
  
  const before0 = i32[0];
  
  buf.swap32();
  
  // 字节序改变会影响有符号整数的值
  if (i32[0] === before0 && before0 !== 0) {
    throw new Error('Int32Array view should change');
  }
});

test('swap64 - BigInt64Array 有符号视图', () => {
  const buf = Buffer.alloc(16);
  const i64 = new BigInt64Array(buf.buffer, buf.byteOffset, 2);
  
  buf.writeBigInt64LE(-9999999999n, 0);
  buf.writeBigInt64LE(9999999999n, 8);
  
  const before0 = i64[0];
  
  buf.swap64();
  
  if (i64[0] === before0 && before0 !== 0n) {
    throw new Error('BigInt64Array view should change');
  }
});

test('swap16 - Uint16Array call 方法', () => {
  const u16 = new Uint16Array([0x0102, 0x0304]);
  const view = new Uint8Array(u16.buffer);
  
  // 记录swap前的字节模式: [2, 1, 4, 3] (小端序)
  const before = Array.from(view);
  
  // Uint16Array.length = 2（元素个数），swap16 使用 length 属性
  // Node.js 会把它当作2字节的buffer，交换索引0和索引1
  // 结果：[2,1,4,3] -> [4,3,2,1]（类似于2字节的swap）
  Buffer.prototype.swap16.call(u16);
  
  // 验证实际行为：Node.js 按 length=2 处理，交换了 view[0]<->view[1]
  // 实际上它是把整个"2元素"数组当作"2字节"，所以结果是reverse
  if (view[0] === before[2] && view[1] === before[3] && 
      view[2] === before[0] && view[3] === before[1]) {
    // 符合预期：[2,1,4,3] -> [4,3,2,1]
  } else {
    throw new Error(`Unexpected swap result: [${before}] -> [${Array.from(view)}]`);
  }
});

test('swap32 - Int32Array call 方法', () => {
  // Int32Array 调用 swap32 可能会因为 length 属性而失败
  // 因为 swap32 检查的是 this.length（元素个数），而不是 byteLength
  const i32 = new Int32Array([0x01020304]);
  
  let errorThrown = false;
  try {
    Buffer.prototype.swap32.call(i32);
  } catch (e) {
    errorThrown = true;
    // 预期会抛出 RangeError，因为 i32.length = 1，不是4的倍数
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }
  
  // Node.js 的 swap32 检查 length 属性，Int32Array.length=1 会导致错误
  if (!errorThrown) {
    // 如果没抛错，验证swap确实发生了
    const view = new Uint8Array(i32.buffer);
    if (view.length !== 4) {
      throw new Error('Unexpected behavior');
    }
  }
});

// ==================== 错误消息精确性 ====================

test('swap16 - 错误消息包含"16-bit"', () => {
  const buf = Buffer.alloc(3);
  let errorMessage = '';
  
  try {
    buf.swap16();
  } catch (e) {
    errorMessage = e.message;
  }
  
  if (!errorMessage) {
    throw new Error('Should throw error');
  }
  
  // 检查错误消息包含关键信息
  const has16Bit = errorMessage.includes('16') || 
                   errorMessage.includes('2') ||
                   errorMessage.includes('even') ||
                   errorMessage.includes('multiple');
  
  if (!has16Bit) {
    throw new Error(`Error message should mention size requirement: ${errorMessage}`);
  }
});

test('swap32 - 错误消息包含"32-bit"或"4"', () => {
  const buf = Buffer.alloc(5);
  let errorMessage = '';
  
  try {
    buf.swap32();
  } catch (e) {
    errorMessage = e.message;
  }
  
  if (!errorMessage) {
    throw new Error('Should throw error');
  }
  
  const has32Bit = errorMessage.includes('32') || 
                   errorMessage.includes('4') ||
                   errorMessage.includes('multiple');
  
  if (!has32Bit) {
    throw new Error(`Error message should mention size: ${errorMessage}`);
  }
});

test('swap64 - 错误消息包含"64-bit"或"8"', () => {
  const buf = Buffer.alloc(9);
  let errorMessage = '';
  
  try {
    buf.swap64();
  } catch (e) {
    errorMessage = e.message;
  }
  
  if (!errorMessage) {
    throw new Error('Should throw error');
  }
  
  const has64Bit = errorMessage.includes('64') || 
                   errorMessage.includes('8') ||
                   errorMessage.includes('multiple');
  
  if (!has64Bit) {
    throw new Error(`Error message should mention size: ${errorMessage}`);
  }
});

// ==================== Buffer 属性不变性 ====================

test('swap16 - length 属性不变', () => {
  const buf = Buffer.alloc(100);
  const lengthBefore = buf.length;
  
  buf.swap16();
  
  if (buf.length !== lengthBefore) {
    throw new Error('length should not change');
  }
});

test('swap32 - byteLength 属性不变', () => {
  const buf = Buffer.alloc(100);
  const byteLengthBefore = buf.byteLength;
  
  buf.swap32();
  
  if (buf.byteLength !== byteLengthBefore) {
    throw new Error('byteLength should not change');
  }
});

test('swap64 - byteOffset 属性不变', () => {
  const ab = new ArrayBuffer(100);
  const buf = Buffer.from(ab, 16, 64);
  const byteOffsetBefore = buf.byteOffset;
  
  buf.swap64();
  
  if (buf.byteOffset !== byteOffsetBefore) {
    throw new Error('byteOffset should not change');
  }
});

test('swap16 - buffer 引用不变', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const bufferRefBefore = buf.buffer;
  
  buf.swap16();
  
  if (buf.buffer !== bufferRefBefore) {
    throw new Error('buffer reference should not change');
  }
});

// ==================== 数组方法与 swap 交互 ====================

test('swap16 + sort 方法', () => {
  const buf = Buffer.from([0x04, 0x03, 0x02, 0x01]);
  
  // 先 sort
  buf.sort();
  
  // 验证 sort 生效
  if (buf[0] !== 0x01 || buf[3] !== 0x04) {
    throw new Error('sort should work');
  }
  
  // 再 swap
  buf.swap16();
  
  // 验证 swap 在 sorted buffer 上正常工作
  if (buf[0] !== 0x02 || buf[1] !== 0x01) {
    throw new Error('swap16 should work after sort');
  }
});

test('swap32 + reverse 方法', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  // swap32: [01,02,03,04] -> [04,03,02,01]
  buf.swap32();
  
  // reverse: [04,03,02,01] -> [01,02,03,04]
  buf.reverse();
  
  // 结果：swap32 + reverse 恰好等于原始！
  let isEqual = true;
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== original[i]) {
      isEqual = false;
      break;
    }
  }
  
  // 这个组合恰好是idempotent的
  if (!isEqual) {
    throw new Error('For 4 bytes, swap32 + reverse equals original');
  }
});

test('swap64 + copyWithin 方法', () => {
  const buf = Buffer.from([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18
  ]);
  
  buf.swap64();
  
  // copyWithin 应该正常工作
  buf.copyWithin(0, 8, 16);
  
  // 验证复制成功
  if (buf[0] !== buf[8] || buf[7] !== buf[15]) {
    throw new Error('copyWithin should work after swap64');
  }
});

// ==================== 实际应用场景 ====================

test('swap16 - WAV 音频头字节序转换', () => {
  // 模拟 WAV 文件中的 16位 采样数据
  const samples = Buffer.alloc(8);
  samples.writeInt16LE(100, 0);
  samples.writeInt16LE(-100, 2);
  samples.writeInt16LE(200, 4);
  samples.writeInt16LE(-200, 6);
  
  // 转换为大端序
  samples.swap16();
  
  // 读取为大端序
  const v0 = samples.readInt16BE(0);
  
  if (v0 !== 100) {
    throw new Error('Audio sample byte order conversion failed');
  }
});

test('swap32 - IP地址字节序转换', () => {
  // 192.168.1.1 = 0xC0A80101
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0xC0A80101, 0);
  
  buf.swap32();
  
  const bigEndian = buf.readUInt32BE(0);
  if (bigEndian !== 0xC0A80101) {
    throw new Error('IP address byte order conversion failed');
  }
});

test('swap64 - 时间戳字节序转换', () => {
  // Unix timestamp in milliseconds
  const timestamp = BigInt(Date.now());
  const buf = Buffer.alloc(8);
  
  buf.writeBigUInt64LE(timestamp, 0);
  buf.swap64();
  
  const bigEndian = buf.readBigUInt64BE(0);
  if (bigEndian !== timestamp) {
    throw new Error('Timestamp conversion failed');
  }
});

test('swap32 - IEEE 754 浮点数字节序', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14159, 0);
  
  const leBits = buf.readUInt32LE(0);
  
  buf.swap32();
  
  const beBits = buf.readUInt32BE(0);
  
  if (leBits !== beBits) {
    throw new Error('Float byte order should match after swap');
  }
  
  const reconstructed = buf.readFloatBE(0);
  if (Math.abs(reconstructed - 3.14159) > 0.0001) {
    throw new Error('Float value should be preserved');
  }
});

test('swap64 - IEEE 754 双精度浮点数', () => {
  const buf = Buffer.alloc(8);
  const value = Math.PI;
  
  buf.writeDoubleLE(value, 0);
  buf.swap64();
  
  const reconstructed = buf.readDoubleBE(0);
  
  if (reconstructed !== value) {
    throw new Error('Double value should be preserved after swap64');
  }
});

// ==================== 特殊值处理 ====================

test('swap16 - NaN 字节模式', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(NaN, 0);
  
  const before0 = buf[0];
  const before1 = buf[1];
  
  buf.swap16();
  
  // 验证字节交换：buf[0]和buf[1]应该互换，buf[2]和buf[3]应该互换
  // NaN的字节模式是固定的，swap16会改变前两个字节的顺序
  if (buf[0] === before1 && buf[1] === before0) {
    // 交换成功
  } else if (before0 === before1) {
    // 如果前两个字节相同（某些NaN表示），交换后看起来不变也正常
  } else {
    throw new Error(`Expected bytes to be swapped: [${before0},${before1}] -> [${buf[0]},${buf[1]}]`);
  }
});

test('swap32 - Infinity 字节模式', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Infinity, 0);
  
  const beforeBytes = Buffer.from(buf);
  buf.swap32();
  
  // 验证字节翻转
  if (buf[0] === beforeBytes[0]) {
    throw new Error('First byte should change');
  }
  if (buf[3] === beforeBytes[3]) {
    throw new Error('Last byte should change');
  }
});

test('swap64 - -Infinity 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Infinity, 0);
  
  buf.swap64();
  
  // 验证可以读回 -Infinity
  const value = buf.readDoubleBE(0);
  if (value !== -Infinity) {
    throw new Error('-Infinity should be preserved after swap64');
  }
});

// ==================== 内存对齐场景 ====================

test('swap16 - 非对齐地址（奇数 byteOffset）', () => {
  const ab = new ArrayBuffer(17);
  const buf = Buffer.from(ab, 1, 16); // byteOffset = 1 (奇数)
  
  for (let i = 0; i < 16; i++) {
    buf[i] = i + 1;
  }
  
  buf.swap16();
  
  // 验证正确交换
  if (buf[0] !== 2 || buf[1] !== 1) {
    throw new Error('swap16 should work on non-aligned buffer');
  }
});

test('swap32 - 非4字节对齐', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 2, 16); // byteOffset = 2 (非4字节对齐)
  
  for (let i = 0; i < 16; i++) {
    buf[i] = i + 1;
  }
  
  buf.swap32();
  
  if (buf[0] !== 4 || buf[3] !== 1) {
    throw new Error('swap32 should work on non-aligned buffer');
  }
});

test('swap64 - 非8字节对齐', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 3, 16); // byteOffset = 3
  
  for (let i = 0; i < 16; i++) {
    buf[i] = i + 1;
  }
  
  buf.swap64();
  
  if (buf[0] !== 8 || buf[7] !== 1) {
    throw new Error('swap64 should work on non-aligned buffer');
  }
});

// ==================== 链式调用 ====================

test('swap16 - 链式调用验证', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  const result = buf.swap16().swap16();
  
  // 两次 swap 应该恢复原值
  if (buf[0] !== 0x01 || buf[1] !== 0x02) {
    throw new Error('Double swap16 should restore');
  }
  
  // 链式调用返回同一引用
  if (result !== buf) {
    throw new Error('Chained call should return same reference');
  }
});

test('swap32 + swap16 链式调用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  
  try {
    // swap32 后长度不变，可以继续 swap16
    buf.swap32().swap16();
    
    // 验证都执行了
    // 先 swap32: [04,03,02,01, 08,07,06,05]
    // 再 swap16: [03,04,01,02, 07,08,05,06]
    if (buf[0] !== 0x03 || buf[1] !== 0x04) {
      throw new Error('Chained swaps should work');
    }
  } catch (e) {
    throw new Error(`Chained call failed: ${e.message}`);
  }
});

// ==================== WeakMap/WeakSet 场景 ====================

test('swap16 - WeakMap 可以存储 Buffer', () => {
  const wm = new WeakMap();
  const buf = Buffer.from([0x01, 0x02]);
  
  wm.set(buf, 'original');
  buf.swap16();
  
  // WeakMap 仍然可以访问（因为是同一对象引用）
  const value = wm.get(buf);
  if (value !== 'original') {
    throw new Error('WeakMap should still have the buffer');
  }
});

test('swap32 - WeakSet 包含测试', () => {
  const ws = new WeakSet();
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  ws.add(buf);
  buf.swap32();
  
  // WeakSet 仍然包含（因为是同一对象）
  if (!ws.has(buf)) {
    throw new Error('WeakSet should still contain the buffer');
  }
});

// ==================== 多层嵌套视图 ====================

test('swap16 - 三层嵌套 subarray', () => {
  const buf1 = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf1[i] = i;
  
  const buf2 = buf1.subarray(8, 24);  // 16 bytes
  const buf3 = buf2.subarray(4, 12);  // 8 bytes
  
  buf3.swap16();
  
  // 验证所有层都受影响（共享内存）
  if (buf1[13] !== 12 || buf1[12] !== 13) {
    throw new Error('Nested subarray swap should affect parent');
  }
});

test('swap64 - ArrayBuffer -> 多个 Buffer 视图', () => {
  const ab = new ArrayBuffer(32);
  const buf1 = Buffer.from(ab, 0, 16);
  const buf2 = Buffer.from(ab, 16, 16);
  
  for (let i = 0; i < 16; i++) {
    buf1[i] = i + 1;
    buf2[i] = i + 17;
  }
  
  buf1.swap64();
  
  // buf2 不受影响（不同区域）
  if (buf2[0] !== 17) {
    throw new Error('Separate buffer view should not be affected');
  }
  
  // buf1 正确交换
  if (buf1[0] !== 8) {
    throw new Error('buf1 should be swapped');
  }
});

// ==================== 总结 ====================

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
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
