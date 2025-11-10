// buf.toJSON() - Buffer.set, Encoding Support, and Buffer.compare Integration Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// Buffer.set 方法
test('Buffer.set 设置值后 toJSON', () => {
  const buf = Buffer.alloc(10);
  buf.set([1, 2, 3], 0);
  buf.set([4, 5], 5);

  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 10) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3) return false;
  if (json.data[5] !== 4 || json.data[6] !== 5) return false;

  return true;
});

test('Buffer.set 从另一个 Buffer 复制', () => {
  const source = Buffer.from([10, 20, 30]);
  const target = Buffer.alloc(10);
  target.set(source, 3);

  const json = target.toJSON();

  if (json.data[3] !== 10 || json.data[4] !== 20 || json.data[5] !== 30) return false;

  return true;
});

test('Buffer.set 从 Uint8Array 复制', () => {
  const source = new Uint8Array([100, 101, 102]);
  const target = Buffer.alloc(10);
  target.set(source, 2);

  const json = target.toJSON();

  if (json.data[2] !== 100 || json.data[3] !== 101 || json.data[4] !== 102) return false;

  return true;
});

// Buffer.isEncoding 测试
test('Buffer.isEncoding 识别 utf8', () => {
  if (!Buffer.isEncoding('utf8')) return false;
  if (!Buffer.isEncoding('utf-8')) return false;

  return true;
});

test('Buffer.isEncoding 识别所有标准编码', () => {
  const encodings = ['hex', 'base64', 'base64url', 'latin1', 'binary', 'ascii', 'utf16le', 'ucs2', 'ucs-2'];

  for (const enc of encodings) {
    if (!Buffer.isEncoding(enc)) return false;
  }

  return true;
});

test('Buffer.isEncoding 拒绝无效编码', () => {
  if (Buffer.isEncoding('invalid')) return false;
  if (Buffer.isEncoding('utf32')) return false;
  if (Buffer.isEncoding('')) return false;

  return true;
});

test('各种编码创建的 Buffer 都有 toJSON', () => {
  const encodings = ['utf8', 'hex', 'base64', 'latin1', 'ascii'];

  for (const enc of encodings) {
    const buf = Buffer.from('test', enc);
    if (typeof buf.toJSON !== 'function') return false;

    const json = buf.toJSON();
    if (json.type !== 'Buffer') return false;
  }

  return true;
});

// binary 编码 (latin1 的别名)
test('binary 编码是 latin1 的别名', () => {
  const str = 'test';
  const buf1 = Buffer.from(str, 'latin1');
  const buf2 = Buffer.from(str, 'binary');

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  if (JSON.stringify(json1) !== JSON.stringify(json2)) return false;

  return true;
});

// Buffer.compare 和 toJSON 的关系
test('Buffer.compare 结果与 toJSON 数据比较一致 - 相等', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);

  const cmp = Buffer.compare(buf1, buf2);
  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();
  const jsonEqual = JSON.stringify(json1) === JSON.stringify(json2);

  if (cmp !== 0) return false;
  if (!jsonEqual) return false;

  return true;
});

test('Buffer.compare 结果与 toJSON 数据比较一致 - 小于', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);

  const cmp = Buffer.compare(buf1, buf2);

  if (cmp >= 0) return false;

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  // 数据也应该反映顺序
  if (json1.data[2] >= json2.data[2]) return false;

  return true;
});

test('Buffer.compare 结果与 toJSON 数据比较一致 - 大于', () => {
  const buf1 = Buffer.from([1, 2, 4]);
  const buf2 = Buffer.from([1, 2, 3]);

  const cmp = Buffer.compare(buf1, buf2);

  if (cmp <= 0) return false;

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  if (json1.data[2] <= json2.data[2]) return false;

  return true;
});

test('Buffer.compare 长度不同', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2]);

  const cmp = Buffer.compare(buf1, buf2);

  // buf1 更长,应该大于 buf2
  if (cmp <= 0) return false;

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  if (json1.data.length <= json2.data.length) return false;

  return true;
});

// Buffer 和 Uint8Array 的差异
test('Buffer 有 toJSON, Uint8Array 没有', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);

  if (typeof buf.toJSON !== 'function') return false;
  if (typeof uint8.toJSON !== 'undefined') return false;

  return true;
});

test('Buffer.toString 支持编码, Uint8Array 不支持', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]);
  const uint8 = new Uint8Array([72, 101, 108, 108, 111]);

  const bufStr = buf.toString('utf8');
  const uint8Str = uint8.toString();

  if (bufStr !== 'Hello') return false;
  // Uint8Array.toString 返回类似 "72,101,108,108,111"
  if (uint8Str === 'Hello') return false;

  return true;
});

test('Buffer.slice 和 Uint8Array.slice 行为不同', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);

  const bufSlice = buf.slice(1, 3);
  const uint8Slice = uint8.slice(1, 3);

  // Buffer.slice 创建视图 (共享内存)
  // Uint8Array.slice 创建新副本
  buf[1] = 99;
  uint8[1] = 99;

  const bufJson = bufSlice.toJSON();

  // Buffer slice 反映修改
  if (bufJson.data[0] !== 99) return false;

  // Uint8Array slice 不反映修改
  if (uint8Slice[0] === 99) return false;

  return true;
});

// 空 Buffer 特殊处理
test('空 Buffer 的各种属性', () => {
  const buf = Buffer.from([]);

  if (buf.length !== 0) return false;
  if (buf.byteLength !== 0) return false;
  if (typeof buf.byteOffset !== 'number') return false;

  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('空 Buffer 索引访问返回 undefined', () => {
  const buf = Buffer.from([]);
  const json = buf.toJSON();

  if (buf[0] !== undefined) return false;
  if (json.data[0] !== undefined) return false;

  return true;
});

test('空 Buffer toString 返回空字符串', () => {
  const buf = Buffer.from([]);

  if (buf.toString() !== '') return false;
  if (buf.toString('hex') !== '') return false;
  if (buf.toString('base64') !== '') return false;

  return true;
});

test('空 Buffer 可以正常序列化和反序列化', () => {
  const buf = Buffer.from([]);
  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);

  if (parsed.type !== 'Buffer') return false;
  if (parsed.data.length !== 0) return false;

  const restored = Buffer.from(parsed.data);
  if (restored.length !== 0) return false;

  return true;
});

// Buffer.prototype 方法覆盖
test('Buffer 有独立的 slice 实现', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);

  // Buffer.slice 和 Uint8Array.slice 是不同的方法
  if (buf.slice === uint8.slice) return false;

  return true;
});

test('Buffer 和 Uint8Array 共享部分原型', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);

  // Buffer 是 Uint8Array 的子类
  if (!(buf instanceof Uint8Array)) return false;

  // 但有自己的方法
  if (typeof buf.toJSON !== 'function') return false;
  if (typeof uint8.toJSON !== 'undefined') return false;

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
