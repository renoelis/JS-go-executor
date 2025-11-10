// Part 3 - Section 1: 错误处理（前6个测试）
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result.pass) {
      tests.push({ name, status: '✅', details: result.message });
    } else {
      tests.push({ name, status: '❌', details: result.message });
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

test('无参数调用', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare();
    return { pass: false, message: '应该抛出错误' };
  } catch (e) {
    return { pass: e.name === 'TypeError', message: `OK: ${e.message}` };
  }
});

test('传入 null', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(null);
    return { pass: false, message: '应该抛出错误' };
  } catch (e) {
    return { pass: e.name === 'TypeError', message: `OK: ${e.message}` };
  }
});

test('传入 undefined', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(undefined);
    return { pass: false, message: '应该抛出错误' };
  } catch (e) {
    return { pass: e.name === 'TypeError', message: `OK: ${e.message}` };
  }
});

test('传入字符串', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare('test');
    return { pass: false, message: '应该抛出错误' };
  } catch (e) {
    return { pass: e.name === 'TypeError', message: `OK: ${e.message}` };
  }
});

test('传入数字', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare(123);
    return { pass: false, message: '应该抛出错误' };
  } catch (e) {
    return { pass: e.name === 'TypeError', message: `OK: ${e.message}` };
  }
});

test('传入普通对象', () => {
  const buf = Buffer.from('test');
  try {
    buf.compare({ length: 4 });
    return { pass: false, message: '应该抛出错误' };
  } catch (e) {
    return { pass: e.name === 'TypeError', message: `OK: ${e.message}` };
  }
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed },
  tests
};

console.log(JSON.stringify(result, null, 2));
return result;

