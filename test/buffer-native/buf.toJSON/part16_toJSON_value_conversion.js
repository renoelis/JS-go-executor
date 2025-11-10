// buf.toJSON() - valueOf, toString, and Implicit Conversion Tests
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

// valueOf 测试
test('Buffer.valueOf 返回自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const value = buf.valueOf();

  if (value !== buf) return false;
  if (!Buffer.isBuffer(value)) return false;

  return true;
});

test('Buffer.valueOf 与 toJSON 无关', () => {
  const buf = Buffer.from([1, 2, 3]);
  const value = buf.valueOf();
  const json = buf.toJSON();

  // valueOf 返回 Buffer 本身
  if (Buffer.isBuffer(value)) {
    // toJSON 返回普通对象
    if (Buffer.isBuffer(json)) return false;
    return true;
  }

  return false;
});

// toString vs toJSON
test('toString 返回字符串, toJSON 返回对象', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]);

  const str = buf.toString();
  const json = buf.toJSON();

  if (typeof str !== 'string') return false;
  if (str !== 'Hello') return false;

  if (typeof json !== 'object') return false;
  if (json.type !== 'Buffer') return false;

  return true;
});

test('toString 支持多种编码, toJSON 无编码参数', () => {
  const buf = Buffer.from([72, 101, 108, 108, 111]);

  const utf8 = buf.toString('utf8');
  const hex = buf.toString('hex');
  const base64 = buf.toString('base64');

  if (utf8 !== 'Hello') return false;
  if (hex !== '48656c6c6f') return false;
  if (typeof base64 !== 'string') return false;

  // toJSON 不接受参数
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;

  return true;
});

test('toString 和 toJSON 对空 Buffer 的处理', () => {
  const buf = Buffer.from([]);

  const str = buf.toString();
  const json = buf.toJSON();

  if (str !== '') return false;
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

// 隐式转换
test('Buffer + 空字符串会调用 toString', () => {
  const buf = Buffer.from([65, 66, 67]);
  const result = buf + '';

  if (typeof result !== 'string') return false;
  if (result !== 'ABC') return false;

  return true;
});

test('String(Buffer) 调用 toString', () => {
  const buf = Buffer.from([72, 105]);
  const str = String(buf);

  if (typeof str !== 'string') return false;
  if (str !== 'Hi') return false;

  return true;
});

test('Buffer 作为模板字符串变量', () => {
  const buf = Buffer.from([79, 75]);
  const result = `Result: ${buf}`;

  if (typeof result !== 'string') return false;
  if (result !== 'Result: OK') return false;

  return true;
});

// toLocaleString
test('Buffer.toLocaleString 存在', () => {
  const buf = Buffer.from([1, 2, 3]);

  if (typeof buf.toLocaleString !== 'function') return false;

  return true;
});

test('Buffer.toLocaleString 行为', () => {
  const buf = Buffer.from([65, 66, 67]);
  const result = buf.toLocaleString();

  // toLocaleString 应该调用 toString
  if (typeof result !== 'string') return false;

  return true;
});

// Map 和 Set
test('Buffer 作为 Map key 基于引用', () => {
  const map = new Map();
  const key1 = Buffer.from([1, 2, 3]);
  const key2 = Buffer.from([1, 2, 3]);

  map.set(key1, 'value1');
  map.set(key2, 'value2');

  // 两个不同的 Buffer 实例,即使内容相同
  if (map.get(key1) !== 'value1') return false;
  if (map.get(key2) !== 'value2') return false;
  if (map.size !== 2) return false;

  return true;
});

test('Set 中的 Buffer 基于引用', () => {
  const set = new Set();
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);

  set.add(buf1);
  set.add(buf2);
  set.add(buf1); // 重复添加

  // 两个不同实例都会被添加
  if (set.size !== 2) return false;

  return true;
});

test('toJSON 结果作为 Map key', () => {
  const map = new Map();
  const buf = Buffer.from([1, 2, 3]);
  const json1 = buf.toJSON();
  const json2 = buf.toJSON();

  map.set(json1, 'value1');

  // json1 和 json2 是不同的对象实例
  if (map.get(json1) !== 'value1') return false;
  if (map.get(json2) !== undefined) return false; // 不同对象

  return true;
});

// ArrayBuffer.isView
test('ArrayBuffer.isView 识别 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);

  if (!ArrayBuffer.isView(buf)) return false;

  return true;
});

test('ArrayBuffer.isView 不识别 toJSON 结果', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (ArrayBuffer.isView(json)) return false;
  if (ArrayBuffer.isView(json.data)) return false;

  return true;
});

// Buffer.buffer 属性
test('Buffer.buffer 返回 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  if (!(buf.buffer instanceof ArrayBuffer)) return false;
  if (typeof buf.buffer.byteLength !== 'number') return false;

  return true;
});

test('Buffer.buffer 可能来自池', () => {
  const buf = Buffer.allocUnsafe(10);

  if (!(buf.buffer instanceof ArrayBuffer)) return false;
  // 池分配的 Buffer,buffer.byteLength 可能大于 buf.byteLength
  if (buf.buffer.byteLength < buf.byteLength) return false;

  return true;
});

test('toJSON 结果没有 buffer 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if ('buffer' in json) return false;

  return true;
});

test('Buffer.byteOffset 属性', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);

  if (typeof buf.byteOffset !== 'number') return false;
  if (buf.byteOffset < 0) return false;

  return true;
});

test('toJSON 结果没有 byteOffset 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if ('byteOffset' in json) return false;
  if ('byteLength' in json) return false;

  return true;
});

// 修改后立即序列化
test('修改 Buffer 影响后续 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json1 = buf.toJSON();

  buf[1] = 99;

  const json2 = buf.toJSON();

  if (json1.data[1] === 99) return false; // 之前的不受影响
  if (json2.data[1] !== 99) return false; // 新的反映修改

  return true;
});

test('修改 Buffer 后 JSON.stringify 反映变化', () => {
  const buf = Buffer.from([10, 20, 30]);
  const str1 = JSON.stringify(buf);

  buf[0] = 100;

  const str2 = JSON.stringify(buf);

  if (str1 === str2) return false;
  if (!str2.includes('100')) return false;

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
