// buf.writeBigUInt64BE/LE - 高级场景测试：严格对齐 Node.js 行为
// 聚焦于边缘情况、错误处理细节和行为一致性

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

// ===== 1. 参数数量检查 =====

test('writeBigUInt64BE - 无参数应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - 无参数应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64BE - 只有 1 个参数应成功（offset 默认 0）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xFFn);
  return result === 8 && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 只有 1 个参数应成功（offset 默认 0）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xFFn);
  return result === 8 && buf[0] === 0xFF;
});

test('writeBigUInt64BE - 3 个参数应忽略第 3 个', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x12n, 0, 999);
  return buf[7] === 0x12;
});

test('writeBigUInt64LE - 多余参数应被忽略', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x34n, 0, 'ignored', true, null);
  return buf[0] === 0x34;
});

// ===== 2. offset 的隐式类型转换边界 =====

test('writeBigUInt64BE - offset="0"（字符串）应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(0n, "0");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - offset="5"（字符串）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(0n, "5");
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64BE - offset=true 应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0n, true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - offset=false 应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(0n, false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64BE - offset=null 应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0n, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - offset=[] 应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(0n, []);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64BE - offset={} 应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0n, {});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ===== 3. value 的严格 BigInt 类型检查 =====

test('writeBigUInt64BE - value=0（number）应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(0, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - value=255（number）应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(255, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64BE - value="123n"（字符串）应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE("123n", 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - value=true 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(true, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64BE - value=null 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('writeBigUInt64LE - value=undefined 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// ===== 4. 超出 uint64 范围的 BigInt =====

test('writeBigUInt64BE - value=2^64 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(18446744073709551616n, 0); // 2^64
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - value=2^64 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(18446744073709551616n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - value=2^64+1 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(18446744073709551617n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - value=2^70 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(1180591620717411303424n, 0); // 2^70
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - value=-1n（负数）应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(-1n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - value=-100n（负数）应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(-100n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ===== 5. offset 的范围检查细节 =====

test('writeBigUInt64BE - offset=NaN 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(0n, NaN);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - offset=Infinity 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(0n, Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - offset=-Infinity 应抛错', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(0n, -Infinity);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - offset=1.1（小数）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(0n, 1.1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - offset=2.9（小数）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0n, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64LE - offset=-100（大负数）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(0n, -100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUInt64BE - offset=1000000（超大）应抛错', () => {
  try {
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64BE(0n, 1000000);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ===== 6. 别名函数的完整行为一致性 =====

test('writeBigUint64BE（小写u）- 功能与主函数完全相同', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  
  buf1.writeBigUInt64BE(0x123456789ABCDEFn, 0);
  buf2.writeBigUint64BE(0x123456789ABCDEFn, 0);
  
  return buf1.equals(buf2);
});

test('writeBigUint64LE（小写u）- 功能与主函数完全相同', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  
  buf1.writeBigUInt64LE(0xFEDCBA987654321n, 0);
  buf2.writeBigUint64LE(0xFEDCBA987654321n, 0);
  
  return buf1.equals(buf2);
});

test('writeBigUint64BE（小写u）- 错误处理与主函数相同', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUint64BE(-1n, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigUint64LE（小写u）- 越界检查与主函数相同', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUint64LE(0n, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ===== 7. 特殊边界值的精确字节验证 =====

test('writeBigUInt64BE - 0x8000000000000000n 的字节布局', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x8000000000000000n, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 0x8000000000000000n 的字节布局', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x8000000000000000n, 0);
  return buf[0] === 0x00 && buf[6] === 0x00 && buf[7] === 0x80;
});

test('writeBigUInt64BE - 0x7FFFFFFFFFFFFFFFn 的字节布局', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x7FFFFFFFFFFFFFFFn, 0);
  return buf[0] === 0x7F && buf[1] === 0xFF && buf[7] === 0xFF;
});

test('writeBigUInt64LE - 0x7FFFFFFFFFFFFFFFn 的字节布局', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x7FFFFFFFFFFFFFFFn, 0);
  return buf[0] === 0xFF && buf[6] === 0xFF && buf[7] === 0x7F;
});

// ===== 8. 连续写入的独立性 =====

test('writeBigUInt64BE - 连续写入不同 offset 应独立', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 8);
  buf.writeBigUInt64BE(0x3333333333333333n, 16);
  buf.writeBigUInt64BE(0x4444444444444444n, 24);
  
  return buf[0] === 0x11 && buf[8] === 0x22 && buf[16] === 0x33 && buf[24] === 0x44;
});

test('writeBigUInt64LE - 连续写入不同 offset 应独立', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigUInt64LE(0x5555555555555555n, 0);
  buf.writeBigUInt64LE(0x6666666666666666n, 8);
  buf.writeBigUInt64LE(0x7777777777777777n, 16);
  buf.writeBigUInt64LE(0x8888888888888888n, 24);
  
  return buf[0] === 0x55 && buf[8] === 0x66 && buf[16] === 0x77 && buf[24] === 0x88;
});

// ===== 9. 与 Buffer.from() 创建的 Buffer 的兼容性 =====

test('writeBigUInt64BE - 在 Buffer.from() 创建的 buffer 上工作', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(byte => byte === 0xFF);
});

test('writeBigUInt64LE - 在 Buffer.from() 创建的 buffer 上工作', () => {
  const buf = Buffer.from(new Array(8).fill(0));
  buf.writeBigUInt64LE(0xAAAAAAAAAAAAAAAAn, 0);
  return buf.every(byte => byte === 0xAA);
});

// ===== 10. 极限大小 Buffer 测试 =====

test('writeBigUInt64BE - 在 1MB buffer 尾部写入', () => {
  const buf = Buffer.alloc(1024 * 1024); // 1MB
  const offset = buf.length - 8;
  buf.writeBigUInt64BE(0xDEADBEEFCAFEBABEn, offset);
  return buf[offset] === 0xDE && buf[buf.length - 1] === 0xBE;
});

test('writeBigUInt64LE - 在 1MB buffer 尾部写入', () => {
  const buf = Buffer.alloc(1024 * 1024);
  const offset = buf.length - 8;
  buf.writeBigUInt64LE(0xBEBAFECAEFBEADDEn, offset);
  return buf[offset] === 0xDE && buf[buf.length - 1] === 0xBE;
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
