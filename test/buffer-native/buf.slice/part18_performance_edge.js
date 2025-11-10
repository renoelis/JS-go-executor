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

// ============ 大量连续 slice 操作 ============

test('批量操作：连续创建 1000 个 slice', () => {
  const buf = Buffer.from('hello world');
  const slices = [];
  for (let i = 0; i < 1000; i++) {
    slices.push(buf.slice(0, 5));
  }
  return slices.length === 1000 && slices[0].toString() === 'hello';
});

test('批量操作：1000 个不同范围的 slice', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i % 256;
  }
  const slices = [];
  for (let i = 0; i < 1000; i++) {
    const start = i * 10;
    const end = start + 10;
    slices.push(buf.slice(start, end));
  }
  return slices[0][0] === 0 && slices[999][0] === (9990 % 256);
});

test('批量操作：slice 后批量修改', () => {
  const buf = Buffer.alloc(1000);
  const slices = [];
  for (let i = 0; i < 100; i++) {
    slices.push(buf.slice(i * 10, i * 10 + 10));
  }
  for (let i = 0; i < slices.length; i++) {
    slices[i][0] = i;
  }
  return buf[0] === 0 && buf[990] === 99;
});

// ============ 零长度 slice 的各种场景 ============

test('零长度：start === end 在开始位置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 0);
  return sliced.length === 0 && Buffer.isBuffer(sliced);
});

test('零长度：start === end 在中间位置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 1);
  return sliced.length === 0;
});

test('零长度：start === end 在末尾位置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(3, 3);
  return sliced.length === 0;
});

test('零长度：start > end 大范围差', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(10, 0);
  return sliced.length === 0;
});

test('零长度：负索引 start === end', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-1, -1);
  return sliced.length === 0;
});

test('零长度：slice 后尝试访问元素', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 1);
  return sliced[0] === undefined && sliced[-1] === undefined;
});

test('零长度：slice 后调用 toString', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 1);
  return sliced.toString() === '';
});

test('零长度：slice 后使用 fill', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 1);
  sliced.fill(99);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// ============ slice 参数的特殊数学值 ============

test('特殊数学值：start 为 -0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-0, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('特殊数学值：end 为 -0', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, -0);
  return sliced.length === 0;
});

test('特殊数学值：start 为 0.0001', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0.0001, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('特殊数学值：start 为 0.9999', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0.9999, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('特殊数学值：start 为 -0.9999', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-0.9999, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('特殊数学值：浮点数精度边界', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1.0000000001, 2.9999999999);
  return sliced.length === 1 && sliced[0] === 2;
});

// ============ slice 与特殊字符的交互 ============

test('特殊字符：包含 null 字节的 buffer', () => {
  const buf = Buffer.from([0x68, 0x00, 0x69]); // 'h\0i'
  const sliced = buf.slice(0, 3);
  return sliced.length === 3 && sliced[1] === 0;
});

test('特殊字符：全是 0xFF 的 buffer', () => {
  const buf = Buffer.alloc(5, 0xff);
  const sliced = buf.slice(1, 4);
  return sliced.length === 3 && sliced[0] === 0xff;
});

test('特殊字符：ASCII 控制字符', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]); // SOH, STX, ETX, EOT, ENQ
  const sliced = buf.slice(1, 4);
  return sliced.length === 3 && sliced[0] === 0x02;
});

test('特殊字符：DEL 字符 (0x7F)', () => {
  const buf = Buffer.from([0x61, 0x7f, 0x62]); // 'a\x7Fb'
  const sliced = buf.slice(0, 3);
  return sliced[1] === 0x7f;
});

// ============ slice 的交叉引用场景 ============

test('交叉引用：两个 slice 覆盖同一区域', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = buf.slice(1, 4);
  const slice2 = buf.slice(1, 4);
  slice1[0] = 99;
  return slice2[0] === 99;
});

test('交叉引用：两个 slice 部分重叠', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = buf.slice(0, 3);
  const slice2 = buf.slice(2, 5);
  slice1[2] = 99; // buf[2]
  return slice2[0] === 99;
});

test('交叉引用：多个 slice 形成完整覆盖', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = buf.slice(0, 2);
  const slice2 = buf.slice(2, 4);
  const slice3 = buf.slice(4, 5);
  slice1[0] = 10;
  slice2[0] = 30;
  slice3[0] = 50;
  return buf[0] === 10 && buf[2] === 30 && buf[4] === 50;
});

test('交叉引用：嵌套 slice 的交叉', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice1 = buf.slice(1, 4);
  const slice2 = slice1.slice(1, 2);
  slice2[0] = 99; // buf[2]
  return buf[2] === 99 && slice1[1] === 99;
});

// ============ slice 与边界对齐 ============

test('边界对齐：8 字节对齐的起始', () => {
  const buf = Buffer.alloc(16);
  buf[8] = 88;
  const sliced = buf.slice(8, 16);
  return sliced[0] === 88;
});

test('边界对齐：非对齐的起始和结束', () => {
  const buf = Buffer.alloc(20);
  buf[5] = 55;
  buf[13] = 77;
  const sliced = buf.slice(5, 14);
  return sliced[0] === 55 && sliced[8] === 77;
});

test('边界对齐：跨越多个对齐边界', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = i;
  }
  const sliced = buf.slice(7, 93);
  return sliced[0] === 7 && sliced[85] === 92;
});

// ============ slice 后的逐字节验证 ============

test('逐字节验证：slice 后每个字节独立可修改', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0]);
  const sliced = buf.slice(0, 5);
  for (let i = 0; i < 5; i++) {
    sliced[i] = i + 1;
  }
  return buf[0] === 1 && buf[4] === 5;
});

test('逐字节验证：slice 中间字节不影响两端', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  sliced[1] = 99; // buf[2]
  return buf[1] === 2 && buf[3] === 4;
});

test('逐字节验证：slice 两端字节不影响外部', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  sliced[0] = 11;
  sliced[2] = 33;
  return buf[0] === 1 && buf[4] === 5;
});

// ============ slice 与 Buffer.allocUnsafe 的交互 ============

test('allocUnsafe 交互：对 allocUnsafe 创建的 buffer 进行 slice', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.fill(0);
  buf[5] = 55;
  const sliced = buf.slice(5, 10);
  return sliced[0] === 55;
});

test('allocUnsafe 交互：slice 后初始化', () => {
  const buf = Buffer.allocUnsafe(10);
  const sliced = buf.slice(0, 10);
  sliced.fill(0);
  return buf[0] === 0 && buf[9] === 0;
});

// ============ slice 的链式操作验证 ============

test('链式操作：slice().slice().slice()', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(0, 11).slice(6, 11).slice(0, 5);
  return result.toString() === 'world';
});

test('链式操作：slice 后 toString 后 Buffer.from', () => {
  const buf = Buffer.from('hello');
  const str = buf.slice(0, 5).toString();
  const buf2 = Buffer.from(str);
  return buf2.equals(buf);
});

test('链式操作：slice 后 toJSON 后重建', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const json = sliced.toJSON();
  const buf2 = Buffer.from(json.data);
  return buf2.equals(sliced);
});

// ============ slice 与极端 buffer 大小 ============

test('极端大小：slice 1 字节的 buffer', () => {
  const buf = Buffer.from([99]);
  const sliced = buf.slice(0, 1);
  return sliced.length === 1 && sliced[0] === 99;
});

test('极端大小：从 1 字节 buffer 中 slice 0 字节', () => {
  const buf = Buffer.from([99]);
  const sliced = buf.slice(0, 0);
  return sliced.length === 0;
});

test('极端大小：10000 字节 buffer 的小 slice', () => {
  const buf = Buffer.alloc(10000);
  buf[5000] = 100;
  const sliced = buf.slice(5000, 5001);
  return sliced.length === 1 && sliced[0] === 100;
});

test('极端大小：10000 字节 buffer 的大 slice', () => {
  const buf = Buffer.alloc(10000);
  buf[0] = 1;
  buf[9999] = 2;
  const sliced = buf.slice(0, 10000);
  return sliced[0] === 1 && sliced[9999] === 2;
});

// ============ slice 参数的可选性验证 ============

test('参数可选性：只传入 start', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(2);
  return sliced.length === 3 && sliced[0] === 3;
});

test('参数可选性：不传任何参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice();
  return sliced.length === 5 && sliced[0] === 1;
});

test('参数可选性：传入 undefined 作为参数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(undefined, undefined);
  return sliced.length === 5;
});

// ============ slice 与内存释放（确保不会访问已释放内存）============

test('内存安全：slice 后原 buffer 不受 GC 影响（理论测试）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  // 理论上即使 buf 被 GC，sliced 仍应有效
  return sliced.length === 3 && sliced[0] === 2;
});

test('内存安全：多层 slice 的内存引用', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const s1 = buf.slice(0, 5);
  const s2 = s1.slice(1, 4);
  const s3 = s2.slice(0, 2);
  s3[0] = 99;
  return buf[1] === 99;
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
