// buf.toString() - Part 1: Basic Functionality
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

// 基本功能测试
test('空 Buffer 转字符串', () => {
  const buf = Buffer.alloc(0);
  const result = buf.toString();
  if (result !== '') throw new Error(`预期 "", 实际 "${result}"`);
  return true;
});

test('默认 UTF-8 编码', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString();
  if (result !== 'hello') throw new Error(`预期 "hello", 实际 "${result}"`);
  return true;
});

test('不传参数使用 UTF-8', () => {
  const buf = Buffer.from('测试');
  const result = buf.toString();
  if (result !== '测试') throw new Error(`预期 "测试", 实际 "${result}"`);
  return true;
});

test('单字节字符', () => {
  const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  const result = buf.toString();
  if (result !== 'Hello') throw new Error(`预期 "Hello", 实际 "${result}"`);
  return true;
});

test('多字节 UTF-8 字符（中文）', () => {
  const buf = Buffer.from('你好世界');
  const result = buf.toString();
  if (result !== '你好世界') throw new Error(`预期 "你好世界", 实际 "${result}"`);
  return true;
});

test('多字节 UTF-8 字符（emoji）', () => {
  const buf = Buffer.from('😀😃😄');
  const result = buf.toString();
  if (result !== '😀😃😄') throw new Error(`预期 "😀😃😄", 实际 "${result}"`);
  return true;
});

test('混合单字节和多字节', () => {
  const buf = Buffer.from('Hello 世界 🌍');
  const result = buf.toString();
  if (result !== 'Hello 世界 🌍') throw new Error(`预期 "Hello 世界 🌍", 实际 "${result}"`);
  return true;
});

test('长度为 1 的 Buffer', () => {
  const buf = Buffer.from('A');
  const result = buf.toString();
  if (result !== 'A') throw new Error(`预期 "A", 实际 "${result}"`);
  return true;
});

test('大 Buffer（1000 字节）', () => {
  const str = 'a'.repeat(1000);
  const buf = Buffer.from(str);
  const result = buf.toString();
  if (result !== str) throw new Error(`预期长度 1000, 实际长度 ${result.length}`);
  return true;
});

test('包含 null 字符', () => {
  const buf = Buffer.from([0x48, 0x00, 0x69]);
  const result = buf.toString();
  if (result !== 'H\0i') throw new Error(`预期 "H\\0i", 实际 "${result}"`);
  return true;
});

test('全部是 null 字符', () => {
  const buf = Buffer.alloc(5);
  const result = buf.toString();
  if (result !== '\0\0\0\0\0') throw new Error(`预期 5 个 null 字符, 实际 "${result}"`);
  return true;
});

test('返回值类型是 string', () => {
  const buf = Buffer.from('test');
  const result = buf.toString();
  if (typeof result !== 'string') throw new Error(`预期类型 string, 实际 ${typeof result}`);
  return true;
});

test('不修改原 Buffer', () => {
  const buf = Buffer.from('test');
  const before = buf[0];
  buf.toString();
  if (buf[0] !== before) throw new Error('toString 修改了原 Buffer');
  return true;
});

test('连续调用返回相同结果', () => {
  const buf = Buffer.from('consistent');
  const r1 = buf.toString();
  const r2 = buf.toString();
  if (r1 !== r2) throw new Error(`两次调用结果不一致: "${r1}" vs "${r2}"`);
  return true;
});

test('空格字符', () => {
  const buf = Buffer.from('   ');
  const result = buf.toString();
  if (result !== '   ') throw new Error(`预期 3 个空格, 实际 "${result}"`);
  return true;
});

test('换行符', () => {
  const buf = Buffer.from('line1\nline2');
  const result = buf.toString();
  if (result !== 'line1\nline2') throw new Error(`预期包含换行符, 实际 "${result}"`);
  return true;
});

test('制表符', () => {
  const buf = Buffer.from('col1\tcol2');
  const result = buf.toString();
  if (result !== 'col1\tcol2') throw new Error(`预期包含制表符, 实际 "${result}"`);
  return true;
});

test('回车符', () => {
  const buf = Buffer.from('line1\r\nline2');
  const result = buf.toString();
  if (result !== 'line1\r\nline2') throw new Error(`预期包含回车换行, 实际 "${result}"`);
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
  console.log('\n' + JSON.stringify(errorResult, null, 2));
  return errorResult;
}
