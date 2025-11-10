/**
 * Pinyin Mode 模式测试
 * 测试普通模式和姓氏模式
 */

const { pinyin } = require('pinyin');

console.log('=== Pinyin Mode 模式测试 ===\n');

function checkResult(actual, expected, desc) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${desc}:`, JSON.stringify(actual), '预期:', JSON.stringify(expected), match ? '✅' : '❌');
  return match;
}

// ==================== MODE_NORMAL ====================
console.log('【MODE_NORMAL - 普通模式】');

let r1 = pinyin('中国', { mode: pinyin.MODE_NORMAL });
checkResult(r1, [['zhōng'], ['guó']], '常量');

let r2 = pinyin('中国', { mode: 'normal' });
checkResult(r2, [['zhōng'], ['guó']], '字符串"normal"');

let r3 = pinyin('中国', { mode: 'NORMAL' });
checkResult(r3, [['zhōng'], ['guó']], '字符串"NORMAL"');

// ==================== MODE_SURNAME ====================
console.log('\n【MODE_SURNAME - 姓氏模式】');

let r4 = pinyin('华夫人', { mode: pinyin.MODE_SURNAME });
console.log('  姓氏"华":', JSON.stringify(r4), '预期: 3个元素', r4.length === 3 ? '✅' : '❌');

let r5 = pinyin('华夫人', { mode: 'surname' });
console.log('  字符串"surname":', JSON.stringify(r5), '预期: 3个元素', r5.length === 3 ? '✅' : '❌');

let r6 = pinyin('华夫人', { mode: pinyin.MODE_NORMAL });
checkResult(r6, [['huá'], ['fū'], ['rén']], '对比普通模式');

// ==================== 常见姓氏 ====================
console.log('\n【常见姓氏】');

let r7 = pinyin('张三', { mode: pinyin.MODE_SURNAME });
checkResult(r7, [['zhāng'], ['sān']], '张三');

let r8 = pinyin('李四', { mode: pinyin.MODE_SURNAME });
checkResult(r8, [['lǐ'], ['sì']], '李四');

let r9 = pinyin('王五', { mode: pinyin.MODE_SURNAME });
checkResult(r9, [['wáng'], ['wǔ']], '王五');

let r10 = pinyin('赵六', { mode: pinyin.MODE_SURNAME });
checkResult(r10, [['zhào'], ['liù']], '赵六');

// ==================== 多音字姓氏 ====================
console.log('\n【多音字姓氏】');

let r11 = pinyin('区先生', { mode: pinyin.MODE_SURNAME });
console.log('  区先生:', JSON.stringify(r11), '预期: 3个元素', r11.length === 3 ? '✅' : '❌');

let r12 = pinyin('仇先生', { mode: pinyin.MODE_SURNAME });
console.log('  仇先生:', JSON.stringify(r12), '预期: 3个元素', r12.length === 3 ? '✅' : '❌');

let r13 = pinyin('朴先生', { mode: pinyin.MODE_SURNAME });
console.log('  朴先生:', JSON.stringify(r13), '预期: 3个元素', r13.length === 3 ? '✅' : '❌');

let r14 = pinyin('盖先生', { mode: pinyin.MODE_SURNAME });
console.log('  盖先生:', JSON.stringify(r14), '预期: 3个元素', r14.length === 3 ? '✅' : '❌');

// ==================== 复姓 ====================
console.log('\n【复姓】');

let r15 = pinyin('欧阳修', { mode: pinyin.MODE_SURNAME });
checkResult(r15, [['ōu'], ['yáng'], ['xiū']], '欧阳修');

let r16 = pinyin('司马光', { mode: pinyin.MODE_SURNAME });
checkResult(r16, [['sī'], ['mǎ'], ['guāng']], '司马光');

let r17 = pinyin('诸葛亮', { mode: pinyin.MODE_SURNAME });
checkResult(r17, [['zhū'], ['gé'], ['liàng']], '诸葛亮');

// ==================== 模式与样式组合 ====================
console.log('\n【模式与样式组合】');

let r18 = pinyin('华夫人', { mode: pinyin.MODE_SURNAME, style: pinyin.STYLE_NORMAL });
console.log('  姓氏模式 + STYLE_NORMAL:', JSON.stringify(r18), '预期: 3个元素', r18.length === 3 ? '✅' : '❌');

let r19 = pinyin('华夫人', { mode: pinyin.MODE_SURNAME, style: pinyin.STYLE_TONE2 });
console.log('  姓氏模式 + STYLE_TONE2:', JSON.stringify(r19), '预期: 3个元素', r19.length === 3 ? '✅' : '❌');

let r20 = pinyin('华夫人', { mode: pinyin.MODE_SURNAME, style: pinyin.STYLE_INITIALS });
checkResult(r20, [['h'], ['f'], ['r']], '姓氏模式 + STYLE_INITIALS');

let r21 = pinyin('华夫人', { mode: pinyin.MODE_SURNAME, style: pinyin.STYLE_FIRST_LETTER });
checkResult(r21, [['h'], ['f'], ['r']], '姓氏模式 + STYLE_FIRST_LETTER');

console.log('\n=== 测试完成 ===');
