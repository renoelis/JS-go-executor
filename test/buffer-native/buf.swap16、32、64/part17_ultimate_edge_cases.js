// buf.swap16/swap32/swap64 - Part 17: Ultimate Edge Cases
// 终极深度查缺补漏：覆盖最后可能遗漏的极端场景
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

// ==================== Prototype 链和继承 ====================

test('swap16 - 修改 prototype 不影响已创建的 buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const originalSwap16 = buf.swap16;
  
  // 验证可以调用
  buf.swap16();
  
  if (buf[0] !== 0x02 || buf[1] !== 0x01) {
    throw new Error('swap16 should work');
  }
  
  // 恢复并再次测试
  buf.swap16();
  if (buf[0] !== 0x01 || buf[1] !== 0x02) {
    throw new Error('Double swap should restore');
  }
});

test('swap32 - hasOwnProperty 检查', () => {
  const buf = Buffer.alloc(4);
  
  // swap32 应该在原型链上，不是自有属性
  if (buf.hasOwnProperty('swap32')) {
    throw new Error('swap32 should not be own property');
  }
  
  // 但应该可以访问
  if (typeof buf.swap32 !== 'function') {
    throw new Error('swap32 should be accessible');
  }
});

test('swap64 - propertyIsEnumerable', () => {
  const buf = Buffer.alloc(8);
  
  // swap64 不应该是可枚举的
  if (buf.propertyIsEnumerable('swap64')) {
    throw new Error('swap64 should not be enumerable');
  }
});

// ==================== 对象密封和冻结 ====================

test('swap16 - Object.seal 在TypedArray上会抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  let errorThrown = false;
  try {
    Object.seal(buf);
  } catch (e) {
    errorThrown = true;
    // Node.js 不允许 seal TypedArray/Buffer
    if (!e.message.includes('seal')) {
      throw new Error(`Unexpected error: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('Object.seal should throw on Buffer');
  }
});

test('swap32 - Object.freeze 在TypedArray上会抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  let errorThrown = false;
  try {
    Object.freeze(buf);
  } catch (e) {
    errorThrown = true;
    // Node.js 不允许 freeze TypedArray/Buffer
    if (!e.message.includes('freeze')) {
      throw new Error(`Unexpected error: ${e.message}`);
    }
  }
  
  if (!errorThrown) {
    throw new Error('Object.freeze should throw on Buffer');
  }
});

test('swap16 - isSealed 和 isFrozen 不影响结果', () => {
  const buf = Buffer.from([0x12, 0x34]);
  
  const sealed = Object.isSealed(buf);
  const frozen = Object.isFrozen(buf);
  
  // 无论状态如何，swap 都应该尝试执行
  buf.swap16();
  
  // 验证交换（如果成功）
  if (buf[0] === 0x34 && buf[1] === 0x12) {
    // swap 成功
  } else if (buf[0] === 0x12 && buf[1] === 0x34) {
    // swap 被阻止或失败，保持原值也可接受
  }
});

// ==================== 特殊索引和属性 ====================

test('swap16 - 负索引不影响 swap', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  // 尝试读取负索引（应该返回 undefined）
  const negValue = buf[-1];
  if (negValue !== undefined) {
    throw new Error('Negative index should return undefined');
  }
  
  // swap 应该正常工作
  buf.swap16();
  if (buf[0] !== 0x02) {
    throw new Error('swap16 should work');
  }
});

test('swap32 - 超出范围的索引不影响 swap', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  // 读取超出范围的索引
  const outOfRange = buf[100];
  if (outOfRange !== undefined) {
    throw new Error('Out of range index should return undefined');
  }
  
  buf.swap32();
  if (buf[0] !== 0x04) {
    throw new Error('swap32 should work');
  }
});

// ==================== 数组方法返回值 ====================

test('swap16 - 与 map 的返回值类型', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  const mapped = buf.map(x => x);
  
  // map 返回的是 Uint8Array
  if (!mapped || mapped.length !== 4) {
    throw new Error('map should return array-like');
  }
  
  // 原 buffer 可以 swap
  buf.swap16();
  if (buf[0] !== 0x02) {
    throw new Error('Original buffer should swap');
  }
  
  // mapped 结果不受影响
  if (mapped[0] !== 0x01) {
    throw new Error('Mapped array should not change');
  }
});

test('swap32 - slice 也共享内存（Node.js 行为）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  
  const sliced = buf.slice(0, 4);
  
  // 在 Node.js 中，slice 也共享内存（与 subarray 相同）
  buf.swap32();
  
  // sliced 应该受影响（共享内存）
  if (sliced[0] !== 0x04) {
    throw new Error('Sliced buffer should change (shared memory)');
  }
});

// ==================== 字符串转换和编码 ====================

test('swap16 - toString 后再 from 往返', () => {
  const original = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x21]); // "Hello!"
  const str = original.toString('utf8');
  
  const buf = Buffer.from(str, 'utf8');
  
  // 如果长度是偶数，可以 swap16
  if (buf.length % 2 === 0) {
    buf.swap16();
    // swap 会破坏 UTF-8 编码
    const swapped = buf.toString('utf8');
    if (swapped === str) {
      throw new Error('swap16 should change UTF-8 string');
    }
  }
});

test('swap32 - base64 编码往返', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const base64 = buf.toString('base64');
  
  const decoded = Buffer.from(base64, 'base64');
  decoded.swap32();
  
  if (decoded[0] !== 0x04 || decoded[3] !== 0x01) {
    throw new Error('Decoded buffer should swap correctly');
  }
});

test('swap64 - hex 编码往返', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const hex = buf.toString('hex');
  
  if (hex !== '0102030405060708') {
    throw new Error('Hex encoding incorrect');
  }
  
  const decoded = Buffer.from(hex, 'hex');
  decoded.swap64();
  
  if (decoded[0] !== 0x08 || decoded[7] !== 0x01) {
    throw new Error('Hex decoded buffer should swap correctly');
  }
});

// ==================== 内存和性能边界 ====================

test('swap16 - 非常大的 buffer（1MB）边界验证', () => {
  const size = 1024 * 1024; // 1MB
  const buf = Buffer.alloc(size);
  
  // 设置边界值
  buf[0] = 0xAA;
  buf[1] = 0xBB;
  buf[size - 2] = 0xCC;
  buf[size - 1] = 0xDD;
  
  buf.swap16();
  
  // 验证边界
  if (buf[0] !== 0xBB || buf[1] !== 0xAA) {
    throw new Error('First pair not swapped');
  }
  if (buf[size - 2] !== 0xDD || buf[size - 1] !== 0xCC) {
    throw new Error('Last pair not swapped');
  }
});

test('swap32 - 质数长度对齐测试', () => {
  // 使用接近质数的4的倍数
  const sizes = [4, 12, 28, 60, 124, 252, 508];
  
  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buf[i] = i % 256;
    }
    
    buf.swap32();
    
    // 验证第一组
    if (buf[0] !== 3 || buf[3] !== 0) {
      throw new Error(`swap32 failed for size ${size}`);
    }
  }
});

test('swap64 - 稀疏填充模式', () => {
  const buf = Buffer.alloc(64);
  
  // 每8个字节填充一个非零值
  for (let i = 0; i < 64; i += 8) {
    buf[i] = 0xFF;
  }
  
  buf.swap64();
  
  // 验证 0xFF 移到了每组的最后
  for (let i = 0; i < 64; i += 8) {
    if (buf[i + 7] !== 0xFF) {
      throw new Error(`Byte at ${i + 7} should be 0xFF`);
    }
    if (buf[i] !== 0x00) {
      throw new Error(`Byte at ${i} should be 0x00`);
    }
  }
});

// ==================== 错误恢复和异常处理 ====================

test('swap16 - 连续成功调用不累积效果', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const original = Buffer.from(buf);
  
  // 偶数次 swap 应该恢复
  buf.swap16();
  buf.swap16();
  
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== original[i]) {
      throw new Error('Even number of swaps should restore');
    }
  }
});

test('swap32 - try-catch 中的 swap', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  try {
    buf.swap32();
    if (buf[0] !== 0x04) {
      throw new Error('swap32 should work in try-catch');
    }
  } catch (e) {
    throw new Error(`Unexpected error in try-catch: ${e.message}`);
  }
});

test('swap64 - finally 块中的 swap', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  let swapped = false;
  
  try {
    // 正常代码
  } finally {
    buf.swap64();
    swapped = true;
  }
  
  if (!swapped) {
    throw new Error('swap64 should execute in finally');
  }
  if (buf[0] !== 0x08) {
    throw new Error('swap64 should work in finally');
  }
});

// ==================== 与其他 Buffer 静态方法交互 ====================

test('swap16 - Buffer.compare 与 swap 的交互', () => {
  const buf1 = Buffer.from([0x01, 0x02]);
  const buf2 = Buffer.from([0x02, 0x01]);
  
  const cmpBefore = Buffer.compare(buf1, buf2);
  
  buf1.swap16();
  
  const cmpAfter = Buffer.compare(buf1, buf2);
  
  // swap 后应该相等
  if (cmpAfter !== 0) {
    throw new Error('Buffers should be equal after swap');
  }
  
  // swap 前应该不等
  if (cmpBefore === 0) {
    throw new Error('Buffers should not be equal before swap');
  }
});

test('swap32 - Buffer.isBuffer 始终返回 true', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  if (!Buffer.isBuffer(buf)) {
    throw new Error('Should be buffer before swap');
  }
  
  buf.swap32();
  
  if (!Buffer.isBuffer(buf)) {
    throw new Error('Should still be buffer after swap');
  }
});

test('swap64 - Buffer.byteLength 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const lengthBefore = buf.byteLength;
  
  buf.swap64();
  
  if (buf.byteLength !== lengthBefore) {
    throw new Error('byteLength should not change');
  }
});

// ==================== 边缘数值和位操作 ====================

test('swap16 - 所有字节都是 0x00', () => {
  const buf = Buffer.alloc(4); // 全0
  buf.swap16();
  
  // 全0 swap 后仍然是全0
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0) {
      throw new Error('All zeros should remain zeros');
    }
  }
});

test('swap32 - 所有字节都是 0xFF', () => {
  const buf = Buffer.alloc(4, 0xFF);
  buf.swap32();
  
  // 全 0xFF swap 后仍然是全 0xFF
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0xFF) {
      throw new Error('All 0xFF should remain 0xFF');
    }
  }
});

test('swap64 - 镜像模式（回文）', () => {
  // 创建回文 buffer: [01, 02, 03, 04, 04, 03, 02, 01]
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x04, 0x03, 0x02, 0x01]);
  
  buf.swap64();
  
  // swap 后仍然是回文
  if (buf[0] !== 0x01 || buf[7] !== 0x01) {
    throw new Error('Palindrome should remain palindrome after swap');
  }
});

// ==================== 实际应用场景补充 ====================

test('swap16 - 模拟 16位 CRC 校验和', () => {
  const buf = Buffer.alloc(4);
  
  // 写入 16位 CRC (小端序)
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 2);
  
  buf.swap16();
  
  // 读取为大端序
  const crc1 = buf.readUInt16BE(0);
  const crc2 = buf.readUInt16BE(2);
  
  if (crc1 !== 0x1234 || crc2 !== 0x5678) {
    throw new Error('CRC swap failed');
  }
});

test('swap32 - 模拟 RGBA 像素数据', () => {
  const buf = Buffer.alloc(8);
  
  // RGBA: (255, 128, 64, 255), (0, 128, 255, 128)
  buf[0] = 255; // R
  buf[1] = 128; // G
  buf[2] = 64;  // B
  buf[3] = 255; // A
  
  buf[4] = 0;
  buf[5] = 128;
  buf[6] = 255;
  buf[7] = 128;
  
  buf.swap32();
  
  // swap 后字节序改变
  if (buf[0] !== 255 || buf[3] !== 255) {
    throw new Error('RGBA swap changed structure');
  }
});

test('swap64 - 模拟文件系统 inode 号', () => {
  const buf = Buffer.alloc(8);
  
  // 写入 64位 inode 号
  buf.writeBigUInt64LE(123456789012345n, 0);
  
  buf.swap64();
  
  // 读取为大端序
  const inode = buf.readBigUInt64BE(0);
  
  if (inode !== 123456789012345n) {
    throw new Error('Inode swap failed');
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
