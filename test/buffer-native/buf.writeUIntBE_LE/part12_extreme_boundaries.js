// buf.writeUIntBE/LE() - 极端场景与兼容性最终测试
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

// Number.MAX_SAFE_INTEGER 边界
test('writeUIntBE 6字节最大安全整数', () => {
  const buf = Buffer.allocUnsafe(7);
  const value = Math.pow(2, 48) - 1; // 6字节最大值：281474976710655
  buf.writeUIntBE(value, 0, 6);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff && buf[5] === 0xff;
});

test('writeUIntLE 6字节最大安全整数', () => {
  const buf = Buffer.allocUnsafe(7);
  const value = Math.pow(2, 48) - 1;
  buf.writeUIntLE(value, 0, 6);
  return buf.slice(0, 6).every(b => b === 0xff);
});

// 跨越 2^n 边界
test('writeUIntBE 跨越2^8边界', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(255, 0, 1);
  buf.writeUIntBE(256, 1, 2);
  return buf[0] === 255 && buf[1] === 0x01 && buf[2] === 0x00;
});

test('writeUIntBE 跨越2^16边界', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0xffff, 0, 2);
  buf.writeUIntBE(0x10000, 2, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0x01 && buf[3] === 0x00 && buf[4] === 0x00;
});

// 精度丢失边界（JavaScript Number）
test('writeUIntBE 大整数精度保持', () => {
  const buf = Buffer.allocUnsafe(10);
  const value = 0x123456789abc;
  buf.writeUIntBE(value, 0, 6);
  const read = buf.readUIntBE(0, 6);
  return read === value;
});

// 多次重写同一位置不同byteLength
test('writeUIntBE 同一位置递增byteLength重写', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf.writeUIntBE(0xff, 0, 1);
  buf.writeUIntBE(0xffff, 0, 2);
  buf.writeUIntBE(0xffffff, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

// 截断高位测试
test('writeUIntBE 显式测试高位截断（超范围应报错）', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0x1ff, 0, 1); // 超出1字节范围
    return false;
  } catch (e) {
    return true;
  }
});

// 非常接近边界的值
test('writeUIntBE 接近最大值-1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(254, 0, 1);
  buf.writeUIntBE(0xfffe, 1, 2);
  return buf[0] === 254 && buf[1] === 0xff && buf[2] === 0xfe;
});

test('writeUIntLE 接近最大值-1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(254, 0, 1);
  buf.writeUIntLE(0xfffe, 1, 2);
  return buf[0] === 254 && buf[1] === 0xfe && buf[2] === 0xff;
});

// 幂次方精确测试
test('writeUIntBE 2的各次幂精确写入', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.writeUIntBE(Math.pow(2, 0), 0, 1);   // 1
  buf.writeUIntBE(Math.pow(2, 7), 1, 1);   // 128
  buf.writeUIntBE(Math.pow(2, 8), 2, 2);   // 256
  buf.writeUIntBE(Math.pow(2, 15), 4, 2);  // 32768
  buf.writeUIntBE(Math.pow(2, 16), 6, 3);  // 65536
  return buf[0] === 1 && buf[1] === 128 && buf[2] === 0x01 && buf[3] === 0x00;
});

// 补码边界（虽然是无符号，但测试转换边界）
test('writeUIntBE 测试0x80边界（有符号负数起点）', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0x7f, 0, 1);  // 127
  buf.writeUIntBE(0x80, 1, 1);  // 128
  buf.writeUIntBE(0x7fff, 2, 2); // 32767
  buf.writeUIntBE(0x8000, 4, 2); // 32768
  return buf[0] === 0x7f && buf[1] === 0x80 && buf[3] === 0xff && buf[4] === 0x80;
});

// 连续边界值
test('writeUIntBE 所有单字节边界值', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntBE(0, 0, 1);
  buf.writeUIntBE(127, 1, 1);
  buf.writeUIntBE(255, 2, 1);
  return buf[0] === 0 && buf[1] === 127 && buf[2] === 255;
});

// 奇数byteLength边界
test('writeUIntBE 3字节边界测试', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0, 0, 3);
  buf.writeUIntBE(0x7fffff, 3, 3);
  buf.writeUIntBE(0xffffff, 6, 3);
  return buf[0] === 0 && buf[3] === 0x7f && buf[6] === 0xff && buf[8] === 0xff;
});

test('writeUIntBE 5字节边界测试', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0, 0, 5);
  buf.writeUIntBE(0xffffffffff, 5, 5);
  return buf[0] === 0 && buf[5] === 0xff && buf[9] === 0xff;
});

// 字节反转验证
test('BE和LE相同offset不同endian读回互逆', () => {
  const value = 0x12345678;
  const bufBE = Buffer.allocUnsafe(8);
  const bufLE = Buffer.allocUnsafe(8);
  bufBE.writeUIntBE(value, 0, 4);
  bufLE.writeUIntLE(value, 0, 4);
  const readBE = bufBE.readUIntBE(0, 4);
  const readLE = bufLE.readUIntLE(0, 4);
  return readBE === value && readLE === value && readBE === readLE;
});

// 混合不同大小写入后读回
test('writeUIntBE 混合大小写入后独立读回', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.writeUIntBE(0x12, 0, 1);
  buf.writeUIntBE(0x3456, 1, 2);
  buf.writeUIntBE(0x789abc, 3, 3);
  const v1 = buf.readUIntBE(0, 1);
  const v2 = buf.readUIntBE(1, 2);
  const v3 = buf.readUIntBE(3, 3);
  return v1 === 0x12 && v2 === 0x3456 && v3 === 0x789abc;
});

// 零长度buffer特殊情况已在part2测试

// 非常大的buffer末尾写入
test('writeUIntBE 在10KB buffer末尾写入', () => {
  const buf = Buffer.allocUnsafe(10240);
  const r = buf.writeUIntBE(0x123456, 10237, 3);
  return r === 10240 && buf[10237] === 0x12 && buf[10239] === 0x56;
});

// 数组索引边界
test('writeUIntBE buffer长度刚好容纳写入', () => {
  for (let len = 1; len <= 6; len++) {
    const buf = Buffer.allocUnsafe(len);
    const value = Math.pow(2, len * 8) - 1;
    buf.writeUIntBE(value, 0, len);
    const pass = buf.every(b => b === 0xff);
    if (!pass) return false;
  }
  return true;
});

// 写入后buffer.length不变
test('writeUIntBE 写入不改变buffer.length', () => {
  const buf = Buffer.allocUnsafe(10);
  const len1 = buf.length;
  buf.writeUIntBE(0x1234, 2, 2);
  const len2 = buf.length;
  return len1 === 10 && len2 === 10;
});

// 返回值连续性
test('writeUIntBE 返回值可用于链式调用', () => {
  const buf = Buffer.allocUnsafe(20);
  const r1 = buf.writeUIntBE(0x11, 0, 1);
  const r2 = buf.writeUIntBE(0x22, r1, 1);
  const r3 = buf.writeUIntBE(0x33, r2, 1);
  const r4 = buf.writeUIntBE(0x44, r3, 1);
  return r1 === 1 && r2 === 2 && r3 === 3 && r4 === 4 && buf[0] === 0x11 && buf[3] === 0x44;
});

// 相同数据不同表示
test('writeUIntBE 十进制十六进制二进制写入结果一致', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  const buf3 = Buffer.allocUnsafe(4);
  buf1.writeUIntBE(255, 0, 1);
  buf2.writeUIntBE(0xff, 0, 1);
  buf3.writeUIntBE(0b11111111, 0, 1);
  return buf1[0] === buf2[0] && buf2[0] === buf3[0] && buf1[0] === 255;
});

// 数学运算结果作为value
test('writeUIntBE value为表达式结果', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(10 + 20, 0, 1);
  buf.writeUIntBE(100 * 2, 1, 1);
  buf.writeUIntBE(1000 / 10, 2, 1);
  return buf[0] === 30 && buf[1] === 200 && buf[2] === 100;
});

// 位运算作为value
test('writeUIntBE value为位运算结果', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0xff & 0x0f, 0, 1);
  buf.writeUIntBE(0x12 | 0x34, 1, 1);
  buf.writeUIntBE(0xff ^ 0xaa, 2, 1);
  buf.writeUIntBE(1 << 7, 3, 1);
  return buf[0] === 0x0f && buf[1] === 0x36 && buf[2] === 0x55 && buf[3] === 128;
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
