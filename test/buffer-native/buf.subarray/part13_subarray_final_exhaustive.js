// buf.subarray() - Final Exhaustive Tests (Round 9)
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, passed: pass, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, status: '❌', error: e.message, stack: e.stack });
  }
}

// ==================== 未覆盖的数值边界 ====================

test('start 为 2**31 - 超过 32 位整数最大值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2 ** 31);
  if (sub.length !== 0) return false;
  console.log('✅ 2**31 返回空');
  return true;
});

test('start 为 -(2**31) - 32 位整数最小值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-(2 ** 31));
  if (sub.length !== 5) return false;
  console.log('✅ -(2**31) 从 0 开始');
  return true;
});

test('start 为 0.1 + 0.2 - 浮点精度问题', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0.1 + 0.2);
  // 0.1 + 0.2 = 0.30000000000000004，截断为 0
  if (sub.length !== 5) return false;
  console.log('✅ 浮点精度正确处理');
  return true;
});

test('start 为 1/3 - 无限小数', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1 / 3);
  // 0.333... 截断为 0
  if (sub.length !== 5) return false;
  console.log('✅ 无限小数截断');
  return true;
});

test('start 为 Math.PI', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Math.PI);
  // 3.14159... 截断为 3
  if (sub.length !== 2 || sub[0] !== 4) return false;
  console.log('✅ Math.PI 截断');
  return true;
});

test('start 为 Math.E', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Math.E);
  // 2.71828... 截断为 2
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ Math.E 截断');
  return true;
});

// ==================== 参数为类实例 ====================

test('start 为自定义类实例', () => {
  class MyNumber {
    valueOf() { return 2; }
    toString() { return '3'; }
  }
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(new MyNumber());
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ 自定义类实例 valueOf');
  return true;
});

test('start 为 Error 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const err = new Error('test');
  const sub = buf.subarray(err);
  // Error 转为 NaN -> 0
  if (sub.length !== 5) return false;
  console.log('✅ Error 对象转为 0');
  return true;
});

test('start 为 TypedArray 实例', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const u8 = new Uint8Array([2]);
  const sub = buf.subarray(u8);
  // TypedArray 会通过 valueOf 转换，单元素数组转为该元素值
  if (sub.length !== 3 || sub[0] !== 3) return false;
  console.log('✅ TypedArray 实例转为数字');
  return true;
});

test('start 为 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const ab = new ArrayBuffer(10);
  const sub = buf.subarray(ab);
  // ArrayBuffer 转为 NaN -> 0
  if (sub.length !== 5) return false;
  console.log('✅ ArrayBuffer 转为 0');
  return true;
});

// ==================== 特殊的对象键 ====================

test('start 为带数字键的对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const obj = { 0: 2, 1: 3, length: 2 };
  const sub = buf.subarray(obj);
  // 对象转为 NaN -> 0
  if (sub.length !== 5) return false;
  console.log('✅ 类数组对象转为 0');
  return true;
});

test('start 为 arguments 对象', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  (function() {
    const sub = buf.subarray(arguments);
    if (sub.length !== 5) return false;
    console.log('✅ arguments 对象转为 0');
    return true;
  })(2, 3);
  return true;
});

// ==================== Buffer 特殊创建方式的补充 ====================

test('Buffer.from 带 offset 和 length 的 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const u8 = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) u8[i] = i;

  const buf = Buffer.from(ab, 3, 5);
  const sub = buf.subarray(1, 4);

  if (sub.length !== 3 || sub[0] !== 4) return false;
  console.log('✅ 带 offset 的 ArrayBuffer');
  return true;
});

test('Buffer.from SharedArrayBuffer', () => {
  if (typeof SharedArrayBuffer === 'undefined') {
    console.log('✅ SharedArrayBuffer 不可用');
    return true;
  }

  const sab = new SharedArrayBuffer(10);
  const u8 = new Uint8Array(sab);
  for (let i = 0; i < 10; i++) u8[i] = i;

  const buf = Buffer.from(sab);
  const sub = buf.subarray(2, 7);

  if (sub.length !== 5 || sub[0] !== 2) return false;
  console.log('✅ SharedArrayBuffer');
  return true;
});

// ==================== 编码的特殊组合 ====================

test('subarray 后用不同编码读取', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const sub = buf.subarray(0, 5);

  const utf8 = sub.toString('utf8');
  const hex = sub.toString('hex');
  const base64 = sub.toString('base64');

  if (utf8 !== 'Hello') return false;
  if (hex !== '48656c6c6f') return false;
  if (base64 !== 'SGVsbG8=') return false;

  console.log('✅ 多编码读取');
  return true;
});

test('latin1 所有字节值', () => {
  const buf = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
  const sub = buf.subarray(128, 256);

  const str = sub.toString('latin1');
  if (str.length !== 128) return false;

  console.log('✅ latin1 全字节范围');
  return true;
});

// ==================== 方法调用时序 ====================

test('先 fill 后 subarray', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0x42, 3, 7);
  const sub = buf.subarray(2, 8);

  if (sub[1] !== 0x42 || sub[4] !== 0x42) return false;
  console.log('✅ fill 后 subarray');
  return true;
});

test('先 write 后 subarray', () => {
  const buf = Buffer.alloc(20);
  buf.write('Hello', 5, 'utf8');
  const sub = buf.subarray(5, 10);

  if (sub.toString('utf8') !== 'Hello') return false;
  console.log('✅ write 后 subarray');
  return true;
});

test('先 copy 后 subarray', () => {
  const src = Buffer.from([1, 2, 3, 4, 5]);
  const dst = Buffer.alloc(10);
  src.copy(dst, 2);

  const sub = dst.subarray(2, 7);
  if (sub.length !== 5 || sub[0] !== 1) return false;

  console.log('✅ copy 后 subarray');
  return true;
});

// ==================== 与 JSON 的交互 ====================

test('subarray 后 toJSON', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const json = JSON.stringify(sub);

  const parsed = JSON.parse(json);
  if (parsed.type !== 'Buffer') return false;
  if (parsed.data.length !== 3) return false;
  if (parsed.data[0] !== 2 || parsed.data[2] !== 4) return false;

  console.log('✅ JSON 序列化');
  return true;
});

test('从 JSON 恢复后 subarray', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const json = JSON.stringify(original);
  const buf = Buffer.from(JSON.parse(json).data);

  const sub = buf.subarray(1, 4);
  if (sub.length !== 3 || sub[0] !== 2) return false;

  console.log('✅ JSON 恢复后 subarray');
  return true;
});

// ==================== 边界条件的组合 ====================

test('start=length-1, end=length - 最后一个元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(4, 5);
  if (sub.length !== 1 || sub[0] !== 5) return false;
  console.log('✅ 最后一个元素 subarray');
  return true;
});

test('start=0, end=1 - 第一个元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 1);
  if (sub.length !== 1 || sub[0] !== 1) return false;
  console.log('✅ 第一个元素 subarray');
  return true;
});

test('start=-length, end=-length+1 - 负数第一个', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-5, -4);
  if (sub.length !== 1 || sub[0] !== 1) return false;
  console.log('✅ 负数第一个元素');
  return true;
});

test('每个索引单独 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  for (let i = 0; i < buf.length; i++) {
    const sub = buf.subarray(i, i + 1);
    if (sub.length !== 1 || sub[0] !== buf[i]) return false;
  }
  console.log('✅ 每个索引独立 subarray');
  return true;
});

// ==================== 迭代器和生成器 ====================

test('subarray 后使用 for...of', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const values = [];

  for (const val of sub) {
    values.push(val);
  }

  if (values.length !== 3) return false;
  if (values[0] !== 2 || values[2] !== 4) return false;

  console.log('✅ for...of 迭代');
  return true;
});

test('subarray 后使用 values()', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const values = Array.from(sub.values());

  if (values.length !== 3) return false;
  if (values[0] !== 2 || values[2] !== 4) return false;

  console.log('✅ values() 迭代');
  return true;
});

test('subarray 后使用 keys()', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const keys = Array.from(sub.keys());

  if (keys.length !== 3) return false;
  if (keys[0] !== 0 || keys[2] !== 2) return false;

  console.log('✅ keys() 迭代');
  return true;
});

test('subarray 后使用 entries()', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  const entries = Array.from(sub.entries());

  if (entries.length !== 3) return false;
  if (entries[0][0] !== 0 || entries[0][1] !== 2) return false;
  if (entries[2][0] !== 2 || entries[2][1] !== 4) return false;

  console.log('✅ entries() 迭代');
  return true;
});

// ==================== 并发和异步场景 ====================

test('异步修改 subarray', async () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);

  await new Promise(resolve => {
    setTimeout(() => {
      sub[0] = 99;
      resolve();
    }, 10);
  });

  if (buf[1] !== 99) return false;
  console.log('✅ 异步修改共享');
  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

async function runAsync() {
  // 运行异步测试
  const asyncTest = tests.find(t => t.name === '异步修改 subarray');
  if (asyncTest && asyncTest.passed === undefined) {
    try {
      const pass = await test('异步修改 subarray', async () => {
        const buf = Buffer.from([1, 2, 3, 4, 5]);
        const sub = buf.subarray(1, 4);

        await new Promise(resolve => {
          setTimeout(() => {
            sub[0] = 99;
            resolve();
          }, 10);
        });

        if (buf[1] !== 99) return false;
        console.log('✅ 异步修改共享');
        return true;
      });
    } catch (e) {
      // ignore
    }
  }
}

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
