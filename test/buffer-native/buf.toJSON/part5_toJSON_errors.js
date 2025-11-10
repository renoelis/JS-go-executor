// buf.toJSON() - Error Cases and This Binding Tests
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

// this 绑定测试
test('toJSON 通过 call 调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON.call(buf);
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3) return false;
  return true;
});

test('toJSON 通过 apply 调用', () => {
  const buf = Buffer.from([4, 5, 6]);
  const json = buf.toJSON.apply(buf);
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 4 || json.data[1] !== 5 || json.data[2] !== 6) return false;
  return true;
});

test('toJSON 保存为变量后调用', () => {
  const buf = Buffer.from([7, 8, 9]);
  const toJSON = buf.toJSON;
  const json = toJSON.call(buf);
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 7 || json.data[1] !== 8 || json.data[2] !== 9) return false;
  return true;
});

test('toJSON 是 Buffer 特有的方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([1, 2, 3]);

  // Buffer 有 toJSON 方法
  if (typeof buf.toJSON !== 'function') return false;

  // 普通 Uint8Array 没有 toJSON 方法
  if (typeof uint8.toJSON !== 'undefined') return false;

  return true;
});

test('toJSON 在普通对象上调用不会抛错但返回异常结果', () => {
  const buf = Buffer.from([1, 2, 3]);

  // 在普通对象上调用 toJSON 不会抛错,但会返回空数据
  const result = buf.toJSON.call({});
  if (result.type !== 'Buffer') return false;
  // 空对象没有字节数据,所以 data 应该是空的
  if (result.data.length !== 0) return false;
  return true;
});

test('toJSON 在 null 上调用应该抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  let threwError = false;
  try {
    buf.toJSON.call(null);
  } catch (e) {
    threwError = true;
  }
  return threwError;
});

test('toJSON 在 undefined 上调用应该抛出错误', () => {
  const buf = Buffer.from([1, 2, 3]);
  let threwError = false;
  try {
    buf.toJSON.call(undefined);
  } catch (e) {
    threwError = true;
  }
  return threwError;
});

test('toJSON 在数组上调用不会抛错', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 在数组上调用 toJSON 不会抛出错误
  const result = buf.toJSON.call([1, 2, 3]);
  if (result.type !== 'Buffer') return false;
  // 数组被当作类似 ArrayLike 对象处理
  if (result.data.length !== 3) return false;
  if (result.data[0] !== 1 || result.data[1] !== 2 || result.data[2] !== 3) return false;
  return true;
});

test('toJSON 可以在 Uint8Array 上通过 call 调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array([4, 5, 6]);

  // 虽然 Uint8Array 没有 toJSON 方法,但可以通过 call 借用 Buffer 的
  const result = buf.toJSON.call(uint8);
  if (result.type !== 'Buffer') return false;
  if (result.data.length !== 3) return false;
  if (result.data[0] !== 4 || result.data[1] !== 5 || result.data[2] !== 6) return false;
  return true;
});

test('toJSON 不接受参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  // 即使传入参数,也应该被忽略
  const json = buf.toJSON(100, 200, 'ignore');
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 1 || json.data[1] !== 2 || json.data[2] !== 3) return false;
  return true;
});

test('Buffer 不支持 freeze 操作', () => {
  const buf = Buffer.from([1, 2, 3]);
  let threwError = false;
  try {
    Object.freeze(buf);
  } catch (e) {
    threwError = true;
    // 应该抛出 "Cannot freeze array buffer views with elements"
    if (!e.message.includes('freeze')) return false;
  }
  // Node v25 中 TypedArray 不能被冻结
  return threwError;
});

test('Buffer 不支持 seal 操作', () => {
  const buf = Buffer.from([1, 2, 3]);
  let threwError = false;
  try {
    Object.seal(buf);
  } catch (e) {
    threwError = true;
    // 应该抛出 "Cannot seal array buffer views with elements"
    if (!e.message.includes('seal')) return false;
  }
  // Node v25 中 TypedArray 不能被密封
  return threwError;
});

test('不可扩展的 Buffer 可以调用 toJSON', () => {
  const buf = Buffer.from([1, 2, 3]);
  Object.preventExtensions(buf);
  const json = buf.toJSON();
  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  return true;
});

test('toJSON 返回的对象不是冻结的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  const isFrozen = Object.isFrozen(json);
  const isSealed = Object.isSealed(json);
  // 返回的对象应该是可修改的
  return !isFrozen && !isSealed;
});

test('toJSON 返回的 data 数组不是冻结的', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  const isFrozen = Object.isFrozen(json.data);
  // 返回的数组应该是可修改的
  return !isFrozen;
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
