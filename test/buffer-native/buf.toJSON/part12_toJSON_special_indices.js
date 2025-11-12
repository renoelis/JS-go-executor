// buf.toJSON() - Special Index and Prototype Chain Tests
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

// 特殊索引测试
test('subarray 使用 MAX_SAFE_INTEGER 作为结束', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, Number.MAX_SAFE_INTEGER);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  // 应该自动截断到实际长度
  if (json.data.length !== 5) return false;

  return true;
});

test('subarray 使用浮点数索引会被转换为整数', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(1.7, 3.9);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  // 1.7 -> 1, 3.9 -> 3
  if (json.data.length !== 2) return false;
  if (json.data[0] !== 20 || json.data[1] !== 30) return false;

  return true;
});

test('subarray 起始为 NaN 被视为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(NaN, 3);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1 || json.data[2] !== 3) return false;

  return true;
});

test('subarray 结束为 NaN 被视为 0', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, NaN);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  // NaN 转为 0,所以是空区间
  if (json.data.length !== 0) return false;

  return true;
});

test('subarray 起始为 Infinity 返回空', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(Infinity);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('subarray 起始为 -Infinity 从头开始', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-Infinity);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 5) return false;
  if (json.data[0] !== 1 || json.data[4] !== 5) return false;

  return true;
});

test('subarray 结束为 Infinity 到末尾', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, Infinity);
  const json = sub.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 3 || json.data[2] !== 5) return false;

  return true;
});

// 原型链和属性测试
test('返回对象只有自有属性 type 和 data', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const ownKeys = Object.getOwnPropertyNames(json);
  if (ownKeys.length !== 2) return false;
  if (!ownKeys.includes('type')) return false;
  if (!ownKeys.includes('data')) return false;

  return true;
});

test('返回对象的 type 属性可枚举可写可配置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const descriptor = Object.getOwnPropertyDescriptor(json, 'type');
  if (!descriptor) return false;
  if (!descriptor.enumerable) return false;
  if (!descriptor.writable) return false;
  if (!descriptor.configurable) return false;

  return true;
});

test('返回对象的 data 属性可枚举可写可配置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const descriptor = Object.getOwnPropertyDescriptor(json, 'data');
  if (!descriptor) return false;
  if (!descriptor.enumerable) return false;
  if (!descriptor.writable) return false;
  if (!descriptor.configurable) return false;

  return true;
});

test('返回对象继承了 Object.prototype 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (typeof json.toString !== 'function') return false;
  if (typeof json.hasOwnProperty !== 'function') return false;
  if (typeof json.valueOf !== 'function') return false;

  return true;
});

test('返回对象的 toString 不会返回 Buffer 标识', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  const str = json.toString();
  // 应该是 [object Object]
  if (str !== '[object Object]') return false;

  return true;
});

test('返回对象使用 in 操作符检测继承属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (!('type' in json)) return false;
  if (!('data' in json)) return false;
  // toString 继承自 Object.prototype
  if (!('toString' in json)) return false;
  // length 不存在
  if ('length' in json) return false;

  return true;
});

test('返回对象使用 hasOwnProperty 只检测自有属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();

  if (!json.hasOwnProperty('type')) return false;
  if (!json.hasOwnProperty('data')) return false;
  // toString 是继承的
  if (json.hasOwnProperty('toString')) return false;

  return true;
});

// Buffer 视图共享内存测试
test('多个视图修改同一底层内存', () => {
  const base = Buffer.from([1, 2, 3, 4, 5, 6]);
  const view1 = base.subarray(0, 3);
  const view2 = base.subarray(3, 6);

  // 修改 base
  base[1] = 99;
  base[4] = 88;

  const json1 = view1.toJSON();
  const json2 = view2.toJSON();

  if (json1.data[1] !== 99) return false;
  if (json2.data[1] !== 88) return false;

  return true;
});

test('修改视图影响原 Buffer 的 toJSON', () => {
  const base = Buffer.from([10, 20, 30, 40, 50]);
  const view = base.subarray(1, 4);

  view[0] = 200;
  view[2] = 400; // 400 会被截断为 144 (400 & 0xFF)

  const baseJson = base.toJSON();

  if (baseJson.data[1] !== 200) return false;
  if (baseJson.data[3] !== (400 & 0xFF)) return false;

  return true;
});

test('重叠视图的 toJSON', () => {
  const base = Buffer.from([1, 2, 3, 4, 5]);
  const view1 = base.subarray(0, 3);
  const view2 = base.subarray(2, 5);

  base[2] = 99;

  const json1 = view1.toJSON();
  const json2 = view2.toJSON();

  // 两个视图都应该看到修改
  if (json1.data[2] !== 99) return false;
  if (json2.data[0] !== 99) return false;

  return true;
});

// Object.keys 测试
test('Buffer 的 Object.keys 返回数字索引', () => {
  const buf = Buffer.from([10, 20, 30]);
  const keys = Object.keys(buf);

  if (keys.length !== 3) return false;
  if (!keys.includes('0')) return false;
  if (!keys.includes('1')) return false;
  if (!keys.includes('2')) return false;

  return true;
});

test('toJSON 返回对象的 Object.keys', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  const keys = Object.keys(json);

  if (keys.length !== 2) return false;
  if (!keys.includes('type')) return false;
  if (!keys.includes('data')) return false;

  return true;
});

test('Buffer 迭代器与 toJSON 数据一致', () => {
  const buf = Buffer.from([100, 101, 102, 103]);
  const json = buf.toJSON();

  let index = 0;
  for (const byte of buf) {
    if (byte !== json.data[index]) return false;
    index++;
  }

  if (index !== json.data.length) return false;

  return true;
});

test('Buffer.compare 与 toJSON 深度比较一致', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);

  const cmp12 = Buffer.compare(buf1, buf2);
  const cmp13 = Buffer.compare(buf1, buf3);

  const jsonEqual = JSON.stringify(buf1.toJSON()) === JSON.stringify(buf2.toJSON());
  const jsonNotEqual = JSON.stringify(buf1.toJSON()) !== JSON.stringify(buf3.toJSON());

  if (cmp12 !== 0 || !jsonEqual) return false;
  if (cmp13 >= 0 || !jsonNotEqual) return false;

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
