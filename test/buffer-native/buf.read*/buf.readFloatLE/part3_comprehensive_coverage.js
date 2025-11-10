// buf.readFloatLE() - 综合覆盖测试
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

// offset 为 undefined/null 测试
test('offset 为 undefined（应使用默认值 0）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  return Math.abs(buf.readFloatLE(undefined) - 3.14) < 0.01;
});

test('offset 为 null（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// offset 为其他非法类型
test('offset 为对象（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE({});
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为数组（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE([0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为布尔值 true（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为布尔值 false（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE(false);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为空字符串（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readFloatLE('');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 多次读取测试
test('同一 Buffer 多次读取不同位置', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(1.5, 0);
  buf.writeFloatLE(2.5, 4);
  buf.writeFloatLE(3.5, 8);
  return buf.readFloatLE(0) === 1.5 && 
         buf.readFloatLE(4) === 2.5 && 
         buf.readFloatLE(8) === 3.5;
});

test('连续读取不影响 Buffer 状态', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.718, 0);
  const first = buf.readFloatLE(0);
  const second = buf.readFloatLE(0);
  return Math.abs(first - 2.718) < 0.001 && first === second;
});

// 往返测试（更全面）
test('往返测试：最大正 Float32', () => {
  const buf = Buffer.alloc(4);
  const value = 3.4028234663852886e+38;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) / value < 0.0001;
});

test('往返测试：最小正 Float32', () => {
  const buf = Buffer.alloc(4);
  const value = 1.1754943508222875e-38;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) / value < 0.01;
});

test('往返测试：最大负 Float32', () => {
  const buf = Buffer.alloc(4);
  const value = -3.4028234663852886e+38;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) / Math.abs(value) < 0.0001;
});

test('往返测试：最小负 Float32', () => {
  const buf = Buffer.alloc(4);
  const value = -1.1754943508222875e-38;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) / Math.abs(value) < 0.01;
});

test('往返测试：小数精度', () => {
  const buf = Buffer.alloc(4);
  const value = 0.1 + 0.2;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) < 0.00001;
});

// 边界极值测试
test('Float32 最大值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Number.MAX_VALUE, 0);
  return buf.readFloatLE(0) === Infinity;
});

test('Float32 最小值（接近 0）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Number.MIN_VALUE, 0);
  return buf.readFloatLE(0) === 0;
});

test('Float32 epsilon', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Number.EPSILON, 0);
  const result = buf.readFloatLE(0);
  return result > 0 && result < 0.00001;
});

// 返回值类型测试
test('返回值类型为 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  return typeof buf.readFloatLE(0) === 'number';
});

test('NaN 返回值类型为 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(NaN, 0);
  return typeof buf.readFloatLE(0) === 'number';
});

test('Infinity 返回值类型为 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(Infinity, 0);
  return typeof buf.readFloatLE(0) === 'number';
});

// 不同 Buffer 创建方式
test('Buffer.from 数组创建的 Buffer', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]); // 1.0 in LE
  return buf.readFloatLE(0) === 1.0;
});

test('Buffer.allocUnsafe 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(2.5, 0);
  return buf.readFloatLE(0) === 2.5;
});

test('Buffer.concat 合并后的 Buffer', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1[0] = 0x00;
  buf1[1] = 0x00;
  buf2[0] = 0x80;
  buf2[1] = 0x3F;
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readFloatLE(0) === 1.0;
});

test('Buffer.slice 切片后的 Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(3.14, 4);
  const slice = buf.slice(4);
  return Math.abs(slice.readFloatLE(0) - 3.14) < 0.01;
});

// offset 边界精确测试
test('offset = 0（起始位置）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.5, 0);
  return buf.readFloatLE(0) === 1.5;
});

test('offset = buf.length - 4（恰好最后 4 字节）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(2.5, 0);
  return buf.readFloatLE(0) === 2.5;
});

test('offset = buf.length - 4 + 1（超出 1 字节，应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.readFloatLE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 特殊浮点模式测试
test('非规格化数（Denormalized number）', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  const result = buf.readFloatLE(0);
  return result > 0 && result < 1e-38;
});

test('最小非规格化正数', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  const result = buf.readFloatLE(0);
  return result === 1.401298464324817e-45;
});

test('最大非规格化正数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x7F, 0x00]);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 1.1754942106924411e-38) < 1e-45;
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
