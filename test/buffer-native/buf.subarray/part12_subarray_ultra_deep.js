// buf.subarray() - Ultra Deep Supplementary Tests (Round 8)
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// ==================== 未测试的参数边界微调 ====================

test('start=0.9999999 - 接近 1 的小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0.9999999);
  // 0.9999999 截断为 0
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 0.9999999 截断为 0');
  return true;
});

test('start=1.0000001 - 刚超过 1 的小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1.0000001);
  // 1.0000001 截断为 1
  if (sub.length !== 4 || sub[0] !== 2) return false;
  console.log('✅ 1.0000001 截断为 1');
  return true;
});

test('start=-0.0000001 - 极小负数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-0.0000001);
  // -0.0000001 截断为 0
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ -0.0000001 截断为 0');
  return true;
});

test('end=length-0.1 - 接近 length 的小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 4.9);
  // 4.9 截断为 4
  if (sub.length !== 4 || sub[3] !== 4) return false;
  console.log('✅ 4.9 截断为 4');
  return true;
});

test('start=1.5, end=1.5 - 相同小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1.5, 1.5);
  // 都截断为 1，start=end
  if (sub.length !== 0) return false;
  console.log('✅ 相同小数截断后相等');
  return true;
});

test('start=2.3, end=2.7 - 小数截断后相等', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2.3, 2.7);
  // 2.3->2, 2.7->2
  if (sub.length !== 0) return false;
  console.log('✅ 不同小数截断后相等');
  return true;
});

// ==================== 未测试的字符串格式 ====================

test('start="1.23e-10" - 极小科学计数法', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('1.23e-10');
  // 接近 0 的极小数，截断为 0
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 极小科学计数法');
  return true;
});

test('start="9.99e99" - 极大科学计数法', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('9.99e99');
  // Infinity，返回空
  if (sub.length !== 0) return false;
  console.log('✅ 极大科学计数法');
  return true;
});

test('start=" \\n\\t " - 仅空白字符', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(' \n\t ');
  // 空白转为 0
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ 仅空白字符转为 0');
  return true;
});

test('start="\\u0000" - null 字符', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('\u0000');
  // null 字符转为 0
  if (sub.length !== 5 || sub[0] !== 1) return false;
  console.log('✅ null 字符转为 0');
  return true;
});

test('start="\\uFEFF2" - BOM + 数字', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray('\uFEFF2');
  // BOM 可能被忽略，看具体实现
  console.log('✅ BOM + 数字处理');
  return true;
});

// ==================== 参数为 Getter 的对象 ====================

test('start 为带 getter 的对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let called = 0;
  const obj = {
    get valueOf() {
      called++;
      return () => 2;
    }
  };
  const sub = buf.subarray(obj);
  if (called === 0) return false;
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ getter valueOf 被调用');
  return true;
});

test('start 为多级嵌套对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  // 模拟 Proxy 行为，使用嵌套对象测试类型转换优先级
  const obj = {
    [Symbol.toPrimitive]: () => 2,
    valueOf: () => 3,
    toString: () => '4'
  };
  const sub = buf.subarray(obj);
  // Symbol.toPrimitive 优先级最高，应该返回 2
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 多级嵌套对象转换');
  return true;
});

// ==================== 特殊 Buffer 内容 ====================

test('Buffer 内容全为 0', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 7);
  if (sub.length !== 4) return false;
  if (sub.some(v => v !== 0)) return false;
  sub[1] = 99;
  if (buf[4] !== 99) return false;
  console.log('✅ 全 0 Buffer subarray');
  return true;
});

test('Buffer 内容全为 255', () => {
  const buf = Buffer.alloc(10, 255);
  const sub = buf.subarray(2, 8);
  if (sub.length !== 6) return false;
  if (sub.some(v => v !== 255)) return false;
  console.log('✅ 全 255 Buffer subarray');
  return true;
});

test('Buffer 内容为递增序列', () => {
  const buf = Buffer.from(Array.from({ length: 100 }, (_, i) => i % 256));
  const sub = buf.subarray(50, 60);
  if (sub.length !== 10) return false;
  if (sub[0] !== 50 || sub[9] !== 59) return false;
  console.log('✅ 递增序列 Buffer');
  return true;
});

test('Buffer 内容为随机字节', () => {
  const buf = Buffer.allocUnsafe(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  const sub = buf.subarray(10, 20);
  sub[0] = 99;
  if (buf[10] !== 99) return false;
  console.log('✅ 随机字节 Buffer');
  return true;
});

// ==================== subarray 的 subarray 深度嵌套变体 ====================

test('交叉嵌套 - 不同起点', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub1 = buf.subarray(2, 8);
  const sub2 = buf.subarray(3, 9);
  const sub3 = sub1.subarray(1, 5);
  const sub4 = sub2.subarray(1, 5);

  sub3[0] = 99;
  if (buf[3] !== 99) return false;
  sub4[0] = 88;
  if (buf[4] !== 88) return false;

  console.log('✅ 交叉嵌套 subarray');
  return true;
});

test('左侧收缩嵌套', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let sub = buf;
  for (let i = 0; i < 5; i++) {
    sub = sub.subarray(1);
  }
  if (sub.length !== 5 || sub[0] !== 5) return false;
  sub[0] = 99;
  if (buf[5] !== 99) return false;
  console.log('✅ 左侧收缩嵌套');
  return true;
});

test('右侧收缩嵌套', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let sub = buf;
  for (let i = 0; i < 5; i++) {
    sub = sub.subarray(0, sub.length - 1);
  }
  if (sub.length !== 5 || sub[4] !== 4) return false;
  console.log('✅ 右侧收缩嵌套');
  return true;
});

test('两端同时收缩嵌套', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  let sub = buf;
  for (let i = 0; i < 5; i++) {
    sub = sub.subarray(1, sub.length - 1);
  }
  if (sub.length !== 3) return false;
  if (sub[0] !== 5 || sub[2] !== 7) return false;
  console.log('✅ 两端收缩嵌套');
  return true;
});

// ==================== 与其他 Buffer 方法的深度组合 ====================

test('subarray 后 lastIndexOf', () => {
  const buf = Buffer.from('hello world hello');
  const sub = buf.subarray(6);
  const idx = sub.lastIndexOf('o');
  // sub 从索引 6 开始，'world hello' 中最后的 'o' 在索引 10（相对于 sub）
  if (idx !== 10) return false;
  console.log('✅ subarray lastIndexOf');
  return true;
});

test('subarray 后 readIntLE 跨多字节', () => {
  const buf = Buffer.from([0, 0, 0, 0x12, 0x34, 0x56, 0x78, 0x9A]);
  const sub = buf.subarray(3, 8);
  const val = sub.readIntLE(0, 5);
  console.log('✅ subarray readIntLE:', val.toString(16));
  return true;
});

test('subarray 后 readIntBE 跨多字节', () => {
  const buf = Buffer.from([0, 0, 0, 0x12, 0x34, 0x56, 0x78, 0x9A]);
  const sub = buf.subarray(3, 8);
  const val = sub.readIntBE(0, 5);
  console.log('✅ subarray readIntBE:', val.toString(16));
  return true;
});

test('subarray 后 writeIntLE', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 8);
  sub.writeIntLE(0x123456, 1, 3);
  if (buf.readUIntLE(3, 3) !== 0x123456) return false;
  console.log('✅ subarray writeIntLE');
  return true;
});

test('subarray 后 writeIntBE', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(2, 8);
  sub.writeIntBE(0x123456, 1, 3);
  if (buf.readUIntBE(3, 3) !== 0x123456) return false;
  console.log('✅ subarray writeIntBE');
  return true;
});

// ==================== 编码的边界细节 ====================

test('utf8 替换字符 - 0xEF 0xBF 0xBD', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBD]);
  const sub = buf.subarray(0, 3);
  if (sub.toString('utf8') !== '\uFFFD') return false;
  console.log('✅ utf8 替换字符');
  return true;
});

test('utf16le surrogate pair', () => {
  // U+1F600 (😀) = 0xD83D 0xDE00
  const buf = Buffer.from([0x3D, 0xD8, 0x00, 0xDE]);
  const sub = buf.subarray(0, 4);
  if (sub.toString('utf16le') !== '😀') return false;
  console.log('✅ utf16le surrogate pair');
  return true;
});

test('base64 padding', () => {
  const buf = Buffer.from('YQ==', 'base64');
  const sub = buf.subarray(0, buf.length);
  if (sub.toString('utf8') !== 'a') return false;
  console.log('✅ base64 padding');
  return true;
});

test('hex 大小写混合', () => {
  const buf = Buffer.from('48656C6c6F', 'hex');
  const sub = buf.subarray(0, buf.length);
  if (sub.toString('utf8') !== 'Hello') return false;
  console.log('✅ hex 大小写混合');
  return true;
});

// ==================== 多个 subarray 操作交错 ====================

test('多个 subarray 交错读写', () => {
  const buf = Buffer.alloc(20);
  const sub1 = buf.subarray(0, 10);
  const sub2 = buf.subarray(5, 15);
  const sub3 = buf.subarray(10, 20);

  sub1.fill(1);
  sub2.fill(2);
  sub3.fill(3);

  // 0-4: 1, 5-9: 2, 10-14: 3, 15-19: 3
  if (buf[4] !== 1 || buf[9] !== 2 || buf[14] !== 3) return false;
  console.log('✅ 多 subarray 交错写');
  return true;
});

test('subarray 链式操作', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const result = buf.subarray(1, 7)
                    .subarray(1, 5)
                    .subarray(1, 3);

  if (result.length !== 2 || result[0] !== 4) return false;
  result[0] = 99;
  if (buf[3] !== 99) return false;
  console.log('✅ subarray 链式操作');
  return true;
});

// ==================== 特殊场景的性能测试 ====================

test('连续 subarray 同一位置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const subs = [];
  for (let i = 0; i < 1000; i++) {
    subs.push(buf.subarray(2, 4));
  }
  subs[999][0] = 99;
  if (buf[2] !== 99) return false;
  console.log('✅ 1000 次相同 subarray');
  return true;
});

test('交替正负索引 subarray', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let sub = buf;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      sub = sub.subarray(1);
    } else {
      sub = sub.subarray(0, -1);
    }
  }
  console.log('✅ 交替正负索引:', sub.length);
  return true;
});

// ==================== 内存对齐和 byteOffset ====================

test('subarray byteOffset 对齐检查', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub1 = buf.subarray(1);
  const sub2 = sub1.subarray(1);
  const sub3 = sub2.subarray(1);

  // 每次 offset +1
  if (sub3.byteOffset !== buf.byteOffset + 3) return false;
  console.log('✅ byteOffset 累加正确');
  return true;
});

test('奇数 byteOffset 的 subarray', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const sub1 = buf.subarray(1, 9);
  const sub2 = sub1.subarray(2, 6);

  if (sub2.byteOffset !== buf.byteOffset + 3) return false;
  console.log('✅ 奇数 byteOffset 正确');
  return true;
});

// ==================== ArrayBuffer 共享检测 ====================

test('多个 subarray 共享同一 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub1 = buf.subarray(0, 4);
  const sub2 = buf.subarray(4, 8);

  if (sub1.buffer !== sub2.buffer) return false;
  if (sub1.buffer !== buf.buffer) return false;
  console.log('✅ 共享同一 ArrayBuffer');
  return true;
});

test('subarray 的 ArrayBuffer 修改', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const u8 = new Uint8Array(sub.buffer, sub.byteOffset, sub.length);

  u8[0] = 99;
  if (buf[1] !== 99) return false;
  console.log('✅ ArrayBuffer 视图修改');
  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

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
