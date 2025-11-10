// buf.byteOffset - Complete Tests
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

// ========== Part 1: 基本创建方式（确定行为） ==========

test('新分配的 buffer offset 为 0', () => {
  const buf = Buffer.alloc(10);
  return buf.byteOffset === 0;
});

test('从 ArrayBuffer 创建 - 无 offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.byteOffset === 0;
});

test('从 ArrayBuffer 创建 - 有 offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  return buf.byteOffset === 3;
});

test('从 ArrayBuffer 创建 - 有 offset 和 length', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3, 5);
  return buf.byteOffset === 3;
});

test('从字符串创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从数组创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Buffer 创建 - byteOffset 是数字类型（不继承原 offset）', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 3);
  const buf2 = Buffer.from(buf1);
  // Buffer.from(buffer) 创建新 Buffer，不继承 byteOffset
  return typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0 && buf2.byteOffset !== buf1.byteOffset;
});

test('从 Buffer 创建（有 offset）- 创建新 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 3, 5);
  const buf2 = Buffer.from(buf1);
  // Buffer.from(buffer) 创建新 Buffer，不继承 byteOffset
  return typeof buf2.byteOffset === 'number' && buf2.byteOffset >= 0;
});

// ========== Part 2: slice 和 subarray ==========

test('slice 后 offset 变化', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5);
  return slice.byteOffset === buf.byteOffset + 5;
});

test('slice 后 offset 变化（有 end）', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(3, 7);
  return slice.byteOffset === buf.byteOffset + 3;
});

test('slice 负数索引 - offset 计算正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-3);
  return slice.byteOffset === buf.byteOffset + 7;
});

test('slice 负数索引（start 和 end）- offset 计算正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(-7, -3);
  return slice.byteOffset === buf.byteOffset + 3;
});

test('subarray 后 offset 变化', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 7);
  return sub.byteOffset === buf.byteOffset + 3;
});

test('subarray 负数索引 - offset 计算正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-3);
  return sub.byteOffset === buf.byteOffset + 7;
});

test('subarray 负数索引（start 和 end）- offset 计算正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(-7, -3);
  return sub.byteOffset === buf.byteOffset + 3;
});

// ========== Part 3: 多层 slice/subarray ==========

test('多层 slice - offset 累积', () => {
  const buf = Buffer.alloc(10);
  const slice1 = buf.slice(2);
  const slice2 = slice1.slice(3);
  return slice2.byteOffset === buf.byteOffset + 2 + 3;
});

test('多层 subarray - offset 累积', () => {
  const buf = Buffer.alloc(10);
  const sub1 = buf.subarray(2);
  const sub2 = sub1.subarray(3);
  return sub2.byteOffset === buf.byteOffset + 2 + 3;
});

test('从有 offset 的 Buffer slice - offset 累积', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  const slice = buf.slice(2);
  return slice.byteOffset === 3 + 2;
});

test('从有 offset 的 Buffer subarray - offset 累积', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  const sub = buf.subarray(2);
  return sub.byteOffset === 3 + 2;
});

test('多层 slice（有 offset 的 Buffer）- offset 累积', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 3);
  const slice1 = buf.slice(2);
  const slice2 = slice1.slice(1);
  return slice2.byteOffset === 3 + 2 + 1;
});

// ========== Part 4: Buffer.concat ==========

test('Buffer.concat - byteOffset 是数字类型', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const concat = Buffer.concat([buf1, buf2]);
  return typeof concat.byteOffset === 'number' && concat.byteOffset >= 0;
});

test('Buffer.concat（空数组）- byteOffset 为 0', () => {
  const concat = Buffer.concat([]);
  return concat.byteOffset === 0;
});

test('Buffer.concat（有 offset 的 Buffer）- byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 3);
  const buf2 = Buffer.from('world');
  const concat = Buffer.concat([buf1, buf2]);
  return typeof concat.byteOffset === 'number' && concat.byteOffset >= 0;
});

// ========== Part 5: TypedArray 相关 ==========

test('从 Uint8Array 创建 - byteOffset 是数字类型（不继承）', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab, 3);
  const buf = Buffer.from(u8);
  // Buffer.from(TypedArray) 创建新 Buffer，不继承 TypedArray 的 byteOffset
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0 && buf.byteOffset !== u8.byteOffset;
});

test('从 Uint8Array 创建（有 offset）- byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab, 3, 5);
  const buf = Buffer.from(u8);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Uint16Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const u16 = new Uint16Array(ab, 4);
  const buf = Buffer.from(u16);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== Part 6: 边界情况 ==========

test('空 buffer 的 offset', () => {
  const buf = Buffer.alloc(0);
  return typeof buf.byteOffset === 'number' && buf.byteOffset === 0;
});

test('空 buffer（从 ArrayBuffer 创建）- offset 正确', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5, 0);
  return buf.byteOffset === 5;
});

test('offset 等于 ArrayBuffer 长度', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 10, 0);
  return buf.byteOffset === 10;
});

test('slice 空 buffer - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(10);
  return slice.byteOffset === buf.byteOffset + 10;
});

test('subarray 空 buffer - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(10);
  return sub.byteOffset === buf.byteOffset + 10;
});

// ========== Part 7: 属性特性 ==========

test('byteOffset 只读', () => {
  const buf = Buffer.alloc(5);
  const original = buf.byteOffset;
  try {
    buf.byteOffset = 100;
  } catch (e) {
    // 可能抛出错误或静默失败
  }
  return buf.byteOffset === original;
});

test('byteOffset 类型为 number', () => {
  const buf = Buffer.alloc(5);
  return typeof buf.byteOffset === 'number';
});

test('byteOffset 非负整数', () => {
  const buf = Buffer.alloc(5);
  return Number.isInteger(buf.byteOffset) && buf.byteOffset >= 0;
});

// ========== Part 8: 共享内存验证 ==========

test('slice 后修改原 buffer - byteOffset 不变但数据共享', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(1, 4);
  const originalOffset = slice.byteOffset;
  buf[2] = 99;
  return slice.byteOffset === originalOffset && slice[1] === 99;
});

test('subarray 后修改原 buffer - byteOffset 不变但数据共享', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const originalOffset = sub.byteOffset;
  buf[2] = 99;
  return sub.byteOffset === originalOffset && sub[1] === 99;
});

test('从 ArrayBuffer 创建的多个 Buffer - byteOffset 不同', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 5, 5);
  return buf1.byteOffset === 0 && buf2.byteOffset === 5;
});

test('从 ArrayBuffer 创建的多个 Buffer - 共享同一 buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf1 = Buffer.from(ab, 0, 5);
  const buf2 = Buffer.from(ab, 5, 5);
  return buf1.buffer === buf2.buffer && buf1.buffer === ab;
});

// ========== Part 9: 编码相关 ==========

test('从字符串（utf8）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('hello', 'utf8');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（hex）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('68656c6c6f', 'hex');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从字符串（base64）创建 - byteOffset 是数字类型', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== Part 10: 复杂场景 ==========

test('多层 slice 和 subarray 混合 - offset 累积正确', () => {
  const buf = Buffer.alloc(20);
  const slice1 = buf.slice(5);
  const sub1 = slice1.subarray(3);
  const slice2 = sub1.slice(2);
  return slice2.byteOffset === buf.byteOffset + 5 + 3 + 2;
});

test('从 TypedArray slice 创建的 Buffer - offset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const u8 = new Uint8Array(ab, 4);
  const buf = Buffer.from(u8);
  const slice = buf.slice(3);
  return typeof slice.byteOffset === 'number' && slice.byteOffset >= 0;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - 边界值', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 10);
  return buf.byteOffset === 0;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - 最大 offset', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 9, 1);
  return buf.byteOffset === 9;
});

test('Buffer.from(ArrayBuffer, byteOffset, length) - length 为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5, 0);
  return buf.byteOffset === 5 && buf.length === 0;
});

// ========== Part 11: 特殊场景 ==========

test('slice 起点等于终点 - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 5);
  return slice.byteOffset === buf.byteOffset + 5 && slice.length === 0;
});

test('subarray 起点等于终点 - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(5, 5);
  return sub.byteOffset === buf.byteOffset + 5 && sub.length === 0;
});

test('slice 起点大于终点 - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(7, 3);
  return slice.byteOffset === buf.byteOffset + 7 && slice.length === 0;
});

test('subarray 起点大于终点 - offset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(7, 3);
  // subarray 起点大于终点时，byteOffset 是起点
  return sub.byteOffset === buf.byteOffset + 7 && sub.length === 0;
});

test('从有 offset 的 Buffer slice 起点大于终点 - offset 正确', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 2);
  const slice = buf.slice(7, 3);
  return slice.byteOffset === buf.byteOffset + 7 && slice.length === 0;
});

// ========== Part 12: 其他 TypedArray 类型 ==========

test('从 Int8Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const i8 = new Int8Array(ab, 4);
  const buf = Buffer.from(i8);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Int16Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(20);
  const i16 = new Int16Array(ab, 4);
  const buf = Buffer.from(i16);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Uint32Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(40);
  const u32 = new Uint32Array(ab, 8);
  const buf = Buffer.from(u32);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Int32Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(40);
  const i32 = new Int32Array(ab, 8);
  const buf = Buffer.from(i32);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Float32Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(40);
  const f32 = new Float32Array(ab, 8);
  const buf = Buffer.from(f32);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('从 Float64Array 创建 - byteOffset 是数字类型', () => {
  const ab = new ArrayBuffer(80);
  const f64 = new Float64Array(ab, 16);
  const buf = Buffer.from(f64);
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== Part 13: 长度边界情况 ==========

test('长度为 1 的 buffer - byteOffset 为 0', () => {
  const buf = Buffer.alloc(1);
  return buf.byteOffset === 0;
});

test('长度为 1 的 buffer slice - offset 正确', () => {
  const buf = Buffer.alloc(1);
  const slice = buf.slice(0);
  return slice.byteOffset === buf.byteOffset + 0;
});

test('极大长度的 ArrayBuffer - byteOffset 正确', () => {
  const ab = new ArrayBuffer(1000000);
  const buf = Buffer.from(ab, 500000);
  return buf.byteOffset === 500000;
});

test('极大长度的 ArrayBuffer slice - offset 累积正确', () => {
  const ab = new ArrayBuffer(1000000);
  const buf = Buffer.from(ab, 100000);
  const slice = buf.slice(200000);
  return slice.byteOffset === 100000 + 200000;
});

// ========== Part 14: 错误路径 ==========

test('Buffer.from(ArrayBuffer, 越界 offset) - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, 15);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('Buffer.from(ArrayBuffer, offset, 越界 length) - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    Buffer.from(ab, 5, 10); // offset=5, length=10, 总共需要15，但只有10
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('length') || e.message.includes('bounds') || e.message.includes('range');
  }
});

test('Buffer.from(ArrayBuffer, 负数 offset) - 抛出错误', () => {
  try {
    const ab = new ArrayBuffer(10);
    const buf = Buffer.from(ab, -1);
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('bounds') || e.message.includes('range');
  }
});

// ========== Part 15: 边界值验证 ==========

test('Buffer.from(ArrayBuffer, 0, 0) - byteOffset 为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 0);
  return buf.byteOffset === 0 && buf.length === 0;
});

test('Buffer.from(ArrayBuffer, offset=length, length=0) - byteOffset 正确', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 10, 0);
  return buf.byteOffset === 10 && buf.length === 0;
});

test('slice(0, 0) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(0, 0);
  return slice.byteOffset === buf.byteOffset + 0 && slice.length === 0;
});

test('subarray(0, 0) - byteOffset 正确', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(0, 0);
  return sub.byteOffset === buf.byteOffset + 0 && sub.length === 0;
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
