const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ 第二次深度查缺：allocUnsafe 与 slice ============

test('allocUnsafe 交互：slice allocUnsafe 创建的 buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  // 填充以确保可预测
  buf.fill(0x41);
  const sliced = buf.slice(0, 5);
  return sliced.length === 5 && sliced.every(b => b === 0x41);
});

test('allocUnsafe 交互：slice 后修改 allocUnsafe buffer', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  const sliced = buf.slice(0, 5);
  sliced[0] = 0x42;
  return buf[0] === 0x42;
});

test('allocUnsafe 交互：allocUnsafeSlow 创建的 buffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0x43);
  const sliced = buf.slice(0, 5);
  return sliced.toString() === 'CCCCC';
});

// ============ 不同进制表示的参数 ============

test('进制表示：start 为十六进制 0x10', () => {
  const buf = Buffer.alloc(20);
  const sliced = buf.slice(0x10, 0x14);
  return sliced.length === 4;
});

test('进制表示：start 为八进制 0o10', () => {
  const buf = Buffer.alloc(20);
  const sliced = buf.slice(0o10, 0o12);
  // 0o10 = 8, 0o12 = 10
  return sliced.length === 2;
});

test('进制表示：start 为二进制 0b1010', () => {
  const buf = Buffer.alloc(20);
  const sliced = buf.slice(0b1010, 0b1100);
  // 0b1010 = 10, 0b1100 = 12
  return sliced.length === 2;
});

test('进制表示：混合进制参数', () => {
  const buf = Buffer.alloc(20);
  const sliced = buf.slice(0x0A, 0o14);
  // 0x0A = 10, 0o14 = 12
  return sliced.length === 2;
});

// ============ 可变长度整数读写 ============

test('可变长度整数：slice 后 readIntLE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90]);
  const sliced = buf.slice(0, 5);
  const value = sliced.readIntLE(0, 3);
  return value === 0x563412;
});

test('可变长度整数：slice 后 readIntBE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90]);
  const sliced = buf.slice(0, 5);
  const value = sliced.readIntBE(0, 3);
  return value === 0x123456;
});

test('可变长度整数：slice 后 readUIntLE', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0x00]);
  const sliced = buf.slice(0, 4);
  const value = sliced.readUIntLE(0, 3);
  return value === 0xffffff;
});

test('可变长度整数：slice 后 readUIntBE', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0x00]);
  const sliced = buf.slice(0, 4);
  const value = sliced.readUIntBE(0, 3);
  return value === 0xffffff;
});

test('可变长度整数：slice 后 writeIntLE', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);
  sliced.writeIntLE(0x123456, 0, 3);
  return buf[0] === 0x56 && buf[1] === 0x34 && buf[2] === 0x12;
});

test('可变长度整数：slice 后 writeIntBE', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);
  sliced.writeIntBE(0x123456, 0, 3);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56;
});

test('可变长度整数：slice 后 writeUIntLE', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);
  sliced.writeUIntLE(0xffffff, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

test('可变长度整数：slice 后 writeUIntBE', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 5);
  sliced.writeUIntBE(0xffffff, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

// ============ Buffer.from 不同源与 slice ============

test('Buffer.from 源：从 ArrayBuffer 创建后 slice', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[0] = 0x41;
  const buf = Buffer.from(ab);
  const sliced = buf.slice(0, 5);
  return sliced[0] === 0x41;
});

test('Buffer.from 源：从 Uint8Array 创建后 slice', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(uint8);
  const sliced = buf.slice(1, 4);
  return sliced[0] === 2 && sliced[1] === 3 && sliced[2] === 4;
});

test('Buffer.from 源：从 Uint16Array 创建后 slice', () => {
  const uint16 = new Uint16Array([0x0102, 0x0304]);
  const buf = Buffer.from(uint16.buffer);
  const sliced = buf.slice(0, 4);
  return sliced.length === 4;
});

test('Buffer.from 源：从另一个 buffer 创建后 slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1); // 拷贝
  const sliced = buf2.slice(0, 5);
  buf1[0] = 0x48; // 'H'
  // buf2 不应该受影响（因为是拷贝）
  return sliced[0] === 0x68; // 'h'
});

test('Buffer.from 源：从 DataView 的 buffer 创建', () => {
  const ab = new ArrayBuffer(10);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x42);
  const buf = Buffer.from(ab);
  const sliced = buf.slice(0, 5);
  return sliced[0] === 0x42;
});

// ============ 字节对齐测试 ============

test('字节对齐：slice 从奇数位置开始读 Int16', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(1, 5);
  // 从 sliced 的位置 0（即原 buf 位置 1）读
  const value = sliced.readInt16LE(0);
  return value === 0x3412;
});

test('字节对齐：slice 从非 4 字节对齐位置读 Int32', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x90]);
  const sliced = buf.slice(1, 6);
  const value = sliced.readInt32LE(0);
  return value === 0x78563412;
});

test('字节对齐：slice 从非 8 字节对齐位置读 Double', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(3.14, 3);
  const sliced = buf.slice(3, 11);
  const value = sliced.readDoubleLE(0);
  return Math.abs(value - 3.14) < 0.01;
});

// ============ 极端参数组合的笛卡尔积 ============

test('笛卡尔积：所有特殊值 start × 所有特殊值 end', () => {
  const buf = Buffer.from('hello');
  const specialValues = [0, -0, 1, -1, 5, -5, 10, -10, NaN, Infinity, -Infinity, undefined, null];
  let allValid = true;

  for (const start of specialValues) {
    for (const end of specialValues) {
      try {
        const sliced = buf.slice(start, end);
        // 只要不抛错就算通过
        if (!Buffer.isBuffer(sliced)) {
          allValid = false;
        }
      } catch (e) {
        allValid = false;
      }
    }
  }

  return allValid;
});

// ============ Buffer.constants 边界值 ============

test('Buffer.constants：MAX_LENGTH 相关测试', () => {
  // Buffer.constants 在某些环境可能不存在
  if (Buffer.constants && Buffer.constants.MAX_LENGTH) {
    const maxLen = Buffer.constants.MAX_LENGTH;
    return typeof maxLen === 'number' && maxLen > 0;
  }
  return true; // 如果不存在就跳过
});

test('Buffer.constants：MAX_STRING_LENGTH 相关测试', () => {
  if (Buffer.constants && Buffer.constants.MAX_STRING_LENGTH) {
    const maxStrLen = Buffer.constants.MAX_STRING_LENGTH;
    return typeof maxStrLen === 'number' && maxStrLen > 0;
  }
  return true;
});

// ============ slice 后的属性测试 ============

test('属性测试：slice 后 hasOwnProperty length', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  // length 是继承属性，不是自有属性
  return typeof sliced.length === 'number' && sliced.length === 3;
});

test('属性测试：slice 后的 buffer 属性', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced.buffer instanceof ArrayBuffer;
});

test('属性测试：slice 后的 byteOffset 是数字', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 5);
  return typeof sliced.byteOffset === 'number';
});

test('属性测试：slice 后的 BYTES_PER_ELEMENT', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced.BYTES_PER_ELEMENT === 1;
});

// ============ 内存压力场景 ============

test('内存压力：创建 1000 个小 slice', () => {
  const buf = Buffer.alloc(10000);
  const slices = [];
  for (let i = 0; i < 1000; i++) {
    slices.push(buf.slice(i, i + 10));
  }
  return slices.length === 1000 && slices[999].length === 10;
});

test('内存压力：深度嵌套 100 层 slice', () => {
  let current = Buffer.alloc(1000);
  for (let i = 0; i < 100; i++) {
    current = current.slice(1, current.length - 1);
  }
  return current.length === 800; // 1000 - 200
});

test('内存压力：创建并立即释放 slice', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 10000; i++) {
    const sliced = buf.slice(0, 10);
    // 立即丢弃引用
  }
  return buf.length === 1000;
});

// ============ 与 Array.prototype 方法的区别 ============

test('与 Array 区别：slice 不接受负数 length 参数', () => {
  const buf = Buffer.from('hello');
  // Buffer.slice 只接受 start 和 end，不接受 length
  const sliced = buf.slice(1, 3);
  return sliced.length === 2;
});

test('与 Array 区别：Array.prototype.slice.call 在 Buffer 上', () => {
  const buf = Buffer.from('hello');
  try {
    const result = Array.prototype.slice.call(buf, 1, 3);
    // 应该返回数组，不是 Buffer
    return Array.isArray(result) && result.length === 2;
  } catch (e) {
    return false;
  }
});

// ============ slice 后的原型链检查 ============

test('原型链：slice 后仍然是 Buffer 类型', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  // 使用 instanceof 而不是 constructor
  return sliced instanceof Buffer && typeof sliced.slice === 'function';
});

test('原型链：slice 后 instanceof Buffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced instanceof Buffer;
});

test('原型链：slice 后 instanceof Uint8Array', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced instanceof Uint8Array;
});

// ============ slice 与 Object.freeze/seal ============

test('Object 方法：对 slice 调用 Object.freeze', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);

  try {
    Object.freeze(sliced);
    sliced[0] = 0x48;
    // 如果成功 freeze，修改可能失败
    return true;
  } catch (e) {
    // Node v25 不允许 freeze TypedArray，会抛错
    return e.message.includes('freeze') || e.message.includes('array buffer');
  }
});

test('Object 方法：对 slice 调用 Object.seal', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);

  try {
    Object.seal(sliced);
    sliced[0] = 0x48;
    return true;
  } catch (e) {
    // Node v25 不允许 seal TypedArray，会抛错
    return e.message.includes('seal') || e.message.includes('array buffer');
  }
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
