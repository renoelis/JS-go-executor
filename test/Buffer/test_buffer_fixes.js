const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer API 修复验证测试');
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = [];

function test(name, fn) {
  testCount++;
  const testNumber = testCount;
  try {
    console.log(`\n[测试 ${testNumber}] ${name}`);
    fn();
    passCount++;
    console.log('✓ 通过');
    testResults.push({
      number: testNumber,
      name: name,
      status: 'passed',
      error: null
    });
  } catch (e) {
    failCount++;
    console.log('✗ 失败:', e.message);
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message
    });
  }
}

// ============ P0 修复：边界检查测试 ============
console.log('\n--- P0 修复：边界检查测试 ---');

test('1.1 writeInt16BE 边界检查', () => {
  const buf = Buffer.alloc(4);
  
  // 应该成功：offset 2 + 2 bytes = 4
  buf.writeInt16BE(0x1234, 2);
  
  // 应该抛出错误：offset 3 + 2 bytes > 4
  let errorThrown = false;
  try {
    buf.writeInt16BE(0x1234, 3);
  } catch (e) {
    errorThrown = true;
    if (!e.message.includes('边界')) {
      throw new Error('错误消息不正确');
    }
  }
  
  if (!errorThrown) {
    throw new Error('应该抛出边界错误');
  }
});

test('1.2 writeInt32BE 边界检查', () => {
  const buf = Buffer.alloc(8);
  
  // 应该成功：offset 4 + 4 bytes = 8
  buf.writeInt32BE(0x12345678, 4);
  
  // 应该抛出错误：offset 5 + 4 bytes > 8
  let errorThrown = false;
  try {
    buf.writeInt32BE(0x12345678, 5);
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('应该抛出边界错误');
  }
});

test('1.3 writeDoubleBE 边界检查', () => {
  const buf = Buffer.alloc(16);
  
  // 应该成功：offset 8 + 8 bytes = 16
  buf.writeDoubleBE(Math.PI, 8);
  
  // 应该抛出错误：offset 9 + 8 bytes > 16
  let errorThrown = false;
  try {
    buf.writeDoubleBE(Math.PI, 9);
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('应该抛出边界错误');
  }
});

test('1.4 负数 offset 应该抛出错误', () => {
  const buf = Buffer.alloc(4);
  
  let errorThrown = false;
  try {
    buf.writeInt16BE(0x1234, -1);
  } catch (e) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('负数 offset 应该抛出错误');
  }
});

// ============ P1 修复：新增属性测试 ============
console.log('\n--- P1 修复：新增属性测试 ---');

test('2.1 Buffer.poolSize 属性存在', () => {
  if (typeof Buffer.poolSize === 'undefined') {
    throw new Error('Buffer.poolSize 不存在');
  }
  
  if (Buffer.poolSize !== 8192) {
    throw new Error(`Buffer.poolSize 应该是 8192，实际是 ${Buffer.poolSize}`);
  }
  
  console.log(`    Buffer.poolSize = ${Buffer.poolSize}`);
});

test('2.2 Buffer.poolSize 可以修改', () => {
  const originalPoolSize = Buffer.poolSize;
  Buffer.poolSize = 16384;
  
  if (Buffer.poolSize !== 16384) {
    throw new Error('Buffer.poolSize 修改失败');
  }
  
  // 恢复原值
  Buffer.poolSize = originalPoolSize;
  console.log(`    Buffer.poolSize 可以修改`);
});

// ============ 数值读写正确性测试 ============
console.log('\n--- 数值读写正确性测试 ---');

test('3.1 readInt8 符号扩展', () => {
  const buf = Buffer.from([0xFF, 0x7F, 0x00]);
  
  const val1 = buf.readInt8(0);
  const val2 = buf.readUInt8(0);
  const val3 = buf.readInt8(1);
  
  if (val1 !== -1) {
    throw new Error(`readInt8(0xFF) 应该是 -1，实际是 ${val1}`);
  }
  if (val2 !== 255) {
    throw new Error(`readUInt8(0xFF) 应该是 255，实际是 ${val2}`);
  }
  if (val3 !== 127) {
    throw new Error(`readInt8(0x7F) 应该是 127，实际是 ${val3}`);
  }
});

test('3.2 16位整数读写', () => {
  const buf = Buffer.alloc(4);
  
  // Big Endian
  buf.writeInt16BE(-1234, 0);
  const val1 = buf.readInt16BE(0);
  if (val1 !== -1234) {
    throw new Error(`readInt16BE 错误: ${val1} !== -1234`);
  }
  
  // Little Endian
  buf.writeInt16LE(5678, 2);
  const val2 = buf.readInt16LE(2);
  if (val2 !== 5678) {
    throw new Error(`readInt16LE 错误: ${val2} !== 5678`);
  }
});

test('3.3 32位整数读写', () => {
  const buf = Buffer.alloc(8);
  
  // Big Endian
  buf.writeInt32BE(-123456789, 0);
  const val1 = buf.readInt32BE(0);
  if (val1 !== -123456789) {
    throw new Error(`readInt32BE 错误: ${val1} !== -123456789`);
  }
  
  // Little Endian
  buf.writeUInt32LE(987654321, 4);
  const val2 = buf.readUInt32LE(4);
  if (val2 !== 987654321) {
    throw new Error(`readUInt32LE 错误: ${val2} !== 987654321`);
  }
});

test('3.4 浮点数读写', () => {
  const buf = Buffer.alloc(12);
  
  // Float
  buf.writeFloatBE(3.14, 0);
  const val1 = buf.readFloatBE(0);
  if (Math.abs(val1 - 3.14) > 0.01) {
    throw new Error(`readFloatBE 错误: ${val1} !== 3.14`);
  }
  
  // Double
  buf.writeDoubleBE(Math.PI, 4);
  const val2 = buf.readDoubleBE(4);
  if (Math.abs(val2 - Math.PI) > 0.0000001) {
    throw new Error(`readDoubleBE 错误: ${val2} !== ${Math.PI}`);
  }
});

// ============ 编码测试 ============
console.log('\n--- 编码测试 ---');

test('4.1 Latin1 编码边界情况', () => {
  // Latin1: 每个字符取低 8 位
  const buf = Buffer.from('Ā', 'latin1');  // U+0100
  
  if (buf.length !== 1) {
    throw new Error(`长度应该是 1，实际是 ${buf.length}`);
  }
  
  if (buf[0] !== 0x00) {
    throw new Error(`buf[0] 应该是 0x00 (0x100 & 0xFF)，实际是 0x${buf[0].toString(16)}`);
  }
});

test('4.2 ASCII 编码边界情况', () => {
  // ASCII: 每个字符取低 7 位
  const buf = Buffer.from('ÿ', 'ascii');  // U+00FF
  
  if (buf.length !== 1) {
    throw new Error(`长度应该是 1，实际是 ${buf.length}`);
  }
  
  if (buf[0] !== 0x7F) {
    throw new Error(`buf[0] 应该是 0x7F (0xFF & 0x7F)，实际是 0x${buf[0].toString(16)}`);
  }
});

test('4.3 UTF-16LE Surrogate Pair', () => {
  const str = '𠮷';  // U+20BB7
  const buf = Buffer.from(str, 'utf16le');
  
  if (buf.length !== 4) {
    throw new Error(`长度应该是 4，实际是 ${buf.length}`);
  }
  
  // 验证 surrogate pair: 0xD842 0xDFB7
  const high = buf.readUInt16LE(0);
  const low = buf.readUInt16LE(2);
  
  if (high < 0xD800 || high > 0xDBFF) {
    throw new Error(`high surrogate 错误: 0x${high.toString(16)}`);
  }
  
  if (low < 0xDC00 || low > 0xDFFF) {
    throw new Error(`low surrogate 错误: 0x${low.toString(16)}`);
  }
  
  // 解码回去应该相同
  const decoded = buf.toString('utf16le');
  if (decoded !== str) {
    throw new Error(`解码错误: ${decoded} !== ${str}`);
  }
});

// ============ 可变长度整数测试 ============
console.log('\n--- 可变长度整数测试 ---');

test('5.1 readIntBE/LE 可变长度', () => {
  const buf = Buffer.alloc(6);
  
  // 写入 48 位整数
  buf.writeIntBE(0x123456789ABC, 0, 6);
  const val1 = buf.readIntBE(0, 6);
  
  // 注意：JavaScript 的安全整数范围
  if (val1 !== 0x123456789ABC) {
    throw new Error(`readIntBE 错误: 0x${val1.toString(16)} !== 0x123456789ABC`);
  }
  
  // 24 位整数
  buf.writeUIntLE(0xABCDEF, 0, 3);
  const val2 = buf.readUIntLE(0, 3);
  if (val2 !== 0xABCDEF) {
    throw new Error(`readUIntLE 错误: 0x${val2.toString(16)} !== 0xABCDEF`);
  }
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个`);
console.log(`  失败: ${failCount} 个`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

// 返回测试结果
return {
  total: testCount,
  passed: passCount,
  failed: failCount,
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};
