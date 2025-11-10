// buf.compare() - Part 8: 边界极端场景和回归测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result.pass) {
      tests.push({ name, status: '✅', details: result.message });
    } else {
      tests.push({ name, status: '❌', details: result.message });
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ============================================================================
// 1. 参数边界值测试
// ============================================================================

test('targetStart=0, targetEnd=0 (空范围)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 0, 0, 0, 5);
  return {
    pass: result === 1, // source 比空 target 长
    message: `空 target vs 5 字节 source: ${result}`
  };
});

test('sourceStart=length, sourceEnd=length (源为空)', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 0, 5, 5, 5);
  return {
    pass: result === -1, // 空 source 比 target 短
    message: `5 字节 target vs 空 source: ${result}`
  };
});

test('所有索引都为 0（两个空 buffer）', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = buf1.compare(buf2, 0, 0, 0, 0);
  return {
    pass: result === 0,
    message: `两个空 buffer: ${result}`
  };
});

test('targetEnd = buffer.length (边界)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = buf1.compare(buf2, 0, 3, 0, 3);
  return {
    pass: result === 0,
    message: `targetEnd = length: ${result}`
  };
});

test('targetEnd = buffer.length + 1 (超出边界)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  try {
    buf1.compare(buf2, 0, 4, 0, 3);
    return { pass: false, message: '应该抛出 RangeError' };
  } catch (e) {
    return {
      pass: e.name === 'RangeError' && e.message.includes('targetEnd'),
      message: `正确抛出: ${e.name}`
    };
  }
});

// ============================================================================
// 2. 复杂参数组合
// ============================================================================

test('只传一个参数（target buffer）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `只传 target: ${result}`
  };
});

test('传两个参数（target + targetStart）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('lo');
  const result = buf1.compare(buf2, 3); // 比较 buf1 vs buf2[3:]，buf2 只有 2 字节，targetStart超出变成空范围
  return {
    pass: result === 1, // buf1 完整(5字节) vs buf2[3:](空)，所以 buf1 > target
    message: `target + targetStart: ${result}`
  };
});

test('传三个参数（target + targetStart + targetEnd）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.compare(buf2, 0, 3); // buf1 vs buf2[0:3]
  return {
    pass: result === 1, // 5 字节 vs 3 字节
    message: `传三个参数: ${result}`
  };
});

test('传四个参数（target + targetStart + targetEnd + sourceStart）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('ello');
  const result = buf1.compare(buf2, 0, 4, 1); // buf1[1:] vs buf2[0:4]
  return {
    pass: result === 0,
    message: `传四个参数: ${result}`
  };
});

// ============================================================================
// 3. 字节序和大小端测试
// ============================================================================

test('小端序 16 位整数（逐字节比较）', () => {
  const buf1 = Buffer.allocUnsafe(2);
  const buf2 = Buffer.allocUnsafe(2);
  buf1.writeUInt16LE(0x1234, 0);
  buf2.writeUInt16LE(0x1234, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `小端序 16 位: ${result}`
  };
});

test('大端序 16 位整数（逐字节比较）', () => {
  const buf1 = Buffer.allocUnsafe(2);
  const buf2 = Buffer.allocUnsafe(2);
  buf1.writeUInt16BE(0x1234, 0);
  buf2.writeUInt16BE(0x1234, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `大端序 16 位: ${result}`
  };
});

test('小端序 vs 大端序（字节内容不同）', () => {
  const buf1 = Buffer.allocUnsafe(2);
  const buf2 = Buffer.allocUnsafe(2);
  buf1.writeUInt16LE(0x1234, 0); // [0x34, 0x12]
  buf2.writeUInt16BE(0x1234, 0); // [0x12, 0x34]
  const result = buf1.compare(buf2);
  return {
    pass: result === 1, // 0x34 > 0x12 在第一个字节
    message: `小端 vs 大端: ${result}`
  };
});

test('32 位整数小端序', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeUInt32LE(0x12345678, 0);
  buf2.writeUInt32LE(0x12345678, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `32 位小端: ${result}`
  };
});

test('64 位整数大端序', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeBigUInt64BE(0x123456789ABCDEFn, 0);
  buf2.writeBigUInt64BE(0x123456789ABCDEFn, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `64 位大端: ${result}`
  };
});

// ============================================================================
// 4. 浮点数字节表示
// ============================================================================

test('Float32 相同值', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatLE(3.14, 0);
  buf2.writeFloatLE(3.14, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Float32 相同: ${result}`
  };
});

test('Float64 相同值', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeDoubleLE(3.141592653589793, 0);
  buf2.writeDoubleLE(3.141592653589793, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Float64 相同: ${result}`
  };
});

test('NaN 的字节表示（可能不同）', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeDoubleLE(NaN, 0);
  buf2.writeDoubleLE(NaN, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0 || result === -1 || result === 1,
    message: `NaN 字节比较: ${result} (可能不同)`
  };
});

test('Infinity 的字节表示', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeDoubleLE(Infinity, 0);
  buf2.writeDoubleLE(Infinity, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Infinity 字节比较: ${result}`
  };
});

test('-Infinity 的字节表示', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeDoubleLE(-Infinity, 0);
  buf2.writeDoubleLE(-Infinity, 0);
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `-Infinity 字节比较: ${result}`
  };
});

// ============================================================================
// 5. 特殊编码测试
// ============================================================================

test('Latin1 编码', () => {
  const buf1 = Buffer.from('Héllo', 'latin1');
  const buf2 = Buffer.from('Héllo', 'latin1');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Latin1 编码: ${result}`
  };
});

test('ASCII 编码', () => {
  const buf1 = Buffer.from('Hello', 'ascii');
  const buf2 = Buffer.from('Hello', 'ascii');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `ASCII 编码: ${result}`
  };
});

test('Base64URL 编码', () => {
  const base64url = 'SGVsbG8gV29ybGQ';
  const buf1 = Buffer.from(base64url, 'base64url');
  const buf2 = Buffer.from(base64url, 'base64url');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Base64URL 编码: ${result}`
  };
});

test('Binary 编码（已弃用但仍可用）', () => {
  const buf1 = Buffer.from('test', 'binary');
  const buf2 = Buffer.from('test', 'binary');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `Binary 编码: ${result}`
  };
});

// ============================================================================
// 6. 内存重叠和共享测试
// ============================================================================

test('同一 Buffer 的两个 slice 相等', () => {
  const original = Buffer.from('hello world');
  const slice1 = original.slice(0, 5);
  const slice2 = original.slice(0, 5);
  const result = slice1.compare(slice2);
  return {
    pass: result === 0,
    message: `相同 slice: ${result}`
  };
});

test('同一 Buffer 的不同 slice', () => {
  const original = Buffer.from('hello world');
  const slice1 = original.slice(0, 5);   // "hello"
  const slice2 = original.slice(6, 11);  // "world"
  const result = slice1.compare(slice2);
  return {
    pass: result === -1, // 'h' < 'w'
    message: `不同 slice: ${result}`
  };
});

test('Buffer 与自身的 slice 比较', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(0, 5);
  const result = buf.compare(slice);
  return {
    pass: result === 0,
    message: `Buffer vs 自身 slice: ${result}`
  };
});

// ============================================================================
// 7. 循环和递归测试
// ============================================================================

test('嵌套比较（比较结果再用于比较）', () => {
  const buf1 = Buffer.from('aaa');
  const buf2 = Buffer.from('bbb');
  const buf3 = Buffer.from('ccc');
  
  const r1 = buf1.compare(buf2); // -1
  const r2 = buf2.compare(buf3); // -1
  const r3 = buf1.compare(buf3); // -1
  
  return {
    pass: r1 === -1 && r2 === -1 && r3 === -1,
    message: `嵌套比较: ${r1}, ${r2}, ${r3}`
  };
});

test('循环比较链', () => {
  const buffers = [
    Buffer.from('a'),
    Buffer.from('b'),
    Buffer.from('c'),
    Buffer.from('d'),
    Buffer.from('e')
  ];
  
  let allCorrect = true;
  for (let i = 0; i < buffers.length - 1; i++) {
    if (buffers[i].compare(buffers[i + 1]) !== -1) {
      allCorrect = false;
      break;
    }
  }
  
  return {
    pass: allCorrect,
    message: `循环比较链: ${allCorrect ? '正确' : '错误'}`
  };
});

// ============================================================================
// 8. 静态方法特殊场景
// ============================================================================

test('Buffer.compare 三元比较', () => {
  const buf1 = Buffer.from('aaa');
  const buf2 = Buffer.from('bbb');
  const buf3 = Buffer.from('ccc');
  
  const r12 = Buffer.compare(buf1, buf2);
  const r23 = Buffer.compare(buf2, buf3);
  const r13 = Buffer.compare(buf1, buf3);
  
  // 传递性：如果 a < b 且 b < c，则 a < c
  const transitive = r12 === -1 && r23 === -1 && r13 === -1;
  
  return {
    pass: transitive,
    message: `传递性: ${transitive}`
  };
});

test('Buffer.compare 反对称性', () => {
  const buf1 = Buffer.from('xyz');
  const buf2 = Buffer.from('abc');
  
  const r12 = Buffer.compare(buf1, buf2);
  const r21 = Buffer.compare(buf2, buf1);
  
  // 反对称性：compare(a, b) === -compare(b, a)
  const antiSymmetric = r12 === -r21;
  
  return {
    pass: antiSymmetric && r12 === 1 && r21 === -1,
    message: `反对称性: r12=${r12}, r21=${r21}`
  };
});

test('Buffer.compare 自反性', () => {
  const buf = Buffer.from('test');
  const result = Buffer.compare(buf, buf);
  
  return {
    pass: result === 0,
    message: `自反性: ${result}`
  };
});

// ============================================================================
// 9. 压力和极限测试
// ============================================================================

test('比较 100 个不同大小的 buffer', () => {
  const buffers = [];
  for (let i = 1; i <= 100; i++) {
    buffers.push(Buffer.alloc(i, i % 256));
  }
  
  let allPass = true;
  for (let i = 0; i < buffers.length - 1; i++) {
    const result = buffers[i].compare(buffers[i + 1]);
    // 较短的 buffer 内容相同时应该小于较长的
    if (result !== -1) {
      allPass = false;
      break;
    }
  }
  
  return {
    pass: allPass,
    message: `100 个不同大小: ${allPass ? '全部正确' : '失败'}`
  };
});

test('交替长度 buffer 排序', () => {
  const buffers = [
    Buffer.from('zz'),
    Buffer.from('a'),
    Buffer.from('zzz'),
    Buffer.from('aa'),
    Buffer.from('z')
  ];
  
  buffers.sort(Buffer.compare);
  
  // 预期顺序: 'a', 'aa', 'z', 'zz', 'zzz'
  const expected = ['a', 'aa', 'z', 'zz', 'zzz'];
  const actual = buffers.map(b => b.toString());
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  
  return {
    pass: match,
    message: `排序结果: ${actual.join(', ')}`
  };
});

// ============================================================================
// 10. 回归和兼容性测试
// ============================================================================

test('空字符串 Buffer', () => {
  const buf1 = Buffer.from('');
  const buf2 = Buffer.from('');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `空字符串: ${result}`
  };
});

test('单个空格字符', () => {
  const buf1 = Buffer.from(' ');
  const buf2 = Buffer.from(' ');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `单空格: ${result}`
  };
});

test('多个空格', () => {
  const buf1 = Buffer.from('     ');
  const buf2 = Buffer.from('     ');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `多空格: ${result}`
  };
});

test('制表符和换行符', () => {
  const buf1 = Buffer.from('\t\n\r');
  const buf2 = Buffer.from('\t\n\r');
  const result = buf1.compare(buf2);
  return {
    pass: result === 0,
    message: `特殊空白: ${result}`
  };
});

// ============================================================================
// 输出结果
// ============================================================================

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

