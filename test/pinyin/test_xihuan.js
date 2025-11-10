/**
 * 测试 "喜欢" 的处理
 */

const pinyin = require('pinyin').pinyin || require('pinyin').default || require('pinyin');

console.log('=== 测试 "喜欢" 的处理 ===\n');

// 测试1: 不开启 segment
console.log('1. 不开启 segment:');
const r1 = pinyin('喜欢', { segment: false });
console.log('   结果:', JSON.stringify(r1));
console.log('');

// 测试2: 开启 segment
console.log('2. 开启 segment:');
const r2 = pinyin('喜欢', { segment: true });
console.log('   结果:', JSON.stringify(r2));
console.log('');

// 测试3: segment + group
console.log('3. segment + group:');
const r3 = pinyin('喜欢', { segment: true, group: true });
console.log('   结果:', JSON.stringify(r3));
console.log('');

// 测试4: 完整句子 - 我喜欢你
console.log('4. 我喜欢你 - segment:');
const r4 = pinyin('我喜欢你', { segment: true });
console.log('   结果:', JSON.stringify(r4));
console.log('   长度:', r4.length);
console.log('');

console.log('5. 我喜欢你 - segment + group:');
const r5 = pinyin('我喜欢你', { segment: true, group: true });
console.log('   结果:', JSON.stringify(r5));
console.log('   长度:', r5.length);
console.log('   期望:', JSON.stringify([['wǒ'], ['xǐhuān'], ['nǐ']]));
console.log('');

// 测试分词结果
if (typeof pinyin.segment === 'function') {
    console.log('6. 分词结果 - 我喜欢你:');
    const seg = pinyin.segment('我喜欢你');
    console.log('   分词:', JSON.stringify(seg));
    console.log('');
}

// 测试数字
console.log('7. 我有123个 - segment:');
const r7 = pinyin('我有123个', { segment: true });
console.log('   结果:', JSON.stringify(r7));
console.log('   是否包含123:', r7.some(r => r[0] === '123'));
console.log('');

// 测试URL
console.log('8. 访问http://baidu.com - segment:');
const r8 = pinyin('访问http://baidu.com', { segment: true });
console.log('   结果:', JSON.stringify(r8));
console.log('   是否包含http:', r8.some(r => r[0].includes('http')));
console.log('');

console.log('=== 完成 ===');
