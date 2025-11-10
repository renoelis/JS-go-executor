// 深度缺失覆盖测试
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

// === TypedArray 兼容性测试 ===

test('BE: 从 Uint8Array 创建的 Buffer', () => {
  const arr = new Uint8Array([0x12, 0x34, 0x56]);
  const buf = Buffer.from(arr);
  return buf.readUIntBE(0, 3) === 0x123456;
});

test('LE: 从 Uint8Array 创建的 Buffer', () => {
  const arr = new Uint8Array([0x56, 0x34, 0x12]);
  const buf = Buffer.from(arr);
  return buf.readUIntLE(0, 3) === 0x123456;
});

test('BE: 从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 0x12;
  view[1] = 0x34;
  view[2] = 0x56;
  const buf = Buffer.from(ab);
  return buf.readUIntBE(0, 3) === 0x123456;
});

test('LE: 从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 0x56;
  view[1] = 0x34;
  view[2] = 0x12;
  const buf = Buffer.from(ab);
  return buf.readUIntLE(0, 3) === 0x123456;
});

// === 字节位置重要性测试 ===

test('BE: 高字节变化影响结果 - 2字节', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x34]);
  return buf1.readUIntBE(0, 2) !== buf2.readUIntBE(0, 2);
});

test('LE: 低字节变化影响结果 - 2字节', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x12, 0x56]);
  return buf1.readUIntLE(0, 2) !== buf2.readUIntLE(0, 2);
});

test('BE: 每个字节都重要 - 6字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const results = [];
  for (let i = 0; i < 6; i++) {
    const temp = Buffer.from(buf);
    temp[i] = 0xFF;
    results.push(temp.readUIntBE(0, 6));
  }
  return new Set(results).size === 6;
});

test('LE: 每个字节都重要 - 6字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const results = [];
  for (let i = 0; i < 6; i++) {
    const temp = Buffer.from(buf);
    temp[i] = 0xFF;
    results.push(temp.readUIntLE(0, 6));
  }
  return new Set(results).size === 6;
});

// === 跨字节边界测试 ===

test('BE: 跨字节边界 - 从 offset 1 读取', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x00]);
  return buf.readUIntBE(1, 3) === 0x123456;
});

test('LE: 跨字节边界 - 从 offset 1 读取', () => {
  const buf = Buffer.from([0x00, 0x56, 0x34, 0x12, 0x00]);
  return buf.readUIntLE(1, 3) === 0x123456;
});

test('BE: 跨字节边界 - 从 offset 2 读取', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readUIntBE(2, 4) === 0x12345678;
});

test('LE: 跨字节边界 - 从 offset 2 读取', () => {
  const buf = Buffer.from([0x00, 0x00, 0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(2, 4) === 0x12345678;
});

// === 重叠读取测试 ===

test('BE: 重叠读取 - 相同数据不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntBE(0, 2);
  const r2 = buf.readUIntBE(1, 2);
  return r1 === 0x1234 && r2 === 0x3456 && r1 !== r2;
});

test('LE: 重叠读取 - 相同数据不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntLE(0, 2);
  const r2 = buf.readUIntLE(1, 2);
  return r1 === 0x3412 && r2 === 0x5634 && r1 !== r2;
});

test('BE: 重叠读取 - 不同 byteLength', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntBE(0, 2);
  const r2 = buf.readUIntBE(0, 3);
  const r3 = buf.readUIntBE(0, 4);
  return r1 !== r2 && r2 !== r3 && r1 !== r3;
});

test('LE: 重叠读取 - 不同 byteLength', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const r1 = buf.readUIntLE(0, 2);
  const r2 = buf.readUIntLE(0, 3);
  const r3 = buf.readUIntLE(0, 4);
  return r1 !== r2 && r2 !== r3 && r1 !== r3;
});

// === 数学运算验证 ===

test('BE: 加法验证 - 2字节', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUIntBE(100, 0, 2);
  buf2.writeUIntBE(200, 0, 2);
  return buf1.readUIntBE(0, 2) + buf2.readUIntBE(0, 2) === 300;
});

test('LE: 加法验证 - 2字节', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUIntLE(100, 0, 2);
  buf2.writeUIntLE(200, 0, 2);
  return buf1.readUIntLE(0, 2) + buf2.readUIntLE(0, 2) === 300;
});

test('BE: 乘法验证 - 3字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntBE(1000, 0, 3);
  return buf.readUIntBE(0, 3) * 2 === 2000;
});

test('LE: 乘法验证 - 3字节', () => {
  const buf = Buffer.alloc(3);
  buf.writeUIntLE(1000, 0, 3);
  return buf.readUIntLE(0, 3) * 2 === 2000;
});

// === 位移操作验证 ===

test('BE: 左移验证 - 2字节', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUIntBE(0, 2) << 8 === 256;
});

test('LE: 左移验证 - 2字节', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUIntLE(0, 2) << 8 === 256;
});

test('BE: 右移验证 - 2字节', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUIntBE(0, 2) >> 8 === 1;
});

test('LE: 右移验证 - 2字节', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUIntLE(0, 2) >> 8 === 1;
});

// === 比较操作测试 ===

test('BE: 大于比较', () => {
  const buf1 = Buffer.from([0x00, 0x02]);
  const buf2 = Buffer.from([0x00, 0x01]);
  return buf1.readUIntBE(0, 2) > buf2.readUIntBE(0, 2);
});

test('LE: 大于比较', () => {
  const buf1 = Buffer.from([0x02, 0x00]);
  const buf2 = Buffer.from([0x01, 0x00]);
  return buf1.readUIntLE(0, 2) > buf2.readUIntLE(0, 2);
});

test('BE: 等于比较', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x12, 0x34]);
  return buf1.readUIntBE(0, 2) === buf2.readUIntBE(0, 2);
});

test('LE: 等于比较', () => {
  const buf1 = Buffer.from([0x34, 0x12]);
  const buf2 = Buffer.from([0x34, 0x12]);
  return buf1.readUIntLE(0, 2) === buf2.readUIntLE(0, 2);
});

// === 字符串转换测试 ===

test('BE: toString 转换', () => {
  const buf = Buffer.from([0x00, 0x7B]);
  const value = buf.readUIntBE(0, 2);
  return value.toString() === '123';
});

test('LE: toString 转换', () => {
  const buf = Buffer.from([0x7B, 0x00]);
  const value = buf.readUIntLE(0, 2);
  return value.toString() === '123';
});

test('BE: toString(16) 十六进制转换', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const value = buf.readUIntBE(0, 2);
  return value.toString(16) === '1234';
});

test('LE: toString(16) 十六进制转换', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const value = buf.readUIntLE(0, 2);
  return value.toString(16) === '1234';
});

// === 数组操作测试 ===

test('BE: 存入数组', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const arr = [];
  arr.push(buf.readUIntBE(0, 1));
  arr.push(buf.readUIntBE(1, 1));
  arr.push(buf.readUIntBE(2, 1));
  return arr[0] === 0x12 && arr[1] === 0x34 && arr[2] === 0x56;
});

test('LE: 存入数组', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const arr = [];
  arr.push(buf.readUIntLE(0, 1));
  arr.push(buf.readUIntLE(1, 1));
  arr.push(buf.readUIntLE(2, 1));
  return arr[0] === 0x12 && arr[1] === 0x34 && arr[2] === 0x56;
});

// === 对象属性测试 ===

test('BE: 作为对象属性', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const obj = {
    value: buf.readUIntBE(0, 2)
  };
  return obj.value === 0x1234;
});

test('LE: 作为对象属性', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const obj = {
    value: buf.readUIntLE(0, 2)
  };
  return obj.value === 0x1234;
});

// === JSON 序列化测试 ===

test('BE: JSON 序列化', () => {
  const buf = Buffer.from([0x00, 0x7B]);
  const value = buf.readUIntBE(0, 2);
  const json = JSON.stringify({ value });
  return json === '{"value":123}';
});

test('LE: JSON 序列化', () => {
  const buf = Buffer.from([0x7B, 0x00]);
  const value = buf.readUIntLE(0, 2);
  const json = JSON.stringify({ value });
  return json === '{"value":123}';
});

// === 条件判断测试 ===

test('BE: if 条件判断', () => {
  const buf = Buffer.from([0x00, 0x00]);
  if (buf.readUIntBE(0, 2) === 0) {
    return true;
  }
  return false;
});

test('LE: if 条件判断', () => {
  const buf = Buffer.from([0x00, 0x00]);
  if (buf.readUIntLE(0, 2) === 0) {
    return true;
  }
  return false;
});

test('BE: 三元运算符', () => {
  const buf = Buffer.from([0x00, 0x01]);
  const result = buf.readUIntBE(0, 2) > 0 ? 'positive' : 'zero';
  return result === 'positive';
});

test('LE: 三元运算符', () => {
  const buf = Buffer.from([0x01, 0x00]);
  const result = buf.readUIntLE(0, 2) > 0 ? 'positive' : 'zero';
  return result === 'positive';
});

// === 循环中使用测试 ===

test('BE: for 循环累加', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00, 0x03]);
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += buf.readUIntBE(i * 2, 2);
  }
  return sum === 6;
});

test('LE: for 循环累加', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00, 0x03, 0x00]);
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    sum += buf.readUIntLE(i * 2, 2);
  }
  return sum === 6;
});

// === 函数参数传递测试 ===

test('BE: 作为函数参数', () => {
  const buf = Buffer.from([0x00, 0x0A]);
  function double(n) {
    return n * 2;
  }
  return double(buf.readUIntBE(0, 2)) === 20;
});

test('LE: 作为函数参数', () => {
  const buf = Buffer.from([0x0A, 0x00]);
  function double(n) {
    return n * 2;
  }
  return double(buf.readUIntLE(0, 2)) === 20;
});

// === 函数返回值测试 ===

test('BE: 作为函数返回值', () => {
  const buf = Buffer.from([0x00, 0x64]);
  function getValue() {
    return buf.readUIntBE(0, 2);
  }
  return getValue() === 100;
});

test('LE: 作为函数返回值', () => {
  const buf = Buffer.from([0x64, 0x00]);
  function getValue() {
    return buf.readUIntLE(0, 2);
  }
  return getValue() === 100;
});

// === 解构赋值测试 ===

test('BE: 数组解构', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x02]);
  const [a, b] = [buf.readUIntBE(0, 2), buf.readUIntBE(2, 2)];
  return a === 1 && b === 2;
});

test('LE: 数组解构', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00]);
  const [a, b] = [buf.readUIntLE(0, 2), buf.readUIntLE(2, 2)];
  return a === 1 && b === 2;
});

// === 扩展运算符测试 ===

test('BE: 扩展到数组', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x02, 0x00, 0x03]);
  const values = [
    buf.readUIntBE(0, 2),
    buf.readUIntBE(2, 2),
    buf.readUIntBE(4, 2)
  ];
  return Math.max(...values) === 3;
});

test('LE: 扩展到数组', () => {
  const buf = Buffer.from([0x01, 0x00, 0x02, 0x00, 0x03, 0x00]);
  const values = [
    buf.readUIntLE(0, 2),
    buf.readUIntLE(2, 2),
    buf.readUIntLE(4, 2)
  ];
  return Math.max(...values) === 3;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
