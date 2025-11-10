/**
 * 测试 npm pinyin v4 对纯标点符号的实际处理
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== npm pinyin v4 标点符号测试 ===\n');

// 测试1: segment: false
console.log('1. "，。！" segment: false');
const r1 = pinyin('，。！', { segment: false });
console.log('   结果:', JSON.stringify(r1));
console.log('   长度:', r1.length);
console.log('');

// 测试2: segment: true
console.log('2. "，。！" segment: true');
const r2 = pinyin('，。！', { segment: true });
console.log('   结果:', JSON.stringify(r2));
console.log('   长度:', r2.length);
console.log('');

// 测试3: 带汉字的标点
console.log('3. "你好，世界！" segment: true');
const r3 = pinyin('你好，世界！', { segment: true });
console.log('   结果:', JSON.stringify(r3));
console.log('');

// 测试4: 数字
console.log('4. "我有123个" segment: true');
const r4 = pinyin('我有123个', { segment: true });
console.log('   结果:', JSON.stringify(r4));
console.log('   各项:', r4.map(r => r[0]).join(' | '));
console.log('');

// 测试5: URL
console.log('5. "访问http://baidu.com" segment: true');
const r5 = pinyin('访问http://baidu.com', { segment: true });
console.log('   结果:', JSON.stringify(r5));
console.log('   各项:', r5.map(r => r[0]).join(' | '));
console.log('');

console.log('=== 完成 ===');
