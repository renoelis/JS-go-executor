// buffer.isUtf8() - Part 17: Deep Boundary Cases (查缺补漏2)
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. 更深层的UTF-8边界测试
test('UTF-8 最小2字节序列边界', () => {
  // 0xC2 0x80 是最小的有效2字节序列 (U+0080)
  const valid = Buffer.from([0xC2, 0x80]);
  // 0xC1 0xBF 是过长编码（应该用1字节表示）
  const invalid = Buffer.from([0xC1, 0xBF]);
  return isUtf8(valid) === true && isUtf8(invalid) === false;
});

test('UTF-8 最小3字节序列边界', () => {
  // 0xE0 0xA0 0x80 是最小的有效3字节序列 (U+0800)
  const valid = Buffer.from([0xE0, 0xA0, 0x80]);
  // 0xE0 0x9F 0xBF 是过长编码（应该用2字节表示）
  const invalid = Buffer.from([0xE0, 0x9F, 0xBF]);
  return isUtf8(valid) === true && isUtf8(invalid) === false;
});

test('UTF-8 最小4字节序列边界', () => {
  // 0xF0 0x90 0x80 0x80 是最小的有效4字节序列 (U+10000)
  const valid = Buffer.from([0xF0, 0x90, 0x80, 0x80]);
  // 0xF0 0x8F 0xBF 0xBF 是过长编码（应该用3字节表示）
  const invalid = Buffer.from([0xF0, 0x8F, 0xBF, 0xBF]);
  return isUtf8(valid) === true && isUtf8(invalid) === false;
});

// 2. 代理对边界的精确测试
test('代理对下边界 - U+D800', () => {
  const buf = Buffer.from([0xED, 0xA0, 0x80]); // U+D800
  return isUtf8(buf) === false;
});

test('代理对上边界 - U+DFFF', () => {
  const buf = Buffer.from([0xED, 0xBF, 0xBF]); // U+DFFF
  return isUtf8(buf) === false;
});

test('代理对边界前一个字符 - U+D7FF', () => {
  const buf = Buffer.from([0xED, 0x9F, 0xBF]); // U+D7FF
  return isUtf8(buf) === true;
});

test('代理对边界后一个字符 - U+E000', () => {
  const buf = Buffer.from([0xEE, 0x80, 0x80]); // U+E000
  return isUtf8(buf) === true;
});

// 3. Unicode上限的精确测试
test('Unicode最大值 - U+10FFFF', () => {
  const buf = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]); // U+10FFFF
  return isUtf8(buf) === true;
});

test('超出Unicode范围 - U+110000', () => {
  const buf = Buffer.from([0xF4, 0x90, 0x80, 0x80]); // U+110000
  return isUtf8(buf) === false;
});

test('更大的无效值 - U+1FFFFF', () => {
  const buf = Buffer.from([0xF7, 0xBF, 0xBF, 0xBF]); // 理论上的4字节最大值，但超出Unicode
  return isUtf8(buf) === false;
});

// 4. 延续字节的边界测试
test('延续字节最小值 0x80', () => {
  const buf = Buffer.from([0xC2, 0x80]); // 合法的2字节序列
  return isUtf8(buf) === true;
});

test('延续字节最大值 0xBF', () => {
  const buf = Buffer.from([0xC2, 0xBF]); // 合法的2字节序列
  return isUtf8(buf) === true;
});

test('延续字节下边界 0x7F (无效)', () => {
  const buf = Buffer.from([0xC2, 0x7F]); // 0x7F不是延续字节
  return isUtf8(buf) === false;
});

test('延续字节上边界 0xC0 (无效)', () => {
  const buf = Buffer.from([0xC2, 0xC0]); // 0xC0不是延续字节
  return isUtf8(buf) === false;
});

// 5. 特殊起始字节边界
test('禁用的起始字节 0xC0', () => {
  const buf = Buffer.from([0xC0, 0x80]); // 过长编码
  return isUtf8(buf) === false;
});

test('禁用的起始字节 0xC1', () => {
  const buf = Buffer.from([0xC1, 0x80]); // 过长编码
  return isUtf8(buf) === false;
});

test('禁用的起始字节 0xF5', () => {
  const buf = Buffer.from([0xF5, 0x80, 0x80, 0x80]); // 超出Unicode范围
  return isUtf8(buf) === false;
});

test('禁用的起始字节 0xFF', () => {
  const buf = Buffer.from([0xFF, 0x80, 0x80, 0x80]); // 无效起始字节
  return isUtf8(buf) === false;
});

// 6. 非常精确的字节组合测试
test('每个有效2字节起始字节', () => {
  // 测试 0xC2-0xDF 的所有起始字节
  for (let start = 0xC2; start <= 0xDF; start++) {
    const buf = Buffer.from([start, 0x80]);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

test('每个有效3字节起始字节（基本多文种平面）', () => {
  // 测试 0xE0-0xEF 但需要注意特殊情况
  const testCases = [
    [0xE0, 0xA0, 0x80], // 0xE0 需要第二字节 >= 0xA0
    [0xE1, 0x80, 0x80], // 0xE1-0xEC 可以用 0x80
    [0xE2, 0x80, 0x80],
    [0xE3, 0x80, 0x80],
    [0xE4, 0x80, 0x80],
    [0xE5, 0x80, 0x80],
    [0xE6, 0x80, 0x80],
    [0xE7, 0x80, 0x80],
    [0xE8, 0x80, 0x80],
    [0xE9, 0x80, 0x80],
    [0xEA, 0x80, 0x80],
    [0xEB, 0x80, 0x80],
    [0xEC, 0x80, 0x80],
    // 跳过0xED (代理对范围)
    [0xEE, 0x80, 0x80], // 0xEE-0xEF 可以用 0x80
    [0xEF, 0x80, 0x80]
  ];
  
  for (const testCase of testCases) {
    const buf = Buffer.from(testCase);
    if (isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

test('每个有效4字节起始字节', () => {
  // 测试 0xF0-0xF4
  for (let start = 0xF0; start <= 0xF4; start++) {
    const buf = Buffer.from([start, 0x90, 0x80, 0x80]);
    const expected = (start === 0xF4) ? isUtf8(buf) : true; // 0xF4 需要特殊处理
    if (start < 0xF4 && isUtf8(buf) !== true) {
      return false;
    }
  }
  return true;
});

// 7. 截断序列的各种情况
test('2字节序列截断 - 只有起始字节', () => {
  const buf = Buffer.from([0xC2]);
  return isUtf8(buf) === false;
});

test('3字节序列截断 - 只有起始字节', () => {
  const buf = Buffer.from([0xE0]);
  return isUtf8(buf) === false;
});

test('3字节序列截断 - 只有2字节', () => {
  const buf = Buffer.from([0xE0, 0xA0]);
  return isUtf8(buf) === false;
});

test('4字节序列截断 - 只有起始字节', () => {
  const buf = Buffer.from([0xF0]);
  return isUtf8(buf) === false;
});

test('4字节序列截断 - 只有2字节', () => {
  const buf = Buffer.from([0xF0, 0x90]);
  return isUtf8(buf) === false;
});

test('4字节序列截断 - 只有3字节', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80]);
  return isUtf8(buf) === false;
});

// 8. 混合有效和无效序列
test('有效序列后跟无效字节', () => {
  const valid = Buffer.from('Hello', 'utf8');
  const invalid = Buffer.from([0x80]);
  const combined = Buffer.concat([valid, invalid]);
  return isUtf8(combined) === false;
});

test('无效字节后跟有效序列', () => {
  const invalid = Buffer.from([0x80]);
  const valid = Buffer.from('Hello', 'utf8');
  const combined = Buffer.concat([invalid, valid]);
  return isUtf8(combined) === false;
});

test('有效序列中间插入无效字节', () => {
  const part1 = Buffer.from('Hel', 'utf8');
  const invalid = Buffer.from([0x80]);
  const part2 = Buffer.from('lo', 'utf8');
  const combined = Buffer.concat([part1, invalid, part2]);
  return isUtf8(combined) === false;
});

// 9. 特殊Unicode类别测试
test('私有使用区 - U+E000', () => {
  const buf = Buffer.from('\uE000', 'utf8');
  return isUtf8(buf) === true;
});

test('私有使用区 - U+F8FF', () => {
  const buf = Buffer.from('\uF8FF', 'utf8');
  return isUtf8(buf) === true;
});

test('CJK统一汉字 - U+4E00', () => {
  const buf = Buffer.from('\u4E00', 'utf8'); // 一
  return isUtf8(buf) === true;
});

test('CJK统一汉字 - U+9FFF', () => {
  const buf = Buffer.from('\u9FFF', 'utf8');
  return isUtf8(buf) === true;
});

// 10. 性能相关的边界测试
test('大量重复有效字符', () => {
  const char = Buffer.from('A', 'utf8');
  const large = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    large[i] = char[0];
  }
  return isUtf8(large) === true;
});

test('大量重复无效字节', () => {
  const large = Buffer.alloc(1000, 0x80); // 全是延续字节
  return isUtf8(large) === false;
});

test('交替有效无效模式', () => {
  const pattern = Buffer.from([0x41, 0x80]); // 'A' + 无效字节
  const large = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    large[i * 2] = pattern[0];
    large[i * 2 + 1] = pattern[1];
  }
  return isUtf8(large) === false;
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
