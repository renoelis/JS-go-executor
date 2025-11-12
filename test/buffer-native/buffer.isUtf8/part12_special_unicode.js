// buffer.isUtf8() - Part 12: Node Behavior Edge Cases
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

// 非常规但有效的 UTF-8
test('零宽度非断字符 (U+FEFF ZWN BSP)', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF]); // BOM / ZWNBSP
  return isUtf8(buf) === true;
});

test('替换字符 (U+FFFD)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBD]); // �
  return isUtf8(buf) === true;
});

test('对象替换字符 (U+FFFC)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBC]);
  return isUtf8(buf) === true;
});

test('非字符 U+FFFE (但在 UTF-8 中编码有效)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBE]);
  return isUtf8(buf) === true; // UTF-8 有效，虽然不是有效 Unicode 字符
});

test('非字符 U+FFFF (但在 UTF-8 中编码有效)', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBF]);
  return isUtf8(buf) === true; // UTF-8 有效，虽然不是有效 Unicode 字符
});

// 连续 BOM
test('多个 BOM 连续', () => {
  const bom = [0xEF, 0xBB, 0xBF];
  const buf = Buffer.from([...bom, ...bom, ...bom]);
  return isUtf8(buf) === true;
});

test('BOM + 中文', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF, ...Buffer.from('你好', 'utf8')]);
  return isUtf8(buf) === true;
});

// 控制字符的各种组合
test('所有 C0 控制字符 (0x00-0x1F)', () => {
  const buf = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
  return isUtf8(buf) === true; // 所有 C0 控制字符都是有效 UTF-8
});

test('DEL 字符 (0x7F)', () => {
  const buf = Buffer.from([0x7F]);
  return isUtf8(buf) === true;
});

test('C1 控制字符的 UTF-8 编码 (U+0080-U+009F)', () => {
  const buf = Buffer.from([
    0xC2, 0x80, // U+0080
    0xC2, 0x81, // U+0081
    0xC2, 0x9F  // U+009F
  ]);
  return isUtf8(buf) === true;
});

// 私用区字符
test('基本私用区 - U+E000', () => {
  const buf = Buffer.from([0xEE, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('基本私用区 - U+F8FF', () => {
  const buf = Buffer.from([0xEF, 0xA3, 0xBF]);
  return isUtf8(buf) === true;
});

test('补充私用区 A - U+F0000', () => {
  const buf = Buffer.from([0xF3, 0xB0, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

test('补充私用区 B - U+100000', () => {
  const buf = Buffer.from([0xF4, 0x80, 0x80, 0x80]);
  return isUtf8(buf) === true;
});

// 格式字符
test('软连字符 (U+00AD)', () => {
  const buf = Buffer.from([0xC2, 0xAD]);
  return isUtf8(buf) === true;
});

test('左至右标记 (U+200E)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8E]);
  return isUtf8(buf) === true;
});

test('右至左标记 (U+200F)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8F]);
  return isUtf8(buf) === true;
});

test('零宽度连字符 (U+200C)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8C]);
  return isUtf8(buf) === true;
});

test('零宽度非连字符 (U+200D)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8D]);
  return isUtf8(buf) === true;
});

// 特殊 Emoji 和修饰符
test('Emoji 皮肤色调修饰符 (U+1F3FB)', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0x8F, 0xBB]);
  return isUtf8(buf) === true;
});

test('Emoji + 皮肤色调修饰符', () => {
  const buf = Buffer.from('👋🏻', 'utf8'); // 挥手 + 浅肤色
  return isUtf8(buf) === true;
});

test('Emoji 零宽度连接符序列', () => {
  const buf = Buffer.from('👨‍👩‍👧‍👦', 'utf8'); // 家庭表情
  return isUtf8(buf) === true;
});

test('单独的 ZWJ (U+200D)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8D]);
  return isUtf8(buf) === true; // ZWJ 本身是有效 UTF-8
});

test('区域指示符 - 国旗表情', () => {
  const buf = Buffer.from('🇺🇸', 'utf8'); // 美国国旗
  return isUtf8(buf) === true;
});

// 数学和技术符号
test('数学运算符 (U+2200-U+22FF)', () => {
  const buf = Buffer.from([
    0xE2, 0x88, 0x80, // ∀ (for all)
    0xE2, 0x88, 0x83, // ∃ (there exists)
    0xE2, 0x88, 0x88  // ∈ (element of)
  ]);
  return isUtf8(buf) === true;
});

test('方块绘图符号', () => {
  const buf = Buffer.from([0xE2, 0x96, 0x88]); // █
  return isUtf8(buf) === true;
});

test('布莱叶盲文 (U+2800-U+28FF)', () => {
  const buf = Buffer.from([0xE2, 0xA0, 0x80]); // ⠀
  return isUtf8(buf) === true;
});

// CJK 扩展区
test('CJK 扩展 A (U+3400-U+4DBF)', () => {
  const buf = Buffer.from([0xE3, 0x90, 0x80]); // 㐀
  return isUtf8(buf) === true;
});

test('CJK 扩展 B (U+20000-U+2A6DF)', () => {
  const buf = Buffer.from([0xF0, 0xA0, 0x80, 0x80]); // 𠀀
  return isUtf8(buf) === true;
});

test('CJK 兼容汉字 (U+F900-U+FAFF)', () => {
  const buf = Buffer.from([0xEF, 0xA4, 0x80]); // 豈
  return isUtf8(buf) === true;
});

// 特殊空格字符
test('em 空格 (U+2003)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x83]);
  return isUtf8(buf) === true;
});

test('en 空格 (U+2002)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x82]);
  return isUtf8(buf) === true;
});

test('细空格 (U+2009)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x89]);
  return isUtf8(buf) === true;
});

test('毛发空格 (U+200A)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8A]);
  return isUtf8(buf) === true;
});

test('数字空格 (U+2007)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x87]);
  return isUtf8(buf) === true;
});

test('标点空格 (U+2008)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x88]);
  return isUtf8(buf) === true;
});

// 行分隔符和段分隔符
test('行分隔符 (U+2028)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0xA8]);
  return isUtf8(buf) === true;
});

test('段分隔符 (U+2029)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0xA9]);
  return isUtf8(buf) === true;
});

// 方向标记
test('阿拉伯文字母标记 (U+061C)', () => {
  const buf = Buffer.from([0xD8, 0x9C]);
  return isUtf8(buf) === true;
});

test('左至右嵌入 (U+202A)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0xAA]);
  return isUtf8(buf) === true;
});

test('右至左嵌入 (U+202B)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0xAB]);
  return isUtf8(buf) === true;
});

test('弹出方向格式 (U+202C)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0xAC]);
  return isUtf8(buf) === true;
});

// 特殊标点
test('零宽度空格 (U+200B)', () => {
  const buf = Buffer.from([0xE2, 0x80, 0x8B]);
  return isUtf8(buf) === true;
});

test('字间空格 (U+2060)', () => {
  const buf = Buffer.from([0xE2, 0x81, 0xA0]);
  return isUtf8(buf) === true;
});

test('功能应用 (U+2061)', () => {
  const buf = Buffer.from([0xE2, 0x81, 0xA1]);
  return isUtf8(buf) === true;
});

// 组合附加符号
test('组合锐音符 (U+0301)', () => {
  const buf = Buffer.from([0xCC, 0x81]);
  return isUtf8(buf) === true;
});

test('组合重音符 (U+0300)', () => {
  const buf = Buffer.from([0xCC, 0x80]);
  return isUtf8(buf) === true;
});

test('字母 + 组合符号', () => {
  const buf = Buffer.from([0x65, 0xCC, 0x81]); // e + 锐音符 = é
  return isUtf8(buf) === true;
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
