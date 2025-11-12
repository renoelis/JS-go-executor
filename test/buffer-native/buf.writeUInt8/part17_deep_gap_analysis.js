// buf.writeUInt8() - 深度查缺补漏测试
// 针对可能遗漏的边界场景进行全面验证
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

// ==================== 1. 内存边界安全 ====================

test('写入后立即读取验证数据完整性', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    buf.writeUInt8(i * 25, i);
  }
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== (i * 25) % 256) return false;
  }
  return true;
});

test('写入不影响相邻字节', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  buf.writeUInt8(0x00, 1);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('多次写入同一位置保持独立性', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, 0);
  buf.writeUInt8(200, 0);
  buf.writeUInt8(50, 0);
  return buf[0] === 50;
});

// ==================== 2. 边界值精确性 ====================

test('写入 0 后读取精确匹配', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0, 0);
  return buf.readUInt8(0) === 0;
});

test('写入 255 后读取精确匹配', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255, 0);
  return buf.readUInt8(0) === 255;
});

test('写入 128 后读取精确匹配', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(128, 0);
  return buf.readUInt8(0) === 128;
});

// ==================== 3. 浮点数截断边界 ====================

test('0.0 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0.0, 0);
  return buf[0] === 0;
});

test('0.1 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0.1, 0);
  return buf[0] === 0;
});

test('0.49 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0.49, 0);
  return buf[0] === 0;
});

test('0.5 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0.5, 0);
  return buf[0] === 0;
});

test('0.99 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0.99, 0);
  return buf[0] === 0;
});

test('1.0 截断为 1', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(1.0, 0);
  return buf[0] === 1;
});

test('254.0 截断为 254', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(254.0, 0);
  return buf[0] === 254;
});

test('254.5 截断为 254', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(254.5, 0);
  return buf[0] === 254;
});

test('254.99 截断为 254', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(254.99, 0);
  return buf[0] === 254;
});

test('255.0 正好等于 255', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255.0, 0);
  return buf[0] === 255;
});

// ==================== 4. 返回值链式调用严谨性 ====================

test('返回值必须等于 offset + 1', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    const ret = buf.writeUInt8(i, i);
    if (ret !== i + 1) return false;
  }
  return true;
});

test('链式调用构建完整数据', () => {
  const buf = Buffer.alloc(5);
  let offset = 0;
  offset = buf.writeUInt8(10, offset);
  offset = buf.writeUInt8(20, offset);
  offset = buf.writeUInt8(30, offset);
  offset = buf.writeUInt8(40, offset);
  offset = buf.writeUInt8(50, offset);
  return offset === 5 && buf[0] === 10 && buf[1] === 20 && buf[2] === 30 && buf[3] === 40 && buf[4] === 50;
});

// ==================== 5. 与其他方法的交互 ====================

test('writeUInt8 后 slice 不影响原数据', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(100, 1);
  const slice = buf.slice(0, 2);
  slice[1] = 200;
  return buf[1] === 200; // slice 共享内存
});

test('writeUInt8 后 copy 独立性', () => {
  const src = Buffer.alloc(4);
  src.writeUInt8(100, 1);
  const dst = Buffer.alloc(4);
  src.copy(dst);
  dst[1] = 200;
  return src[1] === 100 && dst[1] === 200;
});

test('writeUInt8 后 toString 正确', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(0x41, 0); // 'A'
  buf.writeUInt8(0x42, 1); // 'B'
  buf.writeUInt8(0x43, 2); // 'C'
  return buf.toString('ascii') === 'ABC';
});

// ==================== 6. TypedArray 视图一致性 ====================

test('writeUInt8 在 Uint8Array 视图中可见', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123, 1);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return view[1] === 123;
});

test('writeUInt8 不影响其他 TypedArray 视图', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const u16 = new Uint16Array(ab);
  buf.writeUInt8(0xFF, 0);
  buf.writeUInt8(0xFF, 1);
  return u16[0] === 0xFFFF;
});

// ==================== 7. 极端 offset 值 ====================

test('offset = buf.length - 1 写入成功', () => {
  const buf = Buffer.alloc(10);
  const ret = buf.writeUInt8(99, 9);
  return ret === 10 && buf[9] === 99;
});

test('连续写入到边界', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(1, 0);
  buf.writeUInt8(2, 1);
  buf.writeUInt8(3, 2);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// ==================== 8. 特殊数值的位操作 ====================

test('0b11111111 (255) 写入正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0b11111111, 0);
  return buf[0] === 255;
});

test('0o377 (255) 写入正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0o377, 0);
  return buf[0] === 255;
});

test('0xFF (255) 写入正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(0xFF, 0);
  return buf[0] === 255;
});

// ==================== 9. Buffer 状态变化 ====================

test('写入不改变 Buffer 长度', () => {
  const buf = Buffer.alloc(5);
  const len = buf.length;
  buf.writeUInt8(100, 2);
  return buf.length === len;
});

test('写入不改变 Buffer byteLength', () => {
  const buf = Buffer.alloc(5);
  const byteLen = buf.byteLength;
  buf.writeUInt8(100, 2);
  return buf.byteLength === byteLen;
});

// ==================== 10. 零拷贝和性能相关 ====================

test('大量连续写入性能验证', () => {
  const buf = Buffer.alloc(1000);
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    buf.writeUInt8(i % 256, i);
  }
  const elapsed = Date.now() - start;
  // 验证数据正确性
  for (let i = 0; i < 1000; i++) {
    if (buf[i] !== i % 256) return false;
  }
  return elapsed < 1000; // 应该在 1 秒内完成
});

// ==================== 11. 错误边界的精确性 ====================

test('255.00001 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(255.00001, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') && e.message.includes('255');
  }
});

test('-0.00001 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(-0.00001, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('value');
  }
});

test('256.0 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(256.0, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') && e.message.includes('256');
  }
});

// ==================== 12. 科学计数法 ====================

test('1e2 (100) 写入正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(1e2, 0);
  return buf[0] === 100;
});

test('2.55e2 (255) 写入正确', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(2.55e2, 0);
  return buf[0] === 255;
});

test('1e-1 (0.1) 截断为 0', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(1e-1, 0);
  return buf[0] === 0;
});

test('2.56e2 (256) 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(2.56e2, 0);
    return false;
  } catch (e) {
    return e.message.includes('range');
  }
});

// ==================== 13. Buffer 子类行为 ====================

test('Buffer.from 创建的实例写入正常', () => {
  const buf = Buffer.from([0, 0, 0]);
  buf.writeUInt8(99, 1);
  return buf[1] === 99;
});

test('Buffer.alloc 创建的实例写入正常', () => {
  const buf = Buffer.alloc(3);
  buf.writeUInt8(99, 1);
  return buf[1] === 99;
});

test('Buffer.allocUnsafe 创建的实例写入正常', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUInt8(99, 1);
  return buf[1] === 99;
});

// ==================== 14. 负零和正零 ====================

test('+0 和 -0 都写入为 0', () => {
  const buf1 = Buffer.alloc(1);
  const buf2 = Buffer.alloc(1);
  buf1.writeUInt8(+0, 0);
  buf2.writeUInt8(-0, 0);
  return buf1[0] === 0 && buf2[0] === 0;
});

// ==================== 15. 数学运算结果 ====================

test('127 + 1 写入为 128', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(127 + 1, 0);
  return buf[0] === 128;
});

test('256 - 1 写入为 255', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(256 - 1, 0);
  return buf[0] === 255;
});

test('128 * 2 超出范围抛错', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeUInt8(128 * 2, 0);
    return false;
  } catch (e) {
    return e.message.includes('range') && e.message.includes('256');
  }
});

test('255 / 2 截断为 127', () => {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(255 / 2, 0);
  return buf[0] === 127;
});

// ==================== 16. 并发写入（虽然 JS 单线程）====================

test('快速连续写入不丢失数据', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.writeUInt8(i, i);
  }
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== i % 256) return false;
  }
  return true;
});

// ==================== 17. 与 readUInt8 的对称性 ====================

test('write 后 read 对称性验证', () => {
  const buf = Buffer.alloc(1);
  for (let i = 0; i <= 255; i++) {
    buf.writeUInt8(i, 0);
    if (buf.readUInt8(0) !== i) return false;
  }
  return true;
});

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
