// buf.writeInt16BE() - 第8轮补充：异常情况和鲁棒性终极测试
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

// 各种边界值的精确测试
test('写入 32766 (最大值-1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32766, 0);
  return buf.readInt16BE(0) === 32766 && buf[0] === 0x7F && buf[1] === 0xFE;
});

test('写入 -32767 (最小值+1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32767, 0);
  return buf.readInt16BE(0) === -32767 && buf[0] === 0x80 && buf[1] === 0x01;
});

test('写入 1 和 -1 的字节表示正确', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeInt16BE(1, 0);
  buf2.writeInt16BE(-1, 0);
  return buf1[0] === 0x00 && buf1[1] === 0x01 &&
         buf2[0] === 0xFF && buf2[1] === 0xFF;
});

// 符号扩展测试
test('负数的符号位正确设置', () => {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(-256, 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('小负数 -1 到 -128', () => {
  const buf = Buffer.alloc(4);
  for (let i = -1; i >= -128; i--) {
    buf.writeInt16BE(i, 0);
    if (buf.readInt16BE(0) !== i) return false;
  }
  return true;
});

test('边界附近的每一个值', () => {
  const buf = Buffer.alloc(4);
  const testValues = [
    32764, 32765, 32766, 32767,
    -32768, -32767, -32766, -32765
  ];
  for (let val of testValues) {
    buf.writeInt16BE(val, 0);
    if (buf.readInt16BE(0) !== val) return false;
  }
  return true;
});

// offset 的边界情况
test('offset 刚好使写入到达 buffer 末尾', () => {
  const buf = Buffer.alloc(100);
  buf.writeInt16BE(999, 98);
  return buf.readInt16BE(98) === 999;
});

test('offset 为 2^31-3 会超出范围', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, 2147483645);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('offset 为 MAX_SAFE_INTEGER 抛出错误', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE(100, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

// 参数数量测试
test('缺少 offset 参数默认为 0', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt16BE(100);
  return result === 2 && buf.readInt16BE(0) === 100;
});

test('缺少 value 参数写入 undefined (转为0)', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.writeInt16BE();
    return buf.readInt16BE(0) === 0;
  } catch (e) {
    // 也可能抛出参数错误
    return e.message.includes('argument') || e.message.includes('required');
  }
});

test('多余的参数被忽略', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt16BE(100, 0, 'extra', 999, {});
  return result === 2 && buf.readInt16BE(0) === 100;
});

// 返回值精确测试
test('返回值永远是 offset + 2', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i <= 98; i++) {
    const ret = buf.writeInt16BE(100, i);
    if (ret !== i + 2) return false;
  }
  return true;
});

// 写入模式组合
test('全部写入相同值', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    buf.writeInt16BE(0x5A5A, i * 2);
  }
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== 0x5A) return false;
  }
  return true;
});

test('写入递增位模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt16BE(0b0000000000000001, 0);
  buf.writeInt16BE(0b0000000000000010, 2);
  buf.writeInt16BE(0b0000000000000100, 4);
  buf.writeInt16BE(0b0000000000001000, 6);
  return buf.readInt16BE(0) === 1 &&
         buf.readInt16BE(2) === 2 &&
         buf.readInt16BE(4) === 4 &&
         buf.readInt16BE(6) === 8;
});

// 特殊位模式
test('所有偶数位为1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0b0101010101010101, 0);
  return buf[0] === 0x55 && buf[1] === 0x55;
});

test('所有奇数位为1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-21846, 0); // 0xAAAA as signed
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('只有最高位为1 (-32768)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-32768, 0);
  return buf[0] === 0x80 && buf[1] === 0x00;
});

test('只有最低位为1 (1)', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(1, 0);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('高字节全1低字节全0', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(-256, 0); // 0xFF00
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('高字节全0低字节全1', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(255, 0); // 0x00FF
  return buf[0] === 0x00 && buf[1] === 0xFF;
});

// 性能相关的连续操作
test('交替位置写入1000次', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 1000; i++) {
    buf.writeInt16BE(i % 100, i % 2 === 0 ? 0 : 2);
  }
  return true;
});

test('同一位置写入10000次', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 10000; i++) {
    buf.writeInt16BE(i % 32767, 0);
  }
  return buf.readInt16BE(0) === 9999 % 32767;
});

// 与 fill 方法的交互
test('fill 后写入覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xAA);
  buf.writeInt16BE(0, 4);
  return buf[3] === 0xAA && buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0xAA;
});

test('写入后 fill 覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt16BE(0x1234, 4);
  buf.fill(0xBB, 0, 4);
  buf.fill(0xBB, 6, 10);
  return buf[3] === 0xBB && buf[4] === 0x12 && buf[5] === 0x34 && buf[6] === 0xBB;
});

// 从已有数据的 buffer
test('从 hex 字符串创建后写入', () => {
  const buf = Buffer.from('0102030405060708', 'hex');
  buf.writeInt16BE(-1, 2); // 0xFFFF 作为有符号是 -1
  return buf[0] === 0x01 && buf[1] === 0x02 &&
         buf[2] === 0xFF && buf[3] === 0xFF &&
         buf[4] === 0x05;
});

test('从 base64 创建后写入', () => {
  const buf = Buffer.from('AQIDBAUG', 'base64');
  buf.writeInt16BE(-21846, 0); // 0xAAAA 作为有符号
  return buf[0] === 0xAA && buf[1] === 0xAA && buf[2] === 0x03;
});

// 关于不可变性的验证
test('冻结的 buffer (实际无法冻结) 仍可写', () => {
  const buf = Buffer.alloc(4);
  try {
    // Buffer 实际上无法被 freeze
    buf.writeInt16BE(100, 0);
    return buf.readInt16BE(0) === 100;
  } catch (e) {
    return false;
  }
});

// 极限值测试（Node v25.0.0 严格检查范围）
test('2^16 超出范围抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(65536, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('2^16 + 1 超出范围抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(65537, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('2^17 超出范围抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(131072, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('负数 -65536 超出范围抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(-65536, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('负数 -65535 超出范围抛出错误', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeInt16BE(-65535, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
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
