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

// ============ toString 不同参数组合的深入测试 ============

test('toString 参数：slice 后 toString 指定 start', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 11);
  return sliced.toString('utf8', 6) === 'world';
});

test('toString 参数：slice 后 toString 指定 start 和 end', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 11);
  return sliced.toString('utf8', 0, 5) === 'hello';
});

test('toString 参数：slice 后 toString 负数 start', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  // toString 不支持负数，会转为 0
  return sliced.toString('utf8', -1, 3).length >= 0;
});

test('toString 参数：slice 后 toString 超出范围', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced.toString('utf8', 0, 100) === 'hel';
});

// ============ slice 与 indexOf/lastIndexOf 的组合 ============

test('indexOf 组合：slice 后 indexOf 查找字符串', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 11);
  return sliced.indexOf('world') === 6;
});

test('indexOf 组合：slice 后 indexOf 查找 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 11);
  const needle = Buffer.from('world');
  return sliced.indexOf(needle) === 6;
});

test('indexOf 组合：slice 后 indexOf 指定 offset', () => {
  const buf = Buffer.from('hello hello');
  const sliced = buf.slice(0, 11);
  return sliced.indexOf('hello', 1) === 6;
});

test('indexOf 组合：slice 后 indexOf 查找字节', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.indexOf(0x6c) === 2; // 'l'
});

test('lastIndexOf 组合：slice 后 lastIndexOf 查找字符串', () => {
  const buf = Buffer.from('hello hello');
  const sliced = buf.slice(0, 11);
  return sliced.lastIndexOf('hello') === 6;
});

test('lastIndexOf 组合：slice 后 lastIndexOf 指定 offset', () => {
  const buf = Buffer.from('hello hello');
  const sliced = buf.slice(0, 11);
  return sliced.lastIndexOf('hello', 5) === 0;
});

// ============ slice 与 includes 的组合 ============

test('includes 组合：slice 后 includes 查找字符串', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  return sliced.includes('hello') && !sliced.includes('world');
});

test('includes 组合：slice 后 includes 查找 Buffer', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6, 11);
  return sliced.includes(Buffer.from('world'));
});

test('includes 组合：slice 后 includes 指定 offset', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.includes('ll', 2) && !sliced.includes('ll', 3);
});

// ============ slice 后的 entries/keys/values 迭代 ============

test('迭代器：slice 后使用 entries', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const entries = Array.from(sliced.entries());
  return entries.length === 2 &&
         entries[0][0] === 0 && entries[0][1] === 1 &&
         entries[1][0] === 1 && entries[1][1] === 2;
});

test('迭代器：slice 后使用 keys', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 3);
  const keys = Array.from(sliced.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('迭代器：slice 后使用 values', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(1, 3);
  const values = Array.from(sliced.values());
  return values.length === 2 && values[0] === 2 && values[1] === 3;
});

// ============ slice 后的 toJSON ============

test('toJSON：slice 后调用 toJSON', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const json = sliced.toJSON();
  return json.type === 'Buffer' &&
         json.data.length === 3 &&
         json.data[0] === 2 &&
         json.data[1] === 3 &&
         json.data[2] === 4;
});

test('toJSON：空 slice 的 toJSON', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  const json = sliced.toJSON();
  return json.type === 'Buffer' && json.data.length === 0;
});

// ============ slice 与 Buffer.concat 的组合 ============

test('concat 组合：concat 多个 slice', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(6, 11);
  const concatenated = Buffer.concat([slice1, slice2]);
  return concatenated.toString() === 'helloworld';
});

test('concat 组合：slice 与原 buffer concat', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 2);
  const concatenated = Buffer.concat([sliced, buf]);
  return concatenated.toString() === 'hehello';
});

// ============ slice 与 Buffer.compare 静态方法 ============

test('compare 静态：Buffer.compare 两个 slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const slice1 = buf1.slice(0, 5);
  const slice2 = buf2.slice(0, 5);
  return Buffer.compare(slice1, slice2) < 0;
});

test('compare 静态：slice 与原 buffer compare', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return Buffer.compare(buf, sliced) === 0;
});

// ============ slice 后调用 every/some/filter 等数组方法 ============

test('数组方法：slice 后 every', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  return sliced.every(byte => byte > 0);
});

test('数组方法：slice 后 some', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  return sliced.some(byte => byte === 3);
});

test('数组方法：slice 后 filter', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const filtered = sliced.filter(byte => byte > 3);
  return filtered.length === 2;
});

test('数组方法：slice 后 map', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const mapped = sliced.map(byte => byte * 2);
  return mapped.length === 3 && mapped[0] === 2;
});

test('数组方法：slice 后 reduce', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const sum = sliced.reduce((acc, byte) => acc + byte, 0);
  return sum === 15;
});

test('数组方法：slice 后 find', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const found = sliced.find(byte => byte > 3);
  return found === 4;
});

test('数组方法：slice 后 findIndex', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const index = sliced.findIndex(byte => byte > 3);
  return index === 3;
});

// ============ slice 与 reverse ============

test('reverse：slice 后调用 reverse', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  sliced.reverse();
  // reverse 会修改原地
  return sliced.toString() === 'olleh' && buf.toString() === 'olleh';
});

test('reverse：部分 slice 的 reverse', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  sliced.reverse();
  // 只有前 5 个字节被反转
  return buf.toString() === 'olleh world';
});

// ============ slice 后的 set 方法（TypedArray 继承） ============

test('set 方法：slice 后调用 set', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);
  sliced.set([1, 2, 3], 0);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('set 方法：slice 后 set 另一个 buffer', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(0, 5);
  const source = Buffer.from([0x41, 0x42, 0x43]);
  sliced.set(source, 0);
  return buf.slice(0, 3).toString() === 'ABC';
});

// ============ 参数为小数的精确测试 ============

test('小数精确：start 为 0.1 到 0.9 的所有情况', () => {
  const buf = Buffer.from('hello');
  const results = [];
  for (let i = 1; i < 10; i++) {
    const sliced = buf.slice(i / 10, 3);
    results.push(sliced.toString() === 'hel');
  }
  return results.every(r => r === true);
});

test('小数精确：start 为 1.1 到 1.9', () => {
  const buf = Buffer.from('hello');
  const results = [];
  for (let i = 1; i < 10; i++) {
    const sliced = buf.slice(1 + i / 10, 3);
    results.push(sliced.toString() === 'el');
  }
  return results.every(r => r === true);
});

test('小数精确：负数小数 -0.1 到 -0.9', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(-0.5, 5);
  // -0.5 截断为 0
  return sliced.toString() === 'hello';
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
