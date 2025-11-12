// buf.writeInt8() - Extreme Scenarios (极端场景测试)
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

// ========== 错误恢复场景 ==========

test('捕获错误后继续写入', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(200, 0); // 超出范围
  } catch (e) {
    // 忽略错误
  }
  const result = buf.writeInt8(50, 0);
  return result === 1 && buf[0] === 50;
});

test('连续多次错误后正常写入', () => {
  const buf = Buffer.alloc(4);
  for (let i = 0; i < 5; i++) {
    try {
      buf.writeInt8(128 + i, 0);
    } catch (e) {
      // 忽略
    }
  }
  const result = buf.writeInt8(100, 0);
  return result === 1 && buf[0] === 100;
});

// ========== 数组索引访问与 writeInt8 混合 ==========

test('通过索引写入后用 writeInt8 覆盖', () => {
  const buf = Buffer.alloc(4);
  buf[0] = 255;
  buf.writeInt8(127, 0);
  return buf[0] === 127;
});

test('writeInt8 后通过索引读取', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-50, 1);
  return buf[1] === (256 - 50);
});

test('混合使用索引和 writeInt8', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      buf.writeInt8(i - 5, i);
    } else {
      buf[i] = (i - 5) & 0xFF;
    }
  }
  return buf[0] === (256 - 5) && buf[1] === (256 - 4);
});

// ========== 边界条件的数学运算 ==========

test('value 为 127 + 0.4 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(127 + 0.4, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

test('value 为 -128 - 0.4 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(-128 - 0.4, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

test('value 为 (127 + 0.3) 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(127 + 0.3, 0);
    return false;
  } catch (e) {
    return e.message.includes('value') && e.message.includes('range');
  }
});

test('value 为 (-128 + 0.3) 截断', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(-128 + 0.3, 0);
  return result === 1 && buf[0] === (256 - 127);
});

// ========== 特殊的类型转换组合 ==========

test('value 为对象 valueOf 返回原始值', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf: function() {
      return 42;
    }
  };
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 42;
});

test('value 为对象 toString 返回数组抛出错误', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    toString: function() {
      return ['88'];
    }
  };
  try {
    buf.writeInt8(obj, 0);
    return false;
  } catch (e) {
    return e.message.includes('primitive') || e.message.includes('convert');
  }
});

// ========== slice/subarray 后的写入验证 ==========

test('在 slice 后的 buffer 上写入不影响原 buffer', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = buf1.slice(1, 3);
  buf2.writeInt8(99, 0);
  return buf1[1] === 99 && buf2[0] === 99; // slice 是浅拷贝
});

test('在 subarray 后的 buffer 上写入影响原 buffer', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = buf1.subarray(1, 3);
  buf2.writeInt8(88, 0);
  return buf1[1] === 88 && buf2[0] === 88;
});

test('多层 slice 后写入', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = buf1.slice(2, 8);
  const buf3 = buf2.slice(1, 4);
  buf3.writeInt8(77, 0);
  return buf1[3] === 77 && buf2[1] === 77 && buf3[0] === 77;
});

// ========== 比较运算符相关 ==========

test('offset 为 true + true 等于 2 可以写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(10, true + true);
  return result === 3 && buf[2] === 10;
});

test('offset 为 1 + "1" 抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, 1 + '1');
    return false;
  } catch (e) {
    return e.message.includes('offset');
  }
});

// ========== 极端的 Buffer 大小 ==========

test('在大小为 1 的 buffer 中写入', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeInt8(-128, 0);
  return result === 1 && buf[0] === 0x80;
});

test('在大小为 1 的 buffer offset=0 写入边界值', () => {
  const buf = Buffer.alloc(1);
  buf.writeInt8(127, 0);
  return buf.readInt8(0) === 127;
});

test('在大小为 1 的 buffer 尝试 offset=1 抛出错误', () => {
  const buf = Buffer.alloc(1);
  try {
    buf.writeInt8(10, 1);
    return false;
  } catch (e) {
    return e.message.includes('offset') && e.message.includes('range');
  }
});

// ========== 与 TypedArray 构造函数的交互 ==========

test('从 Int8Array 创建 Buffer 后写入', () => {
  const i8 = new Int8Array([10, 20, 30]);
  const buf = Buffer.from(i8.buffer);
  buf.writeInt8(-50, 1);
  return i8[1] === -50 && buf[1] === (256 - 50);
});

test('从 Uint8Array 创建 Buffer 后写入负数', () => {
  const u8 = new Uint8Array([100, 200]);
  const buf = Buffer.from(u8.buffer);
  buf.writeInt8(-10, 0);
  return u8[0] === (256 - 10) && buf.readInt8(0) === -10;
});

// ========== 特殊数值的位运算 ==========

test('value 为 127 | 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(127 | 0, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 -128 | 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(-128 | 0, 0);
  return result === 1 && buf[0] === 0x80;
});

test('value 为 ~~127.9', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(~~127.9, 0);
  return result === 1 && buf[0] === 127;
});

test('value 为 127.9 << 0', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(127.9 << 0, 0);
  return result === 1 && buf[0] === 127;
});

// ========== JSON 序列化/反序列化后的 Buffer ==========

test('JSON.parse(JSON.stringify(buffer)) 后写入', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const json = JSON.stringify(buf1);
  const parsed = JSON.parse(json);
  const buf2 = Buffer.from(parsed.data);
  buf2.writeInt8(99, 0);
  return buf2[0] === 99;
});

// ========== 使用 apply/call/bind 调用 ==========

test('使用 call 调用 writeInt8', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8.call(buf, 66, 0);
  return result === 1 && buf[0] === 66;
});

test('使用 apply 调用 writeInt8', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8.apply(buf, [77, 1]);
  return result === 2 && buf[1] === 77;
});

test('使用 bind 调用 writeInt8', () => {
  const buf = Buffer.alloc(4);
  const boundWrite = buf.writeInt8.bind(buf);
  const result = boundWrite(88, 2);
  return result === 3 && buf[2] === 88;
});

test('使用 bind 固定 value 参数', () => {
  const buf = Buffer.alloc(4);
  const boundWrite = buf.writeInt8.bind(buf, 55);
  const result = boundWrite(3);
  return result === 4 && buf[3] === 55;
});

// ========== 删除属性后的行为 ==========

test('删除 buffer 的某个索引后仍可写入', () => {
  const buf = Buffer.alloc(4);
  buf[0] = 100;
  delete buf[0];
  const result = buf.writeInt8(50, 0);
  return result === 1 && buf[0] === 50;
});

// ========== 特殊的 offset 计算 ==========

test('offset 为 Math.floor(2.9)', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(99, Math.floor(2.9));
  return result === 3 && buf[2] === 99;
});

test('offset 为 Math.ceil(1.1)', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(88, Math.ceil(1.1));
  return result === 3 && buf[2] === 88;
});

test('offset 为 Math.round(1.5)', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(77, Math.round(1.5));
  return result === 3 && buf[2] === 77;
});

test('offset 为 parseInt("2.9")', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(66, parseInt('2.9'));
  return result === 3 && buf[2] === 66;
});

// ========== 循环引用对象 ==========

test('value 为循环引用对象转为 NaN 写入 0', () => {
  const buf = Buffer.alloc(4);
  const obj = {};
  obj.self = obj;
  const result = buf.writeInt8(obj, 0);
  return result === 1 && buf[0] === 0;
});

// ========== 特殊的返回值使用 ==========

test('连续使用返回值链式调用 10 次', () => {
  const buf = Buffer.alloc(20);
  let offset = 0;
  for (let i = 0; i < 10; i++) {
    offset = buf.writeInt8(i * 10, offset);
  }
  return offset === 10 && buf[9] === 90;
});

test('返回值用于条件判断', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(99, 0);
  if (result === 1) {
    return buf[0] === 99;
  }
  return false;
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
