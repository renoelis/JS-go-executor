// buf.writeBigInt64BE/LE - Deep Gap Filling Tests
// 深度查缺补漏：测试容易遗漏的边界场景
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

// ==================== slice/subarray 视图测试 ====================

test('writeBigInt64BE - 在 slice 视图上写入', () => {
  const buf = Buffer.alloc(16);
  const slice = buf.slice(4, 12);
  slice.writeBigInt64BE(0x1234567890ABCDEFn, 0);
  return buf.readBigInt64BE(4) === 0x1234567890ABCDEFn;
});

test('writeBigInt64LE - 在 slice 视图上写入', () => {
  const buf = Buffer.alloc(16);
  const slice = buf.slice(4, 12);
  slice.writeBigInt64LE(0x1234567890ABCDEFn, 0);
  return buf.readBigInt64LE(4) === 0x1234567890ABCDEFn;
});

test('writeBigInt64BE - 在 subarray 视图上写入', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(4, 12);
  sub.writeBigInt64BE(0x7FFFFFFFFFFFFFFFn, 0);
  return buf.readBigInt64BE(4) === 0x7FFFFFFFFFFFFFFFn;
});

test('writeBigInt64LE - 在 subarray 视图上写入', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(4, 12);
  sub.writeBigInt64LE(-0x8000000000000000n, 0);
  return buf.readBigInt64LE(4) === -0x8000000000000000n;
});

test('writeBigInt64BE - slice 视图边界写入', () => {
  const buf = Buffer.alloc(24);
  const slice = buf.slice(8, 16);
  slice.writeBigInt64BE(0x1111111111111111n, 0);
  return buf.readBigInt64BE(8) === 0x1111111111111111n &&
         buf.readBigInt64BE(0) === 0n &&
         buf.readBigInt64BE(16) === 0n;
});

test('writeBigInt64LE - 嵌套 slice 视图写入', () => {
  const buf = Buffer.alloc(32);
  const slice1 = buf.slice(8, 24);
  const slice2 = slice1.slice(4, 12);
  slice2.writeBigInt64LE(0x2222222222222222n, 0);
  return buf.readBigInt64LE(12) === 0x2222222222222222n;
});

// ==================== 冻结/密封对象测试 ====================

test('writeBigInt64BE - 尝试冻结 Buffer（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    Object.freeze(buf);
    return false; // 不应该成功冻结
  } catch (e) {
    return e.message.includes('freeze') || e.message.includes('Cannot');
  }
});

test('writeBigInt64LE - 尝试密封 Buffer（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.message.includes('seal') || e.message.includes('Cannot');
  }
});

// ==================== 属性操作测试 ====================

test('writeBigInt64BE - 删除索引属性后写入', () => {
  const buf = Buffer.alloc(8);
  delete buf[0];
  delete buf[7];
  buf.writeBigInt64BE(0x3333333333333333n, 0);
  return buf.readBigInt64BE(0) === 0x3333333333333333n;
});

test('writeBigInt64LE - 添加自定义属性不影响写入', () => {
  const buf = Buffer.alloc(8);
  buf.customProp = 'test';
  buf.writeBigInt64LE(0x4444444444444444n, 0);
  return buf.readBigInt64LE(0) === 0x4444444444444444n && buf.customProp === 'test';
});

// ==================== 描述符测试 ====================

test('writeBigInt64BE - 方法描述符 writable', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeBigInt64BE');
  return desc && desc.writable === true;
});

test('writeBigInt64BE - 方法描述符 enumerable', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeBigInt64BE');
  return desc && desc.enumerable === true;
});

test('writeBigInt64BE - 方法描述符 configurable', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeBigInt64BE');
  return desc && desc.configurable === true;
});

test('writeBigInt64LE - 方法描述符 writable', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeBigInt64LE');
  return desc && desc.writable === true;
});

test('writeBigInt64LE - 方法描述符 enumerable', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeBigInt64LE');
  return desc && desc.enumerable === true;
});

test('writeBigInt64LE - 方法描述符 configurable', () => {
  const desc = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeBigInt64LE');
  return desc && desc.configurable === true;
});

// ==================== 方法调用方式测试 ====================

test('writeBigInt64BE - 使用 call 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeBigInt64BE.call(buf, 0x5555555555555555n, 0);
  return buf.readBigInt64BE(0) === 0x5555555555555555n;
});

test('writeBigInt64LE - 使用 apply 调用', () => {
  const buf = Buffer.alloc(8);
  Buffer.prototype.writeBigInt64LE.apply(buf, [0x6666666666666666n, 0]);
  return buf.readBigInt64LE(0) === 0x6666666666666666n;
});

test('writeBigInt64BE - 绑定后调用', () => {
  const buf = Buffer.alloc(8);
  const boundWrite = buf.writeBigInt64BE.bind(buf);
  boundWrite(0x7777777777777777n, 0);
  return buf.readBigInt64BE(0) === 0x7777777777777777n;
});

test('writeBigInt64LE - 解构后调用', () => {
  const buf = Buffer.alloc(8);
  const { writeBigInt64LE } = buf;
  try {
    writeBigInt64LE(0x8888888888888888n, 0);
    return false; // 应该抛错，因为 this 丢失
  } catch (e) {
    return true;
  }
});

// ==================== 返回值链式调用测试 ====================

test('writeBigInt64BE - 链式调用利用返回值', () => {
  const buf = Buffer.alloc(24);
  const offset1 = buf.writeBigInt64BE(111n, 0);
  const offset2 = buf.writeBigInt64BE(222n, offset1);
  const offset3 = buf.writeBigInt64BE(333n, offset2);
  return offset1 === 8 && offset2 === 16 && offset3 === 24 &&
         buf.readBigInt64BE(0) === 111n &&
         buf.readBigInt64BE(8) === 222n &&
         buf.readBigInt64BE(16) === 333n;
});

test('writeBigInt64LE - 链式调用利用返回值', () => {
  const buf = Buffer.alloc(24);
  const offset1 = buf.writeBigInt64LE(444n, 0);
  const offset2 = buf.writeBigInt64LE(555n, offset1);
  const offset3 = buf.writeBigInt64LE(666n, offset2);
  return offset1 === 8 && offset2 === 16 && offset3 === 24 &&
         buf.readBigInt64LE(0) === 444n &&
         buf.readBigInt64LE(8) === 555n &&
         buf.readBigInt64LE(16) === 666n;
});

// ==================== 与其他方法组合测试 ====================

test('writeBigInt64BE - 写入后 fill 覆盖部分', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1234567890ABCDEFn, 0);
  buf.fill(0xFF, 4, 8);
  const result = buf.readBigInt64BE(0);
  // 前4字节保留，后4字节被 0xFF 覆盖
  return (result & 0xFFFFFFFF00000000n) === 0x1234567800000000n;
});

test('writeBigInt64LE - fill 后写入', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xAA);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  return buf.readBigInt64LE(0) === 0x1111111111111111n;
});

test('writeBigInt64BE - 写入后 copy 到另一个 Buffer', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64BE(0x1234567890ABCDEFn, 0);
  buf1.copy(buf2, 0, 0, 8);
  return buf2.readBigInt64BE(0) === 0x1234567890ABCDEFn;
});

test('writeBigInt64LE - swap 字节序后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  buf.swap64();
  return buf.readBigInt64BE(0) === 0x0102030405060708n;
});

// ==================== 特殊数值模式测试 ====================

test('writeBigInt64BE - 全1位模式（-1）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-1n, 0);
  let allFF = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) allFF = false;
  }
  return allFF;
});

test('writeBigInt64LE - 交替位模式 0x5555...', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x5555555555555555n, 0);
  return buf[0] === 0x55 && buf[1] === 0x55 && buf[7] === 0x55;
});

test('writeBigInt64BE - 交替位模式 0xAAAA...', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-0x5555555555555556n, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA && buf[7] === 0xAA;
});

test('writeBigInt64LE - 只有符号位为1（最小负数）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-0x8000000000000000n, 0);
  return buf[0] === 0x00 && buf[7] === 0x80;
});

// ==================== 内存/状态一致性测试 ====================

test('writeBigInt64BE - 重复写入同一值不改变结果', () => {
  const buf = Buffer.alloc(8);
  const value = 0x1122334455667788n;
  buf.writeBigInt64BE(value, 0);
  const bytes1 = Array.from(buf);
  buf.writeBigInt64BE(value, 0);
  const bytes2 = Array.from(buf);
  return JSON.stringify(bytes1) === JSON.stringify(bytes2);
});

test('writeBigInt64LE - 快速连续写入读取', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 100; i++) {
    const val = BigInt(i) * 1000000000n;
    buf.writeBigInt64LE(val, 0);
    if (buf.readBigInt64LE(0) !== val) return false;
  }
  return true;
});

// ==================== toString 转换测试 ====================

test('writeBigInt64BE - 写入后 toString("hex")', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  return buf.toString('hex') === '0102030405060708';
});

test('writeBigInt64LE - 写入后 toString("hex")', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  return buf.toString('hex') === '0807060504030201';
});

test('writeBigInt64BE - 写入后 toString("base64")', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  const b64 = buf.toString('base64');
  const restored = Buffer.from(b64, 'base64');
  return restored.readBigInt64BE(0) === 0x0102030405060708n;
});

// ==================== 错误恢复测试 ====================

test('writeBigInt64BE - 错误后 Buffer 状态不变', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  const before = buf.readBigInt64BE(0);
  try {
    buf.writeBigInt64BE(Symbol('test'), 0);
  } catch (e) {
    // 忽略错误
  }
  return buf.readBigInt64BE(0) === before;
});

test('writeBigInt64LE - offset 错误后状态不变', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x2222222222222222n, 0);
  const before = buf.readBigInt64LE(0);
  try {
    buf.writeBigInt64LE(0x3333333333333333n, 100);
  } catch (e) {
    // 忽略错误
  }
  return buf.readBigInt64LE(0) === before;
});

// ==================== 跨方法一致性测试 ====================

test('writeBigInt64BE vs writeBigUInt64BE - 正数一致', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const value = 0x1234567890ABCDEFn;
  buf1.writeBigInt64BE(value, 0);
  buf2.writeBigUInt64BE(value, 0);
  return buf1.equals(buf2);
});

test('writeBigInt64LE vs writeBigUInt64LE - 正数一致', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const value = 0x7FFFFFFFFFFFFFFFn;
  buf1.writeBigInt64LE(value, 0);
  buf2.writeBigUInt64LE(value, 0);
  return buf1.equals(buf2);
});

// ==================== 输出结果 ====================

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
