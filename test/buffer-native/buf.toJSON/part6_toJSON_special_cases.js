// buf.toJSON() - Special Cases and Additional Coverage
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

// 特殊场景测试
test('toJSON 返回的对象只有 type 和 data 两个属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  const keys = Object.keys(json);
  if (keys.length !== 2) return false;
  if (!keys.includes('type')) return false;
  if (!keys.includes('data')) return false;
  return true;
});

test('toJSON 返回的对象是普通对象', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  // 应该是普通对象,不是 Buffer 实例
  if (Buffer.isBuffer(json)) return false;
  if (json instanceof Buffer) return false;
  return true;
});

test('toJSON 返回的 data 是普通数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  if (!Array.isArray(json.data)) return false;
  // 不是 TypedArray
  if (json.data instanceof Uint8Array) return false;
  return true;
});

test('可以从 toJSON 结果重建 Buffer', () => {
  const original = Buffer.from([10, 20, 30, 40]);
  const json = original.toJSON();
  const rebuilt = Buffer.from(json.data);

  if (rebuilt.length !== original.length) return false;
  for (let i = 0; i < original.length; i++) {
    if (rebuilt[i] !== original[i]) return false;
  }
  return true;
});

test('toJSON 与 JSON.parse 往返转换', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const jsonStr = JSON.stringify(original);
  const parsed = JSON.parse(jsonStr);
  const rebuilt = Buffer.from(parsed.data);

  if (rebuilt.length !== original.length) return false;
  for (let i = 0; i < original.length; i++) {
    if (rebuilt[i] !== original[i]) return false;
  }
  return true;
});

test('包含所有可打印 ASCII 字符的 Buffer', () => {
  const printable = [];
  for (let i = 32; i <= 126; i++) {
    printable.push(i);
  }
  const buf = Buffer.from(printable);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== printable.length) return false;
  for (let i = 0; i < printable.length; i++) {
    if (json.data[i] !== printable[i]) return false;
  }
  return true;
});

test('包含所有控制字符的 Buffer', () => {
  const controls = [];
  for (let i = 0; i < 32; i++) {
    controls.push(i);
  }
  controls.push(127); // DEL
  const buf = Buffer.from(controls);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== controls.length) return false;
  for (let i = 0; i < controls.length; i++) {
    if (json.data[i] !== controls[i]) return false;
  }
  return true;
});

test('byteOffset 不为 0 的 Buffer 视图', () => {
  const arrayBuffer = new ArrayBuffer(10);
  const view = new Uint8Array(arrayBuffer, 3, 4); // offset=3, length=4
  view[0] = 10;
  view[1] = 20;
  view[2] = 30;
  view[3] = 40;

  const buf = Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;
  if (json.data[0] !== 10 || json.data[1] !== 20 || json.data[2] !== 30 || json.data[3] !== 40) return false;
  return true;
});

test('多次 slice 后的 Buffer', () => {
  const original = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const slice1 = original.slice(2, 8); // [3, 4, 5, 6, 7, 8]
  const slice2 = slice1.slice(1, 4);   // [4, 5, 6]
  const json = slice2.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 4 || json.data[1] !== 5 || json.data[2] !== 6) return false;
  return true;
});

test('从 Buffer.allocUnsafeSlow 创建的 Buffer', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 5) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3 || json.data[3] !== 4 || json.data[4] !== 5) return false;
  return true;
});

test('使用 Buffer.from 从另一个 Buffer 创建的 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  const json = buf2.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3) return false;
  return true;
});

test('包含 UTF-16 字符的 Buffer', () => {
  const str = 'Hello';
  const buf = Buffer.from(str, 'utf16le');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 'Hello' 在 UTF-16LE 编码下是 10 字节
  if (json.data.length !== 10) return false;

  // 验证可以转回字符串
  const rebuilt = Buffer.from(json.data);
  if (rebuilt.toString('utf16le') !== 'Hello') return false;

  return true;
});

test('包含 ASCII 编码字符的 Buffer', () => {
  const str = 'ABC123';
  const buf = Buffer.from(str, 'ascii');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 6) return false;

  const expected = [65, 66, 67, 49, 50, 51]; // 'ABC123'
  for (let i = 0; i < expected.length; i++) {
    if (json.data[i] !== expected[i]) return false;
  }

  return true;
});

test('toJSON 在循环引用场景下的行为', () => {
  const obj = {
    buf: Buffer.from([1, 2, 3])
  };
  obj.self = obj; // 创建循环引用

  let threw = false;
  try {
    JSON.stringify(obj);
  } catch (e) {
    threw = true;
    // 应该抛出循环引用错误
    if (!e.message.includes('circular') && !e.message.includes('Converting circular structure')) return false;
  }

  return threw;
});

test('长度为 MAX_SAFE_LENGTH 附近的 Buffer', () => {
  // 测试较大但不至于 OOM 的 Buffer
  const size = 100000;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < 100; i++) {
    buf[i] = i % 256;
  }

  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== size) return false;

  // 抽样检查前 100 个字节
  for (let i = 0; i < 100; i++) {
    if (json.data[i] !== i % 256) return false;
  }

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
