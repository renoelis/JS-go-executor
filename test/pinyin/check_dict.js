/**
 * 检查词组是否在字典中
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 检查词组字典 ===\n');

const testWords = ['银行', '行长', '中国', '中心', '我喜欢你'];

testWords.forEach(word => {
  console.log(`测试: "${word}"`);
  
  // 不分词
  const r1 = pinyin(word, { segment: false, heteronym: true });
  console.log('  segment: false ->', JSON.stringify(r1));
  
  // 使用我们的分词器
  const r2 = pinyin(word, { segment: true, heteronym: true });
  console.log('  segment: true  ->', JSON.stringify(r2));
  
  // 如果有 segment 方法，测试分词结果
  if (typeof pinyin.segment === 'function') {
    const seg = pinyin.segment(word);
    console.log('  分词结果:', JSON.stringify(seg));
  }
  
  console.log('');
});
