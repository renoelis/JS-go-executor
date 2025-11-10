/**
 * 最小化测试：追踪 heteronym 选项的传递
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 最小化 Heteronym 测试 ===\n');

// 测试配置
const testCases = [
  { text: '行', segment: false, heteronym: true, desc: '单字，不分词' },
  { text: '行', segment: true, heteronym: true, desc: '单字，分词' },
  { text: '银行', segment: false, heteronym: true, desc: '双字，不分词' },
  { text: '银行', segment: true, heteronym: true, desc: '双字，分词' },
  { text: '中国', segment: false, heteronym: true, desc: '中国，不分词' },
  { text: '中国', segment: true, heteronym: true, desc: '中国，分词' },
];

testCases.forEach((tc, idx) => {
  console.log(`${idx + 1}. "${tc.text}" (${tc.desc})`);
  const result = pinyin(tc.text, { segment: tc.segment, heteronym: tc.heteronym });
  console.log(`   配置: {segment: ${tc.segment}, heteronym: ${tc.heteronym}}`);
  console.log(`   结果: ${JSON.stringify(result)}`);
  
  // 检查是否保留了多音
  const hasMultiTone = result.some(arr => arr.length > 1);
  console.log(`   多音字: ${hasMultiTone ? '✅ 有' : '❌ 无'}`);
  console.log('');
});

console.log('=== 期望行为 ===');
console.log('heteronym: true 时，所有多音字都应该返回多个读音');
console.log('segment 选项不应该影响 heteronym 的行为');
