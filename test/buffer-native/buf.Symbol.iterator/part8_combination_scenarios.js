// buf[Symbol.iterator] - Part 8: Combination Scenarios (Round 4)
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅', passed: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 第 4 轮：组合场景与系统性补充
test('多层 slice 视图迭代', () => {
  const original = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const slice1 = original.slice(1, 7); // [2,3,4,5,6,7]
  const slice2 = slice1.slice(1, 5);   // [3,4,5,6]
  const slice3 = slice2.slice(1, 3);   // [4,5]

  const result = [...slice3];
  if (result.length !== 2) throw new Error('Length mismatch');
  if (result[0] !== 4 || result[1] !== 5) throw new Error('Multi-level slice values mismatch');
});

test('subarray 嵌套后迭代', () => {
  const original = Buffer.from([10, 20, 30, 40, 50]);
  const sub1 = original.subarray(1, 4); // [20,30,40]
  const sub2 = sub1.subarray(1, 3);     // [30,40]

  const result = [...sub2];
  if (result.length !== 2 || result[0] !== 30 || result[1] !== 40) {
    throw new Error('Nested subarray mismatch');
  }
});

test('slice 和 subarray 混合嵌套', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = original.slice(1, 4);    // [2,3,4]
  const subbed = sliced.subarray(1, 3);   // [3,4]

  const result = [...subbed];
  if (result[0] !== 3 || result[1] !== 4) {
    throw new Error('Mixed slice/subarray mismatch');
  }
});

test('迭代器与生成器函数组合', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  function* filterEven(iterable) {
    for (const value of iterable) {
      if (value % 2 === 0) {
        yield value;
      }
    }
  }

  const evenBytes = [...filterEven(buf)];
  if (evenBytes.length !== 2) throw new Error('Should have 2 even values');
  if (evenBytes[0] !== 2 || evenBytes[1] !== 4) throw new Error('Even values mismatch');
});

test('迭代器与生成器 - map 转换', () => {
  const buf = Buffer.from([1, 2, 3]);

  function* mapDouble(iterable) {
    for (const value of iterable) {
      yield value * 2;
    }
  }

  const doubled = [...mapDouble(buf)];
  if (doubled[0] !== 2 || doubled[1] !== 4 || doubled[2] !== 6) {
    throw new Error('Doubled values mismatch');
  }
});

test('hex 编码边界字符迭代', () => {
  const buf = Buffer.from('0001feff', 'hex'); // hex 字符串
  const result = [...buf];

  // "0001feff" -> [0, 1, 254, 255]
  if (result.length !== 4) throw new Error(`Length should be 4, got ${result.length}`);
  if (result[0] !== 0 || result[3] !== 255) throw new Error('Hex boundary values mismatch');
});

test('base64 边界字符迭代', () => {
  // "AA==" 解码为 [0], "//8=" 解码为 [255, 255]
  const buf1 = Buffer.from('AA==', 'base64');
  const buf2 = Buffer.from('//8=', 'base64');

  const result1 = [...buf1];
  const result2 = [...buf2];

  if (result1[0] !== 0) throw new Error('Base64 should decode to 0');
  if (result2[0] !== 255 || result2[1] !== 255) throw new Error('Base64 should decode to 255,255');
});

test('utf16le 编码迭代', () => {
  const buf = Buffer.from('AB', 'utf16le');
  const result = [...buf];

  // A=0x41, B=0x42, utf16le 每个字符 2 字节
  if (result.length !== 4) throw new Error('Should have 4 bytes');
});

test('ucs2 编码迭代（utf16le 别名）', () => {
  const buf = Buffer.from('AB', 'ucs2');
  const result = [...buf];

  if (result.length !== 4) throw new Error('UCS2 should be 4 bytes');
});

test('迭代包含 BOM 的 UTF-8 Buffer', () => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
  const text = Buffer.from('test', 'utf8');
  const buf = Buffer.concat([bom, text]);

  const result = [...buf];
  if (result.length !== 7) throw new Error('Should have 7 bytes (3 BOM + 4 text)');
  if (result[0] !== 0xEF || result[1] !== 0xBB || result[2] !== 0xBF) {
    throw new Error('BOM bytes mismatch');
  }
});

test('迭代写入不同整数类型后的 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);

  buf.writeInt8(127, 0);      // 1 字节
  buf.writeInt16LE(1000, 1);  // 2 字节
  buf.writeInt32BE(-1, 4);    // 4 字节

  const result = [];
  for (const byte of buf) {
    result.push(byte);
  }

  if (result.length !== 8) throw new Error('Should have 8 bytes');
  if (result[0] !== 127) throw new Error('Int8 mismatch');
});

test('迭代写入浮点数后的 Buffer', () => {
  const buf = Buffer.allocUnsafe(12);

  buf.writeFloatLE(3.14, 0);   // 4 字节
  buf.writeDoubleLE(2.718, 4); // 8 字节

  const result = [...buf];
  if (result.length !== 12) throw new Error('Should have 12 bytes');

  // 验证所有字节都是有效的
  for (const byte of result) {
    if (typeof byte !== 'number' || byte < 0 || byte > 255) {
      throw new Error('Invalid byte value');
    }
  }
});

test('迭代 Buffer.copyWithin() 操作后的结果', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.copyWithin(0, 3, 5); // 将索引 3-4 的内容复制到索引 0

  const result = [...buf];
  // 应该是 [4, 5, 3, 4, 5]
  if (result[0] !== 4 || result[1] !== 5) throw new Error('copyWithin mismatch');
});

test('迭代 Buffer.swap16() 后的结果', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16(); // 交换 16 位字节序

  const result = [...buf];
  // [0x02, 0x01, 0x04, 0x03]
  if (result[0] !== 0x02 || result[1] !== 0x01 || result[2] !== 0x04 || result[3] !== 0x03) {
    throw new Error('swap16 mismatch');
  }
});

test('迭代 Buffer.swap32() 后的结果', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32(); // 交换 32 位字节序

  const result = [...buf];
  // [0x04, 0x03, 0x02, 0x01]
  if (result[0] !== 0x04 || result[1] !== 0x03 || result[2] !== 0x02 || result[3] !== 0x01) {
    throw new Error('swap32 mismatch');
  }
});

test('迭代 Buffer.swap64() 后的结果', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64(); // 交换 64 位字节序

  const result = [...buf];
  // [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]
  if (result[0] !== 0x08 || result[7] !== 0x01) {
    throw new Error('swap64 mismatch');
  }
});

test('迭代器与 Array.prototype.some 组合', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = [...buf];

  const hasEven = arr.some(byte => byte % 2 === 0);
  if (!hasEven) throw new Error('Should have even numbers');

  const hasNegative = arr.some(byte => byte < 0);
  if (hasNegative) throw new Error('Should not have negative numbers');
});

test('迭代器与 Array.prototype.every 组合', () => {
  const buf = Buffer.from([2, 4, 6, 8]);
  const arr = [...buf];

  const allEven = arr.every(byte => byte % 2 === 0);
  if (!allEven) throw new Error('All should be even');

  const allPositive = arr.every(byte => byte >= 0 && byte <= 255);
  if (!allPositive) throw new Error('All should be in valid byte range');
});

test('迭代器与 Array.prototype.find 组合', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const arr = [...buf];

  const found = arr.find(byte => byte > 25);
  if (found !== 30) throw new Error('Should find 30');

  const notFound = arr.find(byte => byte > 50);
  if (notFound !== undefined) throw new Error('Should not find anything');
});

test('迭代器与 Array.prototype.findIndex 组合', () => {
  const buf = Buffer.from([5, 10, 15, 20]);
  const arr = [...buf];

  const index = arr.findIndex(byte => byte >= 15);
  if (index !== 2) throw new Error('Should find at index 2');
});

test('Buffer.isBuffer() 不影响迭代', () => {
  const buf = Buffer.from([1, 2, 3]);

  if (!Buffer.isBuffer(buf)) throw new Error('Should be a Buffer');

  const result = [...buf];
  if (result.length !== 3) throw new Error('isBuffer check should not affect iteration');
});

test('Buffer.byteLength() 与迭代长度一致', () => {
  const str = 'hello 世界';
  const buf = Buffer.from(str, 'utf8');

  const byteLen = Buffer.byteLength(str, 'utf8');
  const iterLen = [...buf].length;

  if (byteLen !== iterLen) throw new Error('byteLength should match iteration length');
});

test('零拷贝操作后的迭代', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 8; i++) {
    view[i] = i * 10;
  }

  const buf = Buffer.from(ab); // 零拷贝（实际上是拷贝）
  const result = [...buf];

  if (result.length !== 8) throw new Error('Length mismatch');
  if (result[0] !== 0 || result[7] !== 70) throw new Error('Zero-copy values mismatch');
});

// 生成测试报告
const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    suite: 'buf[Symbol.iterator] - Part 8: Combination Scenarios (Round 4)',
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log('\n' + JSON.stringify(result, null, 2));
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
