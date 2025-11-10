// buf.equals() - Extreme Edge Cases and Boundary Conditions
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

// Buffer swap 操作的边界情况
test('swap16 - 奇数长度（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.swap16();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('swap32 - 长度不是 4 的倍数（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56]);
    buf.swap32();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('swap64 - 长度不是 8 的倍数（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
    buf.swap64();
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('swap16 - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  buf1.swap16();
  buf2.swap16();
  return buf1.equals(buf2) === true;
});

test('swap32 - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  buf1.swap32();
  buf2.swap32();
  return buf1.equals(buf2) === true;
});

test('swap64 - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  buf1.swap64();
  buf2.swap64();
  return buf1.equals(buf2) === true;
});

// Buffer reverse 操作的边界情况
test('reverse - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  buf1.reverse();
  buf2.reverse();
  return buf1.equals(buf2) === true;
});

test('reverse - 单字节', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.from([42]);
  buf1.reverse();
  buf2.reverse();
  return buf1.equals(buf2) === true;
});

test('reverse - 双字节', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([1, 2]);
  buf1.reverse();
  buf2.reverse();
  return buf1.equals(buf2) === true;
});

// Buffer read 方法的边界情况
test('readUInt8 - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readUInt8(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('readUInt16LE - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readUInt16LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('readInt32BE - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readInt32BE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('readDoubleLE - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.readDoubleLE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer write 方法的边界情况
test('writeUInt8 - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.writeUInt8(0x12, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUInt16BE - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.writeUInt16BE(0x1234, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeBigInt64LE - 超出范围（应该抛出错误）', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.writeBigInt64LE(123456789012345n, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer subarray/slice 的边界情况补充
test('subarray - 开始 > 结束', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(3, 1);
  const empty = Buffer.alloc(0);
  return sub.equals(empty) === true;
});

test('slice - 开始 > 结束', () => {
  const buf = Buffer.from('hello');
  const slc = buf.slice(3, 1);
  const empty = Buffer.alloc(0);
  return slc.equals(empty) === true;
});

test('subarray - 相同索引', () => {
  const buf = Buffer.from('hello');
  const sub = buf.subarray(2, 2);
  const empty = Buffer.alloc(0);
  return sub.equals(empty) === true;
});

test('slice - 相同索引', () => {
  const buf = Buffer.from('hello');
  const slc = buf.slice(2, 2);
  const empty = Buffer.alloc(0);
  return slc.equals(empty) === true;
});

// Buffer concat 的边界情况补充
test('concat - 负数总长度（应该抛出错误）', () => {
  try {
    const buf1 = Buffer.from('hello');
    const buf2 = Buffer.from(' world');
    Buffer.concat([buf1, buf2], -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('concat - 总长度为 0', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2], 0);
  const empty = Buffer.alloc(0);
  return concatenated.equals(empty) === true;
});

test('concat - 总长度小于实际长度（截断）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2], 3);
  const expected = Buffer.from('hel');
  return concatenated.equals(expected) === true;
});

// Buffer fill 的边界情况补充
test('fill - 开始 > 结束', () => {
  const buf1 = Buffer.alloc(10, 0);
  const buf2 = Buffer.alloc(10, 0);
  buf1.fill(0xFF, 5, 3);
  return buf1.equals(buf2) === true;
});

test('fill - 开始 = 结束', () => {
  const buf1 = Buffer.alloc(10, 0);
  const buf2 = Buffer.alloc(10, 0);
  buf1.fill(0xFF, 5, 5);
  return buf1.equals(buf2) === true;
});

// Buffer copy 的边界情况补充
test('copy - 开始 > 结束', () => {
  const source = Buffer.from('hello');
  const target1 = Buffer.alloc(10, 0);
  const target2 = Buffer.alloc(10, 0);
  source.copy(target1, 0, 3, 1);
  return target1.equals(target2) === true;
});

test('copy - 开始 = 结束', () => {
  const source = Buffer.from('hello');
  const target1 = Buffer.alloc(10, 0);
  const target2 = Buffer.alloc(10, 0);
  source.copy(target1, 0, 2, 2);
  return target1.equals(target2) === true;
});

test('copy - 目标偏移超出范围（应该静默处理）', () => {
  const source = Buffer.from('hello');
  const target1 = Buffer.alloc(5, 0);
  const target2 = Buffer.alloc(5, 0);
  // copy 方法在目标偏移超出范围时不会抛出错误，而是静默处理
  source.copy(target1, 10);
  return target1.equals(target2) === true;
});

// Buffer write 的边界情况补充
test('write - 偏移超出范围', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.write('hello', 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('write - 长度为 0', () => {
  const buf1 = Buffer.alloc(5, 0);
  const buf2 = Buffer.alloc(5, 0);
  buf1.write('hello', 0, 0);
  return buf1.equals(buf2) === true;
});

test('write - 长度为负数（应该抛出错误）', () => {
  try {
    const buf = Buffer.alloc(5);
    buf.write('hello', 0, -1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// Buffer 的 indexOf/lastIndexOf 的边界情况
test('indexOf - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const idx1 = buf1.indexOf(Buffer.from('test'));
  const idx2 = buf2.indexOf(Buffer.from('test'));
  return idx1 === idx2 && buf1.equals(buf2) === true;
});

test('lastIndexOf - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const idx1 = buf1.lastIndexOf(Buffer.from('test'));
  const idx2 = buf2.lastIndexOf(Buffer.from('test'));
  return idx1 === idx2 && buf1.equals(buf2) === true;
});

test('indexOf - 负数偏移', () => {
  const buf = Buffer.from('hello world');
  const idx = buf.indexOf('world', -5);
  return idx === 6 && buf.equals(Buffer.from('hello world')) === true;
});

test('lastIndexOf - 负数偏移', () => {
  const buf = Buffer.from('hello hello');
  // 负数偏移会被转换为 buf.length + offset
  // -5 会被转换为 11 + (-5) = 6
  // 从位置 6 开始向前搜索 'hello'
  const idx = buf.lastIndexOf('hello', -5);
  // 从位置 6 向前搜索，应该找到位置 6 的 'hello'（因为位置 6 包含 'hello'）
  return idx === 6 && buf.equals(Buffer.from('hello hello')) === true;
});

// Buffer 的 includes 的边界情况
test('includes - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const inc1 = buf1.includes(Buffer.from('test'));
  const inc2 = buf2.includes(Buffer.from('test'));
  return inc1 === inc2 && buf1.equals(buf2) === true;
});

test('includes - 负数偏移', () => {
  const buf = Buffer.from('hello world');
  const inc = buf.includes('world', -5);
  return inc === true && buf.equals(Buffer.from('hello world')) === true;
});

// Buffer 的 entries/keys/values 的边界情况
test('entries - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const entries1 = Array.from(buf1.entries());
  const entries2 = Array.from(buf2.entries());
  const entriesEqual = JSON.stringify(entries1) === JSON.stringify(entries2);
  return entriesEqual && buf1.equals(buf2) === true;
});

test('keys - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const keys1 = Array.from(buf1.keys());
  const keys2 = Array.from(buf2.keys());
  const keysEqual = JSON.stringify(keys1) === JSON.stringify(keys2);
  return keysEqual && buf1.equals(buf2) === true;
});

test('values - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const values1 = Array.from(buf1.values());
  const values2 = Array.from(buf2.values());
  const valuesEqual = JSON.stringify(values1) === JSON.stringify(values2);
  return valuesEqual && buf1.equals(buf2) === true;
});

// Buffer 的 Symbol.iterator 的边界情况
test('Symbol.iterator - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const arr1 = [...buf1];
  const arr2 = [...buf2];
  const arrEqual = JSON.stringify(arr1) === JSON.stringify(arr2);
  return arrEqual && buf1.equals(buf2) === true;
});

// Buffer 的 toJSON 的边界情况
test('toJSON - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();
  const jsonEqual = JSON.stringify(json1) === JSON.stringify(json2);
  return jsonEqual && buf1.equals(buf2) === true;
});

test('toJSON - 单字节', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.from([42]);
  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();
  const jsonEqual = JSON.stringify(json1) === JSON.stringify(json2);
  return jsonEqual && buf1.equals(buf2) === true;
});

// Buffer 的 compare 方法的边界情况
test('compare - 空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const compareResult = buf1.compare(buf2);
  const equalsResult = buf1.equals(buf2);
  return compareResult === 0 && equalsResult === true;
});

test('compare - 单字节', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.from([42]);
  const compareResult = buf1.compare(buf2);
  const equalsResult = buf1.equals(buf2);
  return compareResult === 0 && equalsResult === true;
});

test('compare vs equals - 不同长度', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2]);
  const compareResult = buf1.compare(buf2);
  const equalsResult = buf1.equals(buf2);
  return compareResult !== 0 && equalsResult === false;
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

