// buf.equals() - 最终补充测试：遗漏的边缘情况
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

// Buffer.from() 的各种参数组合
test('Buffer.from(string) - 默认utf8编码', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello', 'utf8');
  return buf1.equals(buf2) === true;
});

test('Buffer.from(string, encoding) - 显式指定utf8', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello', 'utf-8');
  return buf1.equals(buf2) === true;
});

test('Buffer.from(string, encoding) - latin1编码', () => {
  const buf1 = Buffer.from('hello', 'latin1');
  const buf2 = Buffer.from('hello', 'binary');
  return buf1.equals(buf2) === true;
});

// Buffer.alloc() 与 Buffer.from() 的比较
test('Buffer.alloc(size, fill) vs Buffer.from()', () => {
  const buf1 = Buffer.alloc(5, 0x41); // 'A'
  const buf2 = Buffer.from('AAAAA');
  return buf1.equals(buf2) === true;
});

test('Buffer.allocUnsafe() 填充后 vs Buffer.from()', () => {
  const buf1 = Buffer.allocUnsafe(5);
  buf1.fill(0x42); // 'B'
  const buf2 = Buffer.from('BBBBB');
  return buf1.equals(buf2) === true;
});

// Buffer.concat() 与 equals 的组合
test('Buffer.concat([buf1, buf2]).equals(Buffer.from(string))', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2]);
  const expected = Buffer.from('hello world');
  return concatenated.equals(expected) === true;
});

test('Buffer.concat([]).equals(Buffer.alloc(0))', () => {
  const empty1 = Buffer.concat([]);
  const empty2 = Buffer.alloc(0);
  return empty1.equals(empty2) === true;
});

// Buffer.slice() 与 equals 的组合
test('Buffer.slice(start, end).equals(Buffer.from(string))', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5);
  const expected = Buffer.from('hello');
  return slice.equals(expected) === true;
});

test('Buffer.slice(-5).equals(Buffer.slice(6))', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(-5);
  const slice2 = buf.slice(6);
  return slice1.equals(slice2) === true;
});

// Buffer.subarray() 与 equals 的组合
test('Buffer.subarray(start, end).equals(Buffer.from(string))', () => {
  const buf = Buffer.from('hello world');
  const subarr = buf.subarray(0, 5);
  const expected = Buffer.from('hello');
  return subarr.equals(expected) === true;
});

test('Buffer.subarray(-5).equals(Buffer.subarray(6))', () => {
  const buf = Buffer.from('hello world');
  const subarr1 = buf.subarray(-5);
  const subarr2 = buf.subarray(6);
  return subarr1.equals(subarr2) === true;
});

// Buffer.fill() 与 equals 的组合
test('Buffer.fill(value).equals(Buffer.alloc(size, value))', () => {
  const buf1 = Buffer.alloc(5);
  buf1.fill(0x43); // 'C'
  const buf2 = Buffer.alloc(5, 0x43);
  return buf1.equals(buf2) === true;
});

test('Buffer.fill(string).equals(Buffer.alloc(size, string))', () => {
  const buf1 = Buffer.alloc(5);
  buf1.fill('D');
  const buf2 = Buffer.alloc(5, 'D');
  return buf1.equals(buf2) === true;
});

// Buffer.copy() 与 equals 的组合
test('Buffer.copy(target).equals(source)', () => {
  const source = Buffer.from('hello');
  const target = Buffer.alloc(5);
  source.copy(target);
  return source.equals(target) === true;
});

test('Buffer.copy(target, offset).equals(Buffer.from(string))', () => {
  const source = Buffer.from('ab');
  const target = Buffer.from('12345');
  source.copy(target, 2);
  const expected = Buffer.from('12ab5');
  return target.equals(expected) === true;
});

// Buffer.write() 与 equals 的组合
test('Buffer.write(string).equals(Buffer.from(string))', () => {
  const buf1 = Buffer.alloc(5);
  buf1.write('hello');
  const buf2 = Buffer.from('hello');
  return buf1.equals(buf2) === true;
});

test('Buffer.write(string, offset).equals(Buffer.from(array))', () => {
  const buf1 = Buffer.alloc(10, 0);
  buf1.write('hello', 2);
  const buf2 = Buffer.from([0, 0, 104, 101, 108, 108, 111, 0, 0, 0]);
  return buf1.equals(buf2) === true;
});

// Buffer.read* 方法不影响 equals
test('Buffer.readUInt8() 后 equals 不变', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x12, 0x34]);
  const val = buf1.readUInt8(0);
  return val === 0x12 && buf1.equals(buf2) === true;
});

test('Buffer.readUInt16LE() 后 equals 不变', () => {
  const buf1 = Buffer.from([0x34, 0x12]);
  const buf2 = Buffer.from([0x34, 0x12]);
  const val = buf1.readUInt16LE(0);
  return val === 0x1234 && buf1.equals(buf2) === true;
});

// Buffer.write* 方法后 equals
test('Buffer.writeUInt8() 后 equals', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUInt8(0x12, 0);
  buf2.writeUInt8(0x12, 0);
  return buf1.equals(buf2) === true;
});

test('Buffer.writeUInt16BE() 后 equals', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);
  buf1.writeUInt16BE(0x1234, 0);
  buf2.writeUInt16BE(0x1234, 0);
  return buf1.equals(buf2) === true;
});

// Buffer.swap* 方法后 equals
test('Buffer.swap16() 后 equals', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf1.swap16();
  buf2.swap16();
  return buf1.equals(buf2) === true;
});

test('Buffer.swap32() 后 equals', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const buf2 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf1.swap32();
  buf2.swap32();
  return buf1.equals(buf2) === true;
});

// Buffer.reverse() 后 equals
test('Buffer.reverse() 后 equals', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from([1, 2, 3, 4]);
  buf1.reverse();
  buf2.reverse();
  return buf1.equals(buf2) === true;
});

// Buffer.toString() 不影响 equals
test('Buffer.toString() 后 equals 不变', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const str = buf1.toString();
  return str === 'hello' && buf1.equals(buf2) === true;
});

test('Buffer.toString(encoding) 后 equals 不变', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const hex = buf1.toString('hex');
  return hex === '68656c6c6f' && buf1.equals(buf2) === true;
});

// Buffer.toJSON() 不影响 equals
test('Buffer.toJSON() 后 equals 不变', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const json = buf1.toJSON();
  return json.type === 'Buffer' && buf1.equals(buf2) === true;
});

// Buffer.entries/keys/values 不影响 equals
test('Buffer.entries() 后 equals 不变', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const entries = Array.from(buf1.entries());
  return entries.length === 3 && buf1.equals(buf2) === true;
});

test('Buffer.keys() 后 equals 不变', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const keys = Array.from(buf1.keys());
  return keys.length === 3 && buf1.equals(buf2) === true;
});

test('Buffer.values() 后 equals 不变', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const values = Array.from(buf1.values());
  return values.length === 3 && buf1.equals(buf2) === true;
});

// Buffer.indexOf/lastIndexOf/includes 不影响 equals
test('Buffer.indexOf() 后 equals 不变', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from('hello world');
  const idx = buf1.indexOf('world');
  return idx === 6 && buf1.equals(buf2) === true;
});

test('Buffer.lastIndexOf() 后 equals 不变', () => {
  const buf1 = Buffer.from('hello hello');
  const buf2 = Buffer.from('hello hello');
  const idx = buf1.lastIndexOf('hello');
  return idx === 6 && buf1.equals(buf2) === true;
});

test('Buffer.includes() 后 equals 不变', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from('hello world');
  const inc = buf1.includes('world');
  return inc === true && buf1.equals(buf2) === true;
});

// Buffer.compare() 与 equals 的一致性
test('Buffer.compare() === 0 等价于 equals() === true', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.compare(buf2) === 0 && buf1.equals(buf2) === true;
});

test('Buffer.compare() !== 0 等价于 equals() === false', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  return buf1.compare(buf2) !== 0 && buf1.equals(buf2) === false;
});

// Buffer.isBuffer() 与 equals 的组合
test('Buffer.isBuffer() 为 true 的对象可以使用 equals', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const isBuf1 = Buffer.isBuffer(buf1);
  const isBuf2 = Buffer.isBuffer(buf2);
  return isBuf1 === true && isBuf2 === true && buf1.equals(buf2) === true;
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

