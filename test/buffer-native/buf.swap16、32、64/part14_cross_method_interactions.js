// buf.swap16/swap32/swap64 - Part 14: Cross-Method Interactions (Round 11)
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

// ==================== swap 与 Buffer.concat 交互 ====================

test('swap16 + Buffer.concat', () => {
  const b1 = Buffer.from([0x01, 0x02]);
  const b2 = Buffer.from([0x03, 0x04]);

  b1.swap16();
  const result = Buffer.concat([b1, b2]);

  if (result[0] !== 0x02 || result[1] !== 0x01 || result[2] !== 0x03 || result[3] !== 0x04) {
    throw new Error('concat after swap failed');
  }
});

test('swap32 + Buffer.concat 多个buffer', () => {
  const b1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const b2 = Buffer.from([0x05, 0x06, 0x07, 0x08]);
  const b3 = Buffer.from([0x09, 0x0A, 0x0B, 0x0C]);

  b2.swap32();

  const result = Buffer.concat([b1, b2, b3]);

  // b2 被 swap，其他不变
  if (result[4] !== 0x08 || result[7] !== 0x05) {
    throw new Error('Multiple concat with swap failed');
  }
});

test('swap64 + Buffer.concat 总长度', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.alloc(8);
    buf.fill(i);
    buf.swap64();
    buffers.push(buf);
  }

  const result = Buffer.concat(buffers);

  if (result.length !== 80) {
    throw new Error('Total length incorrect');
  }
});

// ==================== swap 与 copyWithin 交互 ====================

test('swap16 + copyWithin', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);

  buf.swap16();
  // swap后: [0x02, 0x01, 0x04, 0x03, 0x06, 0x05]

  buf.copyWithin(2, 0, 2);
  // 复制索引0-1到索引2: [0x02, 0x01, 0x02, 0x01, 0x06, 0x05]

  if (buf[2] !== 0x02 || buf[3] !== 0x01) {
    throw new Error('copyWithin after swap failed');
  }
});

test('swap32 + copyWithin 重叠区域', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  buf.swap32();
  buf.copyWithin(4, 0, 4);

  if (buf[4] !== buf[0] || buf[7] !== buf[3]) {
    throw new Error('Overlapping copyWithin failed');
  }
});

// ==================== swap 与深拷贝独立性 ====================

test('swap16 - Buffer.from 深拷贝独立', () => {
  const orig = Buffer.from([0x12, 0x34]);
  orig.swap16();

  const copy = Buffer.from(orig);
  orig.swap16(); // 再次 swap 恢复

  // copy 应该保持 swap 后的值
  if (copy[0] !== 0x34 || orig[0] !== 0x12) {
    throw new Error('Deep copy not independent');
  }
});

test('swap32 - slice 后深拷贝', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const sliced = buf.slice(0, 4);

  sliced.swap32();
  const copy = Buffer.from(sliced);

  sliced.swap32(); // 恢复

  if (copy[0] === sliced[0]) {
    throw new Error('Sliced deep copy not independent');
  }
});

// ==================== swap 与 write/read 系列方法 ====================

test('swap32 - 两个16位值写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0xABCD, 0); // 写入: CD AB
  buf.writeUInt16LE(0x1234, 2);  // 写入: 34 12
  // buffer: [CD, AB, 34, 12]

  buf.swap32();
  // swap32 反转: [12, 34, AB, CD]

  if (buf[0] !== 0x12 || buf[3] !== 0xCD) {
    throw new Error('Two 16-bit values swap32 failed');
  }
});

test('swap64 - BigInt write/read 组合', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);

  const valLE = buf.readBigInt64LE(0);
  buf.swap64();
  const valBE = buf.readBigInt64BE(0);

  if (valLE !== valBE) {
    throw new Error('BigInt LE/BE after swap64 mismatch');
  }
});

test('swap16 - 多次 write 覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1111, 0);
  buf.writeUInt16LE(0x2222, 0); // 覆盖
  buf.writeUInt16LE(0x3333, 2);

  buf.swap16();

  if (buf.readUInt16LE(0) !== 0x2222) {
    throw new Error('Multiple writes + swap failed');
  }
});

// ==================== swap 与迭代器方法 ====================

test('swap32 + entries() 迭代器', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const entries = Array.from(buf.entries());

  if (entries[0][1] !== 0x04 || entries[3][1] !== 0x01) {
    throw new Error('entries() after swap failed');
  }
});

test('swap16 + values() 迭代器', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
  buf.swap16();

  const values = Array.from(buf.values());

  if (values[0] !== 0xBB || values[1] !== 0xAA) {
    throw new Error('values() after swap failed');
  }
});

test('swap64 + keys() 迭代器', () => {
  const buf = Buffer.alloc(8);
  buf.swap64();

  const keys = Array.from(buf.keys());

  // keys 应该不受 swap 影响
  if (keys.length !== 8 || keys[0] !== 0 || keys[7] !== 7) {
    throw new Error('keys() affected by swap');
  }
});

// ==================== swap 与 lastIndexOf ====================

test('swap16 + lastIndexOf 位置变化', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x01, 0x02]);

  const idx1 = buf.lastIndexOf(0x01);
  buf.swap16();
  const idx2 = buf.lastIndexOf(0x01);

  // swap16 后字节位置改变
  if (idx1 === idx2) {
    throw new Error('lastIndexOf should change after swap');
  }
});

test('swap32 + lastIndexOf byteOffset', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const idx = buf.lastIndexOf(0x01, 6);

  if (idx < 0) {
    throw new Error('lastIndexOf with offset failed');
  }
});

// ==================== swap 与编码转换 ====================

test('swap16 - ASCII 编码影响', () => {
  const buf = Buffer.from('AB', 'ascii'); // 0x41 0x42
  buf.swap16();

  const str = buf.toString('ascii');

  if (str !== 'BA') {
    throw new Error('ASCII encoding affected by swap16');
  }
});

test('swap32 - latin1 编码长度不变', () => {
  const buf = Buffer.from([0xC0, 0xC1, 0xC2, 0xC3]);
  const len1 = buf.toString('latin1').length;

  buf.swap32();
  const len2 = buf.toString('latin1').length;

  if (len1 !== len2) {
    throw new Error('latin1 length changed');
  }
});

test('swap16 - hex 往返测试', () => {
  const orig = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const hex1 = orig.toString('hex');

  orig.swap16();
  const hex2 = orig.toString('hex');

  const restored = Buffer.from(hex2, 'hex');
  restored.swap16();

  if (restored.toString('hex') !== hex1) {
    throw new Error('hex roundtrip failed');
  }
});

// ==================== swap 与 Buffer.compare ====================

test('swap16 改变 compare 结果', () => {
  const b1 = Buffer.from([0x01, 0x02]);
  const b2 = Buffer.from([0x02, 0x01]);

  const cmp1 = Buffer.compare(b1, b2);
  b1.swap16();
  const cmp2 = Buffer.compare(b1, b2);

  // swap 后两者应该相等
  if (cmp2 !== 0) {
    throw new Error('compare should be 0 after swap');
  }
});

test('swap32 + compare 字典序', () => {
  const b1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const b2 = Buffer.from([0x04, 0x03, 0x02, 0x01]);

  b1.swap32();

  if (!b1.equals(b2)) {
    throw new Error('Swapped buffers should be equal');
  }
});

// ==================== swap 连续组合 ====================

test('连续 swap16 -> swap32 -> swap64', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const orig = Buffer.from(buf);

  buf.swap16();
  buf.swap32();
  buf.swap64();

  // 验证最终结果与原始不同
  if (buf.equals(orig)) {
    throw new Error('Sequential swaps should change buffer');
  }

  // 验证特定位置
  if (buf[0] !== 0x06 || buf[7] !== 0x03) {
    throw new Error('Sequential swap result incorrect');
  }
});

test('swap32 -> swap16 -> 恢复测试', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const orig = Buffer.from(buf);

  buf.swap32();
  buf.swap16();

  // swap32 -> swap16 不会恢复原值
  if (buf.equals(orig)) {
    throw new Error('swap32->swap16 should not restore');
  }
});

// ==================== swap 与 DataView ====================

test('swap64 影响 DataView', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);

  const before = dv.getBigUint64(0, true); // littleEndian
  buf.swap64();
  const after = dv.getBigUint64(0, true);

  if (before === after) {
    throw new Error('DataView should reflect swap');
  }
});

test('swap32 + DataView getUint32', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);

  buf.swap32();
  const val = dv.getUint32(0, false); // bigEndian

  if (val !== 0x78563412) {
    throw new Error('DataView read after swap incorrect');
  }
});

// ==================== swap 与 ArrayBuffer 多视图 ====================

test('同一 ArrayBuffer 多个 Buffer 视图', () => {
  const ab = new ArrayBuffer(8);
  const view1 = Buffer.from(ab, 0, 4);
  const view2 = Buffer.from(ab, 4, 4);

  view1.set([0x01, 0x02, 0x03, 0x04]);
  view2.set([0x05, 0x06, 0x07, 0x08]);

  view1.swap32();

  // view2 不应该受影响
  if (view2[0] !== 0x05) {
    throw new Error('Other view should not be affected');
  }
});

test('swap16 + ArrayBuffer offset buffer', () => {
  const underlying = new Uint8Array([0, 0, 0x01, 0x02, 0x03, 0x04, 0, 0]);
  const buf = Buffer.from(underlying.buffer, 2, 4);

  buf.swap32();

  // 验证底层 ArrayBuffer 被修改
  if (underlying[2] !== 0x04 || underlying[5] !== 0x01) {
    throw new Error('Underlying ArrayBuffer not modified');
  }
});

// ==================== swap 与 TypedArray.set() ====================

test('swap32 后使用 set() 方法', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  const newData = new Uint8Array([0xFF, 0xFE]);
  buf.set(newData, 0);

  if (buf[0] !== 0xFF || buf[1] !== 0xFE) {
    throw new Error('set() after swap failed');
  }
});

test('swap64 + set 部分覆盖', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  buf.set([0xAA, 0xBB], 3);

  if (buf[3] !== 0xAA || buf[4] !== 0xBB) {
    throw new Error('Partial set after swap failed');
  }
});

// ==================== swap 与 write() 返回值 ====================

test('swap16 后 write() 返回写入字节数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('ABCD', 0, 'utf8');

  buf.swap16();
  const str = buf.toString('utf8', 0, written);

  // swap16 会改变 UTF-8 字符
  if (str === 'ABCD') {
    throw new Error('swap16 should affect UTF-8');
  }
});

test('swap32 + write 指定 encoding', () => {
  const buf = Buffer.alloc(8);
  buf.write('12345678', 0, 'hex');

  buf.swap32();

  const hex = buf.toString('hex');
  if (hex === '12345678') {
    throw new Error('hex write + swap should change');
  }
});

// ==================== swap 后立即 fill ====================

test('swap32 后 fill 部分区域', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  buf.fill(0xAA, 0, 2);

  if (buf[0] !== 0xAA || buf[1] !== 0xAA || buf[2] !== 0x02) {
    throw new Error('fill after swap failed');
  }
});

test('swap16 + fill 全部', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  buf.fill(0xFF);

  if (!buf.equals(Buffer.alloc(4, 0xFF))) {
    throw new Error('fill all after swap failed');
  }
});

// ==================== swap 与 Buffer.isBuffer ====================

test('swap 后仍然是 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02]);
  buf.swap16();

  if (!Buffer.isBuffer(buf)) {
    throw new Error('Should still be Buffer after swap');
  }
});

test('TypedArray swap 后仍然是 TypedArray', () => {
  const ta = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
  Buffer.prototype.swap32.call(ta);

  if (!(ta instanceof Uint8Array)) {
    throw new Error('Should still be TypedArray');
  }
});

// ==================== swap 与 buffer.buffer 属性 ====================

test('swap 不改变 buffer.buffer 引用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const ab = buf.buffer;

  buf.swap32();

  if (buf.buffer !== ab) {
    throw new Error('buffer.buffer reference changed');
  }
});

test('buffer.buffer.byteLength vs buffer.length', () => {
  const parent = Buffer.alloc(100);
  const child = parent.subarray(10, 20);

  child.swap16();

  if (child.buffer.byteLength !== 100 || child.length !== 10) {
    throw new Error('buffer lengths incorrect');
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
