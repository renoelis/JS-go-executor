// Round 10: Final extreme edge cases, stress tests, and obscure scenarios
const { Buffer } = require('buffer');
const tests = [];
function test(n, f) {
  try {
    const p = f();
    tests.push({name: n, status: p ? '✅' : '❌', passed: p});
    console.log((p ? '✅' : '❌') + ' ' + n);
  } catch(e) {
    tests.push({name: n, status: '❌', passed: false, error: e.message});
    console.log('❌ ' + n + ': ' + e.message);
  }
}

// 超大范围参数
test('start = 0, end = Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', 0, Number.MAX_SAFE_INTEGER);
  return result === 'test';
});

test('start = Number.MAX_SAFE_INTEGER, end = Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  return result === '';
});

test('negative start beyond buffer length', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', -1000, 4);
  return typeof result === 'string';
});

test('end = 0 (should return empty)', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 0, 0) === '';
});

// 特殊数值参数
test('start as -0', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', -0) === 'test';
});

test('end as -0', () => {
  const buf = Buffer.from('test');
  const result = buf.toString('utf8', 0, -0);
  return typeof result === 'string';
});

test('start as +0', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', +0) === 'test';
});

test('start as 0.0', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 0.0) === 'test';
});

test('end as 4.0', () => {
  const buf = Buffer.from('test');
  return buf.toString('utf8', 0, 4.0) === 'test';
});

// 浮点数边界
test('start = 0.5 (rounds to 0)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0.5) === 'hello';
});

test('start = 1.4 (rounds to 1)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 1.4) === 'ello';
});

test('start = 1.6 (rounds to 1)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 1.6) === 'ello';
});

test('end = 3.3 (rounds to 3)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, 3.3) === 'hel';
});

test('end = 3.7 (rounds to 3)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, 3.7) === 'hel';
});

// 类型强制转换
test('start as string "2"', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', '2') === 'llo';
});

test('end as string "3"', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, '3') === 'hel';
});

test('start as boolean true (1)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', true) === 'ello';
});

test('start as boolean false (0)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', false) === 'hello';
});

test('end as boolean true (1)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, true) === 'h';
});

test('end as boolean false (0)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 0, false) === '';
});

test('start as null (0)', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', null) === 'hello';
});

test('end as null (0)', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString('utf8', 0, null);
  return typeof result === 'string';
});

test('start as object coerces', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.toString('utf8', {});
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

test('end as array coerces', () => {
  const buf = Buffer.from('hello');
  try {
    const result = buf.toString('utf8', 0, [3]);
    return typeof result === 'string';
  } catch(e) {
    return true;
  }
});

// 极限大小的 Buffer（立即释放大字符串，避免内存累积）
test('16MB buffer toString utf8', () => {
  const size = 16 * 1024 * 1024;
  const buf = Buffer.alloc(size, 0x61);
  const result = buf.toString('utf8');
  const success = result.length === size;
  // 立即检查并释放（虽然 JS 不保证立即回收，但释放引用）
  return success;
});

test('20MB buffer toString hex', () => {
  const size = 20 * 1024 * 1024;
  const buf = Buffer.alloc(size, 0xAB);
  const result = buf.toString('hex');
  const success = result.length === size * 2;
  // 立即检查并释放
  return success;
});

// 连续相同字节的大 Buffer
test('1MB all 0xFF toString hex', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size, 0xFF);
  const result = buf.toString('hex');
  const success = result.length === size * 2 && result.substring(0, 4) === 'ffff';
  return success;
});

test('1MB all 0x00 toString hex', () => {
  const size = 1024 * 1024;
  const buf = Buffer.alloc(size, 0x00);
  const result = buf.toString('hex');
  const success = result.length === size * 2 && result.substring(0, 4) === '0000';
  return success;
});

// 特殊 Unicode 序列
test('zero-width space (U+200B)', () => {
  const buf = Buffer.from('\u200B');
  return buf.toString().length === 1;
});

test('zero-width non-joiner (U+200C)', () => {
  const buf = Buffer.from('\u200C');
  return buf.toString().length === 1;
});

test('zero-width joiner (U+200D)', () => {
  const buf = Buffer.from('\u200D');
  return buf.toString().length === 1;
});

test('left-to-right mark (U+200E)', () => {
  const buf = Buffer.from('\u200E');
  return buf.toString().length === 1;
});

test('right-to-left mark (U+200F)', () => {
  const buf = Buffer.from('\u200F');
  return buf.toString().length === 1;
});

// 组合字符序列
test('combining acute accent', () => {
  const buf = Buffer.from('e\u0301');
  return buf.toString().length === 2;
});

test('combining grave accent', () => {
  const buf = Buffer.from('a\u0300');
  return buf.toString().length === 2;
});

test('combining tilde', () => {
  const buf = Buffer.from('n\u0303');
  return buf.toString().length === 2;
});

// Emoji 变体选择器
test('emoji with variation selector-16', () => {
  const buf = Buffer.from('☺\uFE0F');
  return buf.toString().length >= 1;
});

test('text with variation selector-15', () => {
  const buf = Buffer.from('☺\uFE0E');
  return buf.toString().length >= 1;
});

// 多个 Emoji 组合
test('flag emoji (regional indicators)', () => {
  const buf = Buffer.from('🇺🇸');
  return buf.toString().length >= 2;
});

test('emoji with skin tone modifier', () => {
  const buf = Buffer.from('👋🏻');
  return buf.toString().length >= 2;
});

test('family emoji (ZWJ sequence)', () => {
  const buf = Buffer.from('👨‍👩‍👧‍👦');
  return buf.toString().length >= 4;
});

// 双向文本
test('Arabic text RTL', () => {
  const buf = Buffer.from('مرحبا');
  return buf.toString() === 'مرحبا';
});

test('Hebrew text RTL', () => {
  const buf = Buffer.from('שלום');
  return buf.toString() === 'שלום';
});

test('mixed LTR and RTL', () => {
  const buf = Buffer.from('Hello שלום World');
  return buf.toString().includes('Hello') && buf.toString().includes('World');
});

// 各种空白字符
test('en space (U+2002)', () => {
  const buf = Buffer.from('\u2002');
  return buf.toString().length === 1;
});

test('em space (U+2003)', () => {
  const buf = Buffer.from('\u2003');
  return buf.toString().length === 1;
});

test('thin space (U+2009)', () => {
  const buf = Buffer.from('\u2009');
  return buf.toString().length === 1;
});

test('hair space (U+200A)', () => {
  const buf = Buffer.from('\u200A');
  return buf.toString().length === 1;
});

test('no-break space (U+00A0)', () => {
  const buf = Buffer.from('\u00A0');
  return buf.toString().length === 1;
});

// 特殊标点和符号
test('bullet point (U+2022)', () => {
  const buf = Buffer.from('\u2022');
  return buf.toString() === '•';
});

test('ellipsis (U+2026)', () => {
  const buf = Buffer.from('\u2026');
  return buf.toString() === '…';
});

test('em dash (U+2014)', () => {
  const buf = Buffer.from('\u2014');
  return buf.toString() === '—';
});

test('en dash (U+2013)', () => {
  const buf = Buffer.from('\u2013');
  return buf.toString() === '–';
});

// 数学符号
test('infinity (U+221E)', () => {
  const buf = Buffer.from('\u221E');
  return buf.toString() === '∞';
});

test('approximately equal (U+2248)', () => {
  const buf = Buffer.from('\u2248');
  return buf.toString() === '≈';
});

test('not equal (U+2260)', () => {
  const buf = Buffer.from('\u2260');
  return buf.toString() === '≠';
});

// 箭头符号
test('right arrow (U+2192)', () => {
  const buf = Buffer.from('\u2192');
  return buf.toString() === '→';
});

test('left arrow (U+2190)', () => {
  const buf = Buffer.from('\u2190');
  return buf.toString() === '←';
});

test('up arrow (U+2191)', () => {
  const buf = Buffer.from('\u2191');
  return buf.toString() === '↑';
});

test('down arrow (U+2193)', () => {
  const buf = Buffer.from('\u2193');
  return buf.toString() === '↓';
});

// 货币符号
test('euro sign (€)', () => {
  const buf = Buffer.from('€');
  return buf.toString() === '€';
});

test('pound sign (£)', () => {
  const buf = Buffer.from('£');
  return buf.toString() === '£';
});

test('yen sign (¥)', () => {
  const buf = Buffer.from('¥');
  return buf.toString() === '¥';
});

test('cent sign (¢)', () => {
  const buf = Buffer.from('¢');
  return buf.toString() === '¢';
});

// 混合复杂内容
test('mixed: emoji, Chinese, symbols, ASCII', () => {
  const content = 'Hello 世界 😀 • → € test';
  const buf = Buffer.from(content);
  return buf.toString() === content;
});

test('mixed: RTL, LTR, emoji, numbers', () => {
  const content = 'Test مرحبا 123 😀 שלום ABC';
  const buf = Buffer.from(content);
  return buf.toString().includes('Test') && buf.toString().includes('ABC');
});

const p = tests.filter(t=>t.passed).length, f = tests.length - p;
const result = {success: f===0, summary: {total: tests.length, passed: p, failed: f, successRate: ((p/tests.length)*100).toFixed(2)+"%"}, tests};
console.log("\n" + JSON.stringify(result, null, 2));
return result;
