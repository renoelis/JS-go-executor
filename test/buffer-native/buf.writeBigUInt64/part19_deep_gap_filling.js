// buf.writeBigUInt64BE/LE - 深度查缺补漏：高级场景与边界细节
// 专注于可能被遗漏的高级场景和细微边界

const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ===== 1. Object.defineProperty 劫持场景 =====

test('writeBigUInt64BE - 不受 offset 属性劫持影响', () => {
  const buf = Buffer.alloc(16);
  // 尝试劫持 offset 属性（但不应影响参数传递）
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  return buf[0] === 0x12 && buf[7] === 0xEF;
});

test('writeBigUInt64LE - 不受 offset 属性劫持影响', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  return buf[0] === 0xEF && buf[7] === 0x12;
});

// ===== 2. 字节写入的原子性（单次写入失败不应部分修改）=====

test('writeBigUInt64BE - 越界时不应部分修改 buffer', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const original = Buffer.from(buf);
  try {
    buf.writeBigUInt64BE(0x0000000000000000n, 1); // offset=1 会越界
  } catch (e) {
    // 检查 buffer 是否完全未被修改
    return buf.equals(original);
  }
  return false;
});

test('writeBigUInt64LE - 越界时不应部分修改 buffer', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const original = Buffer.from(buf);
  try {
    buf.writeBigUInt64LE(0x0000000000000000n, 1); // offset=1 会越界
  } catch (e) {
    return buf.equals(original);
  }
  return false;
});

// ===== 3. 返回值的精确性（必须是 offset + 8）=====

test('writeBigUInt64BE - 返回值精确 = offset + 8 (offset=0)', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeBigUInt64BE(123n, 0);
  return result === 8;
});

test('writeBigUInt64BE - 返回值精确 = offset + 8 (offset=5)', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeBigUInt64BE(123n, 5);
  return result === 13;
});

test('writeBigUInt64LE - 返回值精确 = offset + 8 (offset=0)', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeBigUInt64LE(123n, 0);
  return result === 8;
});

test('writeBigUInt64LE - 返回值精确 = offset + 8 (offset=7)', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeBigUInt64LE(123n, 7);
  return result === 15;
});

// ===== 4. offset 不接受非整数浮点数 =====

test('writeBigUInt64BE - offset=1.9（小数）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0x0102030405060708n, 1.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - offset=2.1（小数）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(0x0102030405060708n, 2.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - offset=3.5（小数）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0xFFn, 3.5);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - offset=0.0（整数形式浮点）应成功', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x01n, 0.0);
  return buf[7] === 0x01;
});

test('writeBigUInt64LE - offset=1.0（整数形式浮点）应成功', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x02n, 1.0);
  return buf[1] === 0x02;
});

// ===== 5. 多个 Buffer 实例的独立性 =====

test('writeBigUInt64BE - 多个 Buffer 实例不互相影响', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  
  buf1.writeBigUInt64BE(0xAAAAAAAAAAAAAAAAn, 0);
  buf2.writeBigUInt64BE(0xBBBBBBBBBBBBBBBBn, 0);
  
  return buf1[0] === 0xAA && buf2[0] === 0xBB && buf1[7] === 0xAA && buf2[7] === 0xBB;
});

test('writeBigUInt64LE - 多个 Buffer 实例不互相影响', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  
  buf1.writeBigUInt64LE(0xCCCCCCCCCCCCCCCCn, 0);
  buf2.writeBigUInt64LE(0xDDDDDDDDDDDDDDDDn, 0);
  
  return buf1[0] === 0xCC && buf2[0] === 0xDD && buf1[7] === 0xCC && buf2[7] === 0xDD;
});

// ===== 6. 链式调用场景 =====

test('writeBigUInt64BE - 可以链式调用（返回值作为下一次 offset）', () => {
  const buf = Buffer.alloc(32);
  const offset1 = buf.writeBigUInt64BE(0x1111111111111111n, 0);
  const offset2 = buf.writeBigUInt64BE(0x2222222222222222n, offset1);
  const offset3 = buf.writeBigUInt64BE(0x3333333333333333n, offset2);
  
  return offset1 === 8 && offset2 === 16 && offset3 === 24 &&
         buf[0] === 0x11 && buf[8] === 0x22 && buf[16] === 0x33;
});

test('writeBigUInt64LE - 可以链式调用', () => {
  const buf = Buffer.alloc(32);
  const offset1 = buf.writeBigUInt64LE(0x4444444444444444n, 0);
  const offset2 = buf.writeBigUInt64LE(0x5555555555555555n, offset1);
  const offset3 = buf.writeBigUInt64LE(0x6666666666666666n, offset2);
  
  return offset1 === 8 && offset2 === 16 && offset3 === 24 &&
         buf[0] === 0x44 && buf[8] === 0x55 && buf[16] === 0x66;
});

// ===== 7. 覆盖写入的完整性 =====

test('writeBigUInt64BE - 完全覆盖之前的数据', () => {
  const buf = Buffer.alloc(8, 0xFF); // 全部填充 0xFF
  buf.writeBigUInt64BE(0x0000000000000000n, 0);
  return buf.every(byte => byte === 0x00);
});

test('writeBigUInt64LE - 完全覆盖之前的数据', () => {
  const buf = Buffer.alloc(8, 0xFF);
  buf.writeBigUInt64LE(0x0000000000000000n, 0);
  return buf.every(byte => byte === 0x00);
});

test('writeBigUInt64BE - 部分覆盖不影响其他字节', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x0000000000000000n, 4);
  return buf[0] === 0xFF && buf[3] === 0xFF && 
         buf[4] === 0x00 && buf[11] === 0x00 &&
         buf[12] === 0xFF && buf[15] === 0xFF;
});

test('writeBigUInt64LE - 部分覆盖不影响其他字节', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x0000000000000000n, 4);
  return buf[0] === 0xFF && buf[3] === 0xFF && 
         buf[4] === 0x00 && buf[11] === 0x00 &&
         buf[12] === 0xFF && buf[15] === 0xFF;
});

// ===== 8. 特殊 BigInt 字面量形式 =====

test('writeBigUInt64BE - 支持十六进制 BigInt (0xFFn)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFFn, 0);
  return buf[6] === 0x00 && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 支持十六进制 BigInt (0xFFn)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFFn, 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('writeBigUInt64BE - 支持八进制 BigInt (0o777n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0o777n, 0); // 0o777 = 511
  return buf[6] === 0x01 && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 支持二进制 BigInt (0b11111111n)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0b11111111n, 0); // 255
  return buf[0] === 0xFF && buf[1] === 0x00;
});

// ===== 9. 空 Buffer（长度为 8）的边界 =====

test('writeBigUInt64BE - 恰好 8 字节 buffer, offset=0 应成功', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(byte => byte === 0xFF);
});

test('writeBigUInt64LE - 恰好 8 字节 buffer, offset=0 应成功', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(byte => byte === 0xFF);
});

test('writeBigUInt64BE - 恰好 8 字节 buffer, offset=1 应失败', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(0n, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - 恰好 8 字节 buffer, offset=1 应失败', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(0n, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ===== 10. 小于 8 字节的 Buffer =====

test('writeBigUInt64BE - 7 字节 buffer 应失败', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.writeBigUInt64BE(0n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - 7 字节 buffer 应失败', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.writeBigUInt64LE(0n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ===== 11. 使用 BigInt() 构造函数创建的值 =====

test('writeBigUInt64BE - 接受 BigInt(string)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt("12345678901234567890"), 0);
  return buf[0] === 0xAB && buf[7] === 0xD2;
});

test('writeBigUInt64LE - 接受 BigInt(number)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(255), 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

// ===== 12. offset 边界的 ±1 测试 =====

test('writeBigUInt64BE - buf.length=16, offset=8 应成功', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 8);
  return buf[8] === 0xFF && buf[15] === 0xFF;
});

test('writeBigUInt64BE - buf.length=16, offset=9 应失败', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0n, 9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - buf.length=100, offset=92 应成功', () => {
  const buf = Buffer.alloc(100);
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 92);
  return buf[92] === 0xEF && buf[99] === 0x12;
});

test('writeBigUInt64LE - buf.length=100, offset=93 应失败', () => {
  try {
    const buf = Buffer.alloc(100);
    buf.writeBigUInt64LE(0n, 93);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ===== 13. 与 readBigUInt64 的往返一致性 =====

test('writeBigUInt64BE + readBigUInt64BE 往返一致（最大值）', () => {
  const buf = Buffer.alloc(8);
  const value = 0xFFFFFFFFFFFFFFFFn;
  buf.writeBigUInt64BE(value, 0);
  return buf.readBigUInt64BE(0) === value;
});

test('writeBigUInt64LE + readBigUInt64LE 往返一致（最大值）', () => {
  const buf = Buffer.alloc(8);
  const value = 0xFFFFFFFFFFFFFFFFn;
  buf.writeBigUInt64LE(value, 0);
  return buf.readBigUInt64LE(0) === value;
});

test('writeBigUInt64BE + readBigUInt64BE 往返一致（随机值）', () => {
  const buf = Buffer.alloc(8);
  const value = 0x123456789ABCDEFn;
  buf.writeBigUInt64BE(value, 0);
  return buf.readBigUInt64BE(0) === value;
});

test('writeBigUInt64LE + readBigUInt64LE 往返一致（随机值）', () => {
  const buf = Buffer.alloc(8);
  const value = 0xFEDCBA987654321n;
  buf.writeBigUInt64LE(value, 0);
  return buf.readBigUInt64LE(0) === value;
});

// ===== 汇总结果 =====

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: {
    total: tests.length,
    passed,
    failed,
    successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
  },
  tests
};

console.log(JSON.stringify(result, null, 2));
return result;
