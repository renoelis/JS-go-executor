// buf.toJSON() - JSON.stringify Integration Tests
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

// JSON.stringify 集成测试
test('JSON.stringify 使用 toJSON 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);
  if (parsed.type !== 'Buffer') return false;
  if (!Array.isArray(parsed.data)) return false;
  if (parsed.data.length !== 3) return false;
  if (parsed.data[0] !== 1 || parsed.data[1] !== 2 || parsed.data[2] !== 3) return false;
  return true;
});

test('JSON.stringify 空 Buffer', () => {
  const buf = Buffer.from([]);
  const str = JSON.stringify(buf);
  const parsed = JSON.parse(str);
  if (parsed.type !== 'Buffer') return false;
  if (!Array.isArray(parsed.data)) return false;
  if (parsed.data.length !== 0) return false;
  return true;
});

test('JSON.stringify 包含 Buffer 的对象', () => {
  const obj = {
    name: 'test',
    buffer: Buffer.from([10, 20, 30])
  };
  const str = JSON.stringify(obj);
  const parsed = JSON.parse(str);
  if (parsed.name !== 'test') return false;
  if (parsed.buffer.type !== 'Buffer') return false;
  if (parsed.buffer.data.length !== 3) return false;
  if (parsed.buffer.data[0] !== 10 || parsed.buffer.data[1] !== 20 || parsed.buffer.data[2] !== 30) return false;
  return true;
});

test('JSON.stringify 包含多个 Buffer 的对象', () => {
  const obj = {
    buf1: Buffer.from([1, 2]),
    buf2: Buffer.from([3, 4, 5])
  };
  const str = JSON.stringify(obj);
  const parsed = JSON.parse(str);
  if (parsed.buf1.type !== 'Buffer') return false;
  if (parsed.buf1.data.length !== 2) return false;
  if (parsed.buf1.data[0] !== 1 || parsed.buf1.data[1] !== 2) return false;
  if (parsed.buf2.type !== 'Buffer') return false;
  if (parsed.buf2.data.length !== 3) return false;
  if (parsed.buf2.data[0] !== 3 || parsed.buf2.data[1] !== 4 || parsed.buf2.data[2] !== 5) return false;
  return true;
});

test('JSON.stringify Buffer 数组', () => {
  const arr = [
    Buffer.from([1, 2]),
    Buffer.from([3, 4])
  ];
  const str = JSON.stringify(arr);
  const parsed = JSON.parse(str);
  if (!Array.isArray(parsed)) return false;
  if (parsed.length !== 2) return false;
  if (parsed[0].type !== 'Buffer' || parsed[1].type !== 'Buffer') return false;
  if (parsed[0].data.length !== 2 || parsed[1].data.length !== 2) return false;
  return true;
});

test('JSON.stringify 嵌套结构中的 Buffer', () => {
  const obj = {
    level1: {
      level2: {
        buffer: Buffer.from([100, 200])
      }
    }
  };
  const str = JSON.stringify(obj);
  const parsed = JSON.parse(str);
  if (parsed.level1.level2.buffer.type !== 'Buffer') return false;
  if (parsed.level1.level2.buffer.data.length !== 2) return false;
  if (parsed.level1.level2.buffer.data[0] !== 100 || parsed.level1.level2.buffer.data[1] !== 200) return false;
  return true;
});

test('JSON.stringify 带 replacer 函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const str = JSON.stringify(buf, (key, value) => {
    return value;
  });
  const parsed = JSON.parse(str);
  if (parsed.type !== 'Buffer') return false;
  if (parsed.data.length !== 3) return false;
  return true;
});

test('JSON.stringify 带 space 参数', () => {
  const buf = Buffer.from([1, 2]);
  const str = JSON.stringify(buf, null, 2);
  if (!str.includes('\n')) return false; // 应该有换行符
  const parsed = JSON.parse(str);
  if (parsed.type !== 'Buffer') return false;
  if (parsed.data.length !== 2) return false;
  return true;
});

test('toJSON 返回的对象可以被修改而不影响原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  const json = buf.toJSON();
  json.data[0] = 99;
  json.type = 'Modified';

  // 原 Buffer 不应该被修改
  if (buf[0] !== 1) return false;

  // 再次调用 toJSON 应该返回原始值
  const json2 = buf.toJSON();
  if (json2.type !== 'Buffer') return false;
  if (json2.data[0] !== 1) return false;

  return true;
});

test('多次调用 toJSON 返回独立的对象', () => {
  const buf = Buffer.from([10, 20]);
  const json1 = buf.toJSON();
  const json2 = buf.toJSON();

  // 修改第一个返回值
  json1.data[0] = 99;

  // 第二个返回值不应该被影响
  if (json2.data[0] !== 10) return false;

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
