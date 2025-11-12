// buf.writeInt16BE() - 深度查缺补漏测试
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

// ==================== 参数缺失和默认值 ====================

test('只传入 value，offset 默认为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x1234);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('传入 3 个参数（第3个参数被忽略）', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeInt16BE(0x1234, 0, 'ignored');
  return ret === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('传入 5 个参数（额外参数被忽略）', () => {
  const buf = Buffer.alloc(4);
  const ret = buf.writeInt16BE(0x1234, 0, 'a', 'b', 'c');
  return ret === 2;
});

// ==================== 极端 offset 值 ====================

test('offset 为 -0 应等同于 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x1234, -0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('offset 为 Number.MIN_SAFE_INTEGER 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(100, Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('offset 为极大的负数', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(100, -999999);
    return false;
  } catch (e) {
    return true;
  }
});

// ==================== 特殊的 Buffer 状态 ====================

test('在 Buffer.alloc(0) 上调用应抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.writeInt16BE(100, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('bounds');
  }
});

test('在 Buffer.allocUnsafeSlow 创建的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeInt16BE(0x1234, 0);
  return buf.readInt16BE(0) === 0x1234;
});

test('在 Buffer.from(arrayBuffer) 上写入', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeInt16BE(0x1234, 0);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

// ==================== 浮点数的特殊值 ====================

test('正零和负零写入结果相同', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeInt16BE(+0, 0);
  buf2.writeInt16BE(-0, 0);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1] && buf1[0] === 0 && buf1[1] === 0;
});

test('Number.EPSILON 转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(Number.EPSILON, 0);
  return buf[0] === 0 && buf[1] === 0;
});

test('非常小的正数转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0.000001, 0);
  return buf[0] === 0 && buf[1] === 0;
});

test('非常小的负数转换为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-0.000001, 0);
  return buf[0] === 0 && buf[1] === 0;
});

// ==================== 返回值的详细测试 ====================

test('返回值可用于链式计算', () => {
  const buf = Buffer.alloc(10);
  const next = buf.writeInt16BE(100, 0);
  buf.writeInt16BE(200, next);
  return buf.readInt16BE(0) === 100 && buf.readInt16BE(2) === 200;
});

test('返回值严格等于 offset + 2', () => {
  const buf = Buffer.alloc(10);
  return buf.writeInt16BE(100, 0) === 2 &&
         buf.writeInt16BE(100, 3) === 5 &&
         buf.writeInt16BE(100, 8) === 10;
});

test('返回值是数字原始类型', () => {
  const buf = Buffer.alloc(10);
  const ret = buf.writeInt16BE(100, 0);
  return typeof ret === 'number' && ret === 2;
});

// ==================== 内存地址对齐测试 ====================

test('写入不对齐的地址（奇数 offset）', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 1);
  buf.writeInt16BE(0x5678, 3);
  buf.writeInt16BE(-21555, 5); // 0xABCD as signed (-21555)
  return buf[1] === 0x12 && buf[2] === 0x34 &&
         buf[3] === 0x56 && buf[4] === 0x78 &&
         buf[5] === 0xAB && buf[6] === 0xCD;
});

test('所有可能的 2 字节对齐位置', () => {
  const buf = Buffer.alloc(20);
  for (let i = 0; i < 9; i++) {
    buf.writeInt16BE((i + 1) * 100, i * 2);
  }
  // 验证几个关键位置
  return buf.readInt16BE(0) === 100 &&
         buf.readInt16BE(8) === 500 &&
         buf.readInt16BE(16) === 900;
});

// ==================== 数组索引行为 ====================

test('写入后访问未写入的索引返回 0', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 0);
  return buf[2] === 0 && buf[9] === 0;
});

test('写入不影响 buffer.length 属性', () => {
  const buf = Buffer.alloc(10);
  const originalLength = buf.length;
  buf.writeInt16BE(0x1234, 0);
  return buf.length === originalLength;
});

// ==================== 与其他方法的交互 ====================

test('writeInt16BE 后 readUInt16BE 读取（无符号解释）', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-1, 0); // 0xFFFF as signed
  return buf.readUInt16BE(0) === 0xFFFF;
});

test('writeInt16BE 后 readInt8 逐字节读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x0102, 0);
  return buf.readInt8(0) === 0x01 && buf.readInt8(1) === 0x02;
});

test('writeInt16BE 后 readUInt8 逐字节读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-256, 0); // 0xFF00
  return buf.readUInt8(0) === 0xFF && buf.readUInt8(1) === 0x00;
});

// ==================== 边界值的精确位模式 ====================

test('写入 0x7FFF（最大正值）', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32767, 0);
  return buf[0] === 0x7F && buf[1] === 0xFF;
});

test('写入 0x8000（最小负值 -32768）', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32768, 0);
  return buf[0] === 0x80 && buf[1] === 0x00;
});

test('写入 0x0001', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1, 0);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('写入 0xFFFF（-1）', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-1, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

// ==================== 覆盖和部分写入 ====================

test('连续写入相同位置覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x1234, 0);
  buf.writeInt16BE(0x5678, 0);
  buf.writeInt16BE(-21555, 0); // 0xABCD as signed
  return buf[0] === 0xAB && buf[1] === 0xCD;
});

test('overlapping 写入', () => {
  const buf = Buffer.alloc(6);
  buf.writeInt16BE(0x1234, 0);
  buf.writeInt16BE(0x5678, 1); // 覆盖一部分
  return buf[0] === 0x12 && buf[1] === 0x56 && buf[2] === 0x78;
});

// ==================== 大 Buffer 测试 ====================

test('在 64KB buffer 中写入', () => {
  const buf = Buffer.alloc(65536);
  buf.writeInt16BE(0x1234, 0);
  buf.writeInt16BE(0x5678, 32768);
  buf.writeInt16BE(-21555, 65534); // 0xABCD as signed
  return buf.readInt16BE(0) === 0x1234 &&
         buf.readInt16BE(32768) === 0x5678 &&
         buf.readInt16BE(65534) === -21555;
});

// ==================== 精度边界 ====================

test('写入接近最大值的数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32766, 0);
  buf.writeInt16BE(32765, 2);
  return buf.readInt16BE(0) === 32766 && buf.readInt16BE(2) === 32765;
});

test('写入接近最小值的数', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32767, 0);
  buf.writeInt16BE(-32766, 2);
  return buf.readInt16BE(0) === -32767 && buf.readInt16BE(2) === -32766;
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
