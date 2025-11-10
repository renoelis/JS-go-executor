/**
 * 测试标点符号在 npm pinyin v4 中的实际行为
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 测试标点符号行为 ===\n');

// 测试1: 只有标点符号
console.log('1. 只有标点符号: "，。！"');
const result1 = pinyin('，。！', { segment: false });
console.log('   segment: false');
console.log('   结果:', JSON.stringify(result1));
console.log('   长度:', result1.length);
console.log('');

const result2 = pinyin('，。！', { segment: true });
console.log('   segment: true');
console.log('   结果:', JSON.stringify(result2));
console.log('   长度:', result2.length);
console.log('');

// 测试2: 汉字 + 标点
console.log('2. 汉字 + 标点: "你好，世界！"');
const result3 = pinyin('你好，世界！', { segment: false });
console.log('   segment: false');
console.log('   结果:', JSON.stringify(result3));
console.log('');

const result4 = pinyin('你好，世界！', { segment: true });
console.log('   segment: true');
console.log('   结果:', JSON.stringify(result4));
console.log('');

// 测试3: 单个标点
console.log('3. 单个标点: "，"');
const result5 = pinyin('，', { segment: false });
console.log('   segment: false');
console.log('   结果:', JSON.stringify(result5));
console.log('');

const result6 = pinyin('，', { segment: true });
console.log('   segment: true');
console.log('   结果:', JSON.stringify(result6));
console.log('');

// 测试4: 空格 + 标点
console.log('4. 空格分隔的标点: "， 。 ！"');
const result7 = pinyin('， 。 ！', { segment: false });
console.log('   segment: false');
console.log('   结果:', JSON.stringify(result7));
console.log('');

const result8 = pinyin('， 。 ！', { segment: true });
console.log('   segment: true');
console.log('   结果:', JSON.stringify(result8));
console.log('');

// 测试5: 英文 + 标点
console.log('5. 英文 + 标点: "Hello, World!"');
const result9 = pinyin('Hello, World!', { segment: false });
console.log('   segment: false');
console.log('   结果:', JSON.stringify(result9));
console.log('');

const result10 = pinyin('Hello, World!', { segment: true });
console.log('   segment: true');
console.log('   结果:', JSON.stringify(result10));
console.log('');

console.log('=== 结论 ===');
console.log('在 npm pinyin v4 中：');
console.log('- segment: false 时，连续的非汉字字符会被累积为一个元素');
console.log('- segment: true 时，行为取决于分词器的实现');
