/**
 * Pinyin Style 样式测试
 * 测试所有拼音输出样式
 */

const { pinyin } = require('pinyin');

console.log('=== Pinyin Style 样式测试 ===\n');

const testWord = '中心';

function checkResult(actual, expected, desc) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${desc}:`, JSON.stringify(actual), '预期:', JSON.stringify(expected), match ? '✅' : '❌');
  return match;
}

// ==================== STYLE_NORMAL ====================
console.log('【STYLE_NORMAL - 普通风格】');

let r1 = pinyin(testWord, { style: pinyin.STYLE_NORMAL });
checkResult(r1, [['zhong'], ['xin']], '常量');

let r2 = pinyin(testWord, { style: 'normal' });
checkResult(r2, [['zhong'], ['xin']], '字符串"normal"');

let r3 = pinyin(testWord, { style: 0 });
checkResult(r3, [['zhong'], ['xin']], '数字 0');

// ==================== STYLE_TONE ====================
console.log('\n【STYLE_TONE - 声调风格(默认)】');

let r4 = pinyin(testWord, { style: pinyin.STYLE_TONE });
checkResult(r4, [['zhōng'], ['xīn']], '常量');

let r5 = pinyin(testWord, { style: 'tone' });
checkResult(r5, [['zhōng'], ['xīn']], '字符串"tone"');

let r6 = pinyin(testWord, { style: 1 });
checkResult(r6, [['zhōng'], ['xīn']], '数字 1');

// ==================== STYLE_TONE2 ====================
console.log('\n【STYLE_TONE2 - 声调数字在最后】');

let r7 = pinyin(testWord, { style: pinyin.STYLE_TONE2 });
checkResult(r7, [['zhong1'], ['xin1']], '常量');

let r8 = pinyin(testWord, { style: 'tone2' });
checkResult(r8, [['zhong1'], ['xin1']], '字符串"tone2"');

let r9 = pinyin(testWord, { style: 2 });
checkResult(r9, [['zhong1'], ['xin1']], '数字 2');

// ==================== STYLE_TO3NE ====================
console.log('\n【STYLE_TO3NE - 声调数字在韵母后】');

let r10 = pinyin(testWord, { style: pinyin.STYLE_TO3NE });
checkResult(r10, [['zho1ng'], ['xi1n']], '常量');

let r11 = pinyin(testWord, { style: 'to3ne' });
checkResult(r11, [['zho1ng'], ['xi1n']], '字符串"to3ne"');

let r12 = pinyin(testWord, { style: 5 });
checkResult(r12, [['zho1ng'], ['xi1n']], '数字 5');

// ==================== STYLE_INITIALS ====================
console.log('\n【STYLE_INITIALS - 只返回声母】');

let r13 = pinyin(testWord, { style: pinyin.STYLE_INITIALS });
checkResult(r13, [['zh'], ['x']], '常量');

let r14 = pinyin(testWord, { style: 'initials' });
checkResult(r14, [['zh'], ['x']], '字符串"initials"');

let r15 = pinyin(testWord, { style: 3 });
checkResult(r15, [['zh'], ['x']], '数字 3');

// ==================== STYLE_FIRST_LETTER ====================
console.log('\n【STYLE_FIRST_LETTER - 只返回首字母】');

let r16 = pinyin(testWord, { style: pinyin.STYLE_FIRST_LETTER });
checkResult(r16, [['z'], ['x']], '常量');

let r17 = pinyin(testWord, { style: 'first_letter' });
checkResult(r17, [['z'], ['x']], '字符串"first_letter"');

let r18 = pinyin(testWord, { style: 4 });
checkResult(r18, [['z'], ['x']], '数字 4');

// ==================== 测试四声 ====================
console.log('\n【测试四声】');

let r19 = pinyin('妈麻马骂', { style: pinyin.STYLE_TONE });
checkResult(r19, [['mā'], ['má'], ['mǎ'], ['mà']], 'STYLE_TONE');

let r20 = pinyin('妈麻马骂', { style: pinyin.STYLE_TONE2 });
checkResult(r20, [['ma1'], ['ma2'], ['ma3'], ['ma4']], 'STYLE_TONE2');

let r21 = pinyin('妈麻马骂', { style: pinyin.STYLE_TO3NE });
checkResult(r21, [['ma1'], ['ma2'], ['ma3'], ['ma4']], 'STYLE_TO3NE');

// ==================== 特殊拼音 ====================
console.log('\n【特殊拼音】');

let r22 = pinyin('花儿', { style: pinyin.STYLE_TONE });
console.log('  儿化音"花儿":', JSON.stringify(r22), '预期: 2个元素', r22.length === 2 ? '✅' : '❌');

let r23 = pinyin('女', { style: pinyin.STYLE_TONE });
checkResult(r23, [['nǚ']], 'ü 的处理"女" (TONE)');

let r24 = pinyin('女', { style: pinyin.STYLE_NORMAL });
const isNvOrNu = JSON.stringify(r24) === '[["nv"]]' || JSON.stringify(r24) === '[["nü"]]';
console.log('  ü 的处理"女" (NORMAL):', JSON.stringify(r24), '预期: [["nv"]] 或 [["nü"]]', isNvOrNu ? '✅' : '❌');

console.log('\n=== 测试完成 ===');
