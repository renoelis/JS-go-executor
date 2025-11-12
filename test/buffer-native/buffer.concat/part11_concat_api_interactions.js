// Buffer.concat() - Deep Missing Scenarios Part 2: Properties and Buffer API Interactions
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

// length 和 byteLength 属性
test('concat结果的length属性', () => {
  const result = Buffer.concat([Buffer.from('hello'), Buffer.from('world')]);
  return result.length === 10 && typeof result.length === 'number';
});

test('concat结果的byteLength属性', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return result.byteLength === result.length && result.byteLength === 4;
});

test('concat中文字符的byteLength', () => {
  const result = Buffer.concat([Buffer.from('你好'), Buffer.from('世界')]);
  return result.byteLength === 12 && result.length === 12;
});

test('concat结果的byteOffset属性', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return typeof result.byteOffset === 'number';
});

test('concat结果的buffer属性存在', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return result.buffer instanceof ArrayBuffer;
});

// Symbol.iterator 和迭代器
test('concat结果有Symbol.iterator方法', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  return typeof result[Symbol.iterator] === 'function';
});

test('concat结果可以使用for...of遍历', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  const values = [];
  for (const byte of result) {
    values.push(byte);
  }
  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

test('concat结果可以使用扩展运算符', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  const arr = [...result];
  return arr.length === 3 && arr[0] === 1 && arr[2] === 3;
});

test('concat结果的entries方法', () => {
  const result = Buffer.concat([Buffer.from([10, 20])]);
  const entries = [...result.entries()];
  return entries.length === 2 &&
         entries[0][0] === 0 && entries[0][1] === 10 &&
         entries[1][0] === 1 && entries[1][1] === 20;
});

test('concat结果的keys方法', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  const keys = [...result.keys()];
  return keys.length === 3 && keys[0] === 0 && keys[2] === 2;
});

test('concat结果的values方法', () => {
  const result = Buffer.concat([Buffer.from([10, 20, 30])]);
  const values = [...result.values()];
  return values.length === 3 && values[0] === 10 && values[2] === 30;
});

// Buffer.isBuffer 和类型检查
test('Buffer.isBuffer检查concat结果', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return Buffer.isBuffer(result) === true;
});

test('concat结果instanceof Buffer', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return result instanceof Buffer;
});

test('concat结果instanceof Uint8Array', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  return result instanceof Uint8Array;
});

// Buffer.compare 相关
test('concat结果与原Buffer compare为0', () => {
  const buf = Buffer.from('test');
  const result = Buffer.concat([buf]);
  return Buffer.compare(buf, result) === 0;
});

test('concat多个Buffer后与手动拼接compare', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const concat1 = Buffer.concat([buf1, buf2]);
  const concat2 = Buffer.from('helloworld');
  return Buffer.compare(concat1, concat2) === 0;
});

// concat 结果的索引访问
test('concat结果通过正索引访问', () => {
  const result = Buffer.concat([Buffer.from([100, 200])]);
  return result[0] === 100 && result[1] === 200;
});

test('concat结果通过负索引访问返回undefined', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  return result[-1] === undefined && result[-10] === undefined;
});

test('concat结果通过超界索引访问返回undefined', () => {
  const result = Buffer.concat([Buffer.from([1, 2])]);
  return result[10] === undefined && result[1000] === undefined;
});

test('concat结果可以通过索引写入', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])], 10);
  result[5] = 99;
  return result[5] === 99;
});

// concat 后使用其他 Buffer 方法
test('concat后调用slice方法', () => {
  const result = Buffer.concat([Buffer.from('hello'), Buffer.from('world')]);
  const sliced = result.slice(0, 5);
  return sliced.toString() === 'hello';
});

test('concat后调用subarray方法', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3, 4])]);
  const sub = result.subarray(1, 3);
  return sub.length === 2 && sub[0] === 2 && sub[1] === 3;
});

test('concat后调用indexOf方法', () => {
  const result = Buffer.concat([Buffer.from('hello'), Buffer.from('world')]);
  return result.indexOf('world') === 5 && result.indexOf('hello') === 0;
});

test('concat后调用includes方法', () => {
  const result = Buffer.concat([Buffer.from('test'), Buffer.from('data')]);
  return result.includes('test') === true && result.includes('data') === true;
});

test('concat后调用lastIndexOf方法', () => {
  const result = Buffer.concat([Buffer.from('aa'), Buffer.from('aa')]);
  return result.lastIndexOf('a') === 3;
});

test('concat后调用fill方法', () => {
  const result = Buffer.concat([Buffer.from('test')], 10);
  result.fill(0, 4);
  return result[4] === 0 && result[9] === 0 && result[0] === 116;
});

test('concat后调用copy方法', () => {
  const result = Buffer.concat([Buffer.from('test')]);
  const target = Buffer.alloc(10);
  result.copy(target, 0);
  return target.toString('utf8', 0, 4) === 'test';
});

test('concat后调用equals方法', () => {
  const buf = Buffer.from('test');
  const result = Buffer.concat([buf]);
  return result.equals(buf) === true;
});

test('concat后调用swap16方法', () => {
  const result = Buffer.concat([Buffer.from([0x12, 0x34, 0x56, 0x78])]);
  result.swap16();
  return result[0] === 0x34 && result[1] === 0x12;
});

test('concat后调用swap32方法', () => {
  const result = Buffer.concat([Buffer.from([0x12, 0x34, 0x56, 0x78])]);
  result.swap32();
  return result[0] === 0x78 && result[3] === 0x12;
});

test('concat后调用toJSON方法', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  const json = result.toJSON();
  return json.type === 'Buffer' &&
         json.data[0] === 1 && json.data[2] === 3;
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
