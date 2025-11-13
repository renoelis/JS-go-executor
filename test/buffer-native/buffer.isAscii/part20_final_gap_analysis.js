// buffer.isAscii() - Part 20: Final Gap Analysis and Ultimate Edge Cases
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 最终函数调用边界测试
test('call/apply 调用方式一致性', () => {
  const buf = Buffer.from('test');
  const result1 = isAscii(buf);
  const result2 = isAscii.call(null, buf);
  const result3 = isAscii.apply(null, [buf]);
  return result1 === result2 && result2 === result3 && result1 === true;
});

test('bind 调用方式', () => {
  const buf = Buffer.from('test');
  const boundIsAscii = isAscii.bind(null);
  return boundIsAscii(buf) === isAscii(buf) && isAscii(buf) === true;
});

test('this 上下文无关性', () => {
  const buf = Buffer.from('test');
  const obj = { isAscii };
  return obj.isAscii(buf) === isAscii(buf) && isAscii(buf) === true;
});

// 极端 Unicode 和编码边界
test('UTF-8 BOM 标记', () => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
  return isAscii(bom) === false;
});

test('UTF-16 BOM 标记', () => {
  const bom = Buffer.from([0xFF, 0xFE]); // UTF-16 LE BOM
  return isAscii(bom) === false;
});

test('高代理对字节', () => {
  const highSurrogate = Buffer.from([0xED, 0xA0, 0x80]); // U+D800 UTF-8
  return isAscii(highSurrogate) === false;
});

test('低代理对字节', () => {
  const lowSurrogate = Buffer.from([0xED, 0xB0, 0x80]); // U+DC00 UTF-8
  return isAscii(lowSurrogate) === false;
});

test('私用区字符', () => {
  const privateUse = Buffer.from([0xEE, 0x80, 0x80]); // U+E000 UTF-8
  return isAscii(privateUse) === false;
});

// 异常状态和恢复测试
test('连续异常调用后正常调用', () => {
  // 先进行一些会抛出异常的调用
  const exceptions = [null, undefined, 'string', 123, {}];
  let exceptionCount = 0;
  
  for (const invalid of exceptions) {
    try {
      isAscii(invalid);
    } catch (e) {
      exceptionCount++;
    }
  }
  
  // 然后进行正常调用
  const buf = Buffer.from('test');
  const normalResult = isAscii(buf);
  
  return exceptionCount === exceptions.length && normalResult === true;
});

// 内存和性能压力边界
test('重复相同操作稳定性', () => {
  const buf = Buffer.from('stable test');
  const results = [];
  
  for (let i = 0; i < 1000; i++) {
    results.push(isAscii(buf));
  }
  
  return results.every(r => r === true) && results.length === 1000;
});

test('内存分配释放循环', () => {
  for (let i = 0; i < 50; i++) {
    const size = Math.floor(Math.random() * 1000) + 1;
    const buf = Buffer.alloc(size, 0x41 + (i % 26));
    if (!isAscii(buf)) return false;
  }
  return true;
});

// 算法边界和数据模式
test('交替 0x00 和 0x7F 模式', () => {
  const pattern = [];
  for (let i = 0; i < 100; i++) {
    pattern.push(i % 2 === 0 ? 0x00 : 0x7F);
  }
  const buf = Buffer.from(pattern);
  return isAscii(buf) === true;
});

test('递增 ASCII 值模式', () => {
  const pattern = [];
  for (let i = 0; i < 128; i++) {
    pattern.push(i);
  }
  const buf = Buffer.from(pattern);
  return isAscii(buf) === true;
});

test('递减 ASCII 值模式', () => {
  const pattern = [];
  for (let i = 127; i >= 0; i--) {
    pattern.push(i);
  }
  const buf = Buffer.from(pattern);
  return isAscii(buf) === true;
});

test('随机 ASCII 字符模式', () => {
  const pattern = [];
  for (let i = 0; i < 100; i++) {
    pattern.push(Math.floor(Math.random() * 128));
  }
  const buf = Buffer.from(pattern);
  return isAscii(buf) === true;
});

// 特殊数值边界
test('浮点数精度边界', () => {
  // 这些不是 Buffer，应该抛出 TypeError
  const floats = [0.1, 0.9, 1.0000001, Math.PI, Math.E];
  let allThrew = true;
  
  for (const float of floats) {
    try {
      isAscii(float);
      allThrew = false;
      break;
    } catch (e) {
      if (!(e instanceof TypeError)) {
        allThrew = false;
        break;
      }
    }
  }
  
  return allThrew;
});

test('超大数值', () => {
  const bigNumbers = [Number.MAX_SAFE_INTEGER, Number.MAX_VALUE];
  let allThrew = true;
  
  for (const num of bigNumbers) {
    try {
      isAscii(num);
      allThrew = false;
      break;
    } catch (e) {
      if (!(e instanceof TypeError)) {
        allThrew = false;
        break;
      }
    }
  }
  
  return allThrew;
});

// TypedArray 特殊构造方式
test('从另一个 TypedArray 创建', () => {
  const source = new Uint8Array([0x48, 0x65, 0x6C]);
  const copy = new Uint8Array(source);
  return isAscii(copy) === true;
});

test('从 ArrayBuffer 的特定部分创建', () => {
  const ab = new ArrayBuffer(100);
  const fullView = new Uint8Array(ab);
  fullView.fill(0x41);
  fullView[50] = 0x80; // 设置中间为非 ASCII
  
  const beforeView = new Uint8Array(ab, 0, 50);
  const afterView = new Uint8Array(ab, 51, 49);
  
  return isAscii(beforeView) === true && isAscii(afterView) === true;
});

// 边缘情况组合测试
test('空 + 非空 Buffer 比较', () => {
  const empty = Buffer.from([]);
  const nonEmpty = Buffer.from([0x41]);
  return isAscii(empty) === true && isAscii(nonEmpty) === true;
});

test('最小最大长度 Buffer', () => {
  const min = Buffer.from([0x00]); // 最小非空
  const max = Buffer.alloc(10000, 0x7F); // 较大 Buffer
  return isAscii(min) === true && isAscii(max) === true;
});

// 实际应用场景模拟
test('HTTP 头部字符串', () => {
  const header = Buffer.from('Content-Type: text/plain; charset=utf-8');
  return isAscii(header) === true;
});

test('XML 声明', () => {
  const xml = Buffer.from('<?xml version="1.0" encoding="UTF-8"?>');
  return isAscii(xml) === true;
});

test('JavaScript 代码片段', () => {
  const js = Buffer.from('function test() { return true; }');
  return isAscii(js) === true;
});

test('CSS 样式规则', () => {
  const css = Buffer.from('body { margin: 0; padding: 0; }');
  return isAscii(css) === true;
});

test('Shell 命令', () => {
  const shell = Buffer.from('ls -la | grep test');
  return isAscii(shell) === true;
});

// 最终极端组合
test('所有测试类型组合验证', () => {
  const testCases = [
    Buffer.from([]), // 空
    Buffer.from([0x00]), // 最小 ASCII
    Buffer.from([0x7F]), // 最大 ASCII
    Buffer.from([0x80]), // 最小非 ASCII
    Buffer.from('hello'), // 普通字符串
    new Uint8Array([0x41, 0x42]), // TypedArray
    new ArrayBuffer(0) // 空 ArrayBuffer
  ];
  
  const expected = [true, true, true, false, true, true, true];
  const results = testCases.map(tc => {
    try {
      return isAscii(tc);
    } catch (e) {
      return null; // 异常情况
    }
  });
  
  return results.every((result, i) => result === expected[i]);
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
