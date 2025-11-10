/**
 * Pinyin 兼容性测试 - 验证 Go 原生实现与测试期望的兼容性
 */

const pinyin = require('pinyin');

console.log('='.repeat(60));
console.log('🧪 Pinyin 兼容性测试');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result) {
            console.log(`✅ ${name}`);
            passed++;
        } else {
            console.log(`❌ ${name} - 断言失败`);
            failed++;
        }
    } catch (e) {
        console.log(`❌ ${name} - 错误: ${e.message}`);
        failed++;
    }
}

// 测试 1: 混合文本（汉字 + 英文 + 符号）
test('混合文本: 我爱Node.js与TypeScript！', () => {
    const input = '我爱Node.js与TypeScript！';
    const result = pinyin(input);
    
    console.log(`  输入: "${input}"`);
    console.log(`  输出: ${JSON.stringify(result)}`);
    console.log(`  输出长度: ${result.length}`);
    
    // 期望: 二维数组 + 长度至少为 1
    const isValid = Array.isArray(result) && 
                    result.length > 0 && 
                    result.every(row => Array.isArray(row));
    
    return isValid;
});

// 测试 2: 纯英文字符串
test('纯英文: OpenAI_ChatGPT-NodeJS_Integration_v1.0', () => {
    const input = 'OpenAI_ChatGPT-NodeJS_Integration_v1.0';
    const result = pinyin(input);
    
    console.log(`  输入: "${input}"`);
    console.log(`  输出: ${JSON.stringify(result)}`);
    console.log(`  输出长度: ${result.length}`);
    
    // 期望: 二维数组 + 至少有一个元素（折叠为 1）
    const isValid = Array.isArray(result) && result.length >= 1;
    
    return isValid;
});

// 测试 3: 非中文字符（数字 + 符号）
test('非中文: ABC-123', () => {
    const input = 'ABC-123';
    const result = pinyin(input);
    
    console.log(`  输入: "${input}"`);
    console.log(`  输出: ${JSON.stringify(result)}`);
    console.log(`  输出长度: ${result.length}`);
    
    // 期望: 二维数组 + 至少有一个元素
    const isValid = Array.isArray(result) && result.length >= 1;
    
    return isValid;
});

// 测试 4: Emoji
test('Emoji: 我😀你👍', () => {
    const input = '我😀你👍';
    const result = pinyin(input);
    
    console.log(`  输入: "${input}"`);
    console.log(`  输出: ${JSON.stringify(result)}`);
    console.log(`  输出长度: ${result.length}`);
    
    // 期望: 二维数组 + 长度灵活
    const isValid = Array.isArray(result) && result.length > 0;
    
    return isValid;
});

// 测试 5: 空字符串
test('空字符串', () => {
    const result = pinyin('');
    
    console.log(`  输入: ""`);
    console.log(`  输出: ${JSON.stringify(result)}`);
    
    // 期望: 返回空数组
    return Array.isArray(result) && result.length === 0;
});

// 测试 6: 纯汉字
test('纯汉字: 中华人民共和国', () => {
    const input = '中华人民共和国';
    const result = pinyin(input);
    
    console.log(`  输入: "${input}"`);
    console.log(`  输出: ${JSON.stringify(result)}`);
    console.log(`  输出长度: ${result.length}`);
    
    // 期望: 长度应该等于汉字数（7）
    return Array.isArray(result) && result.length === 7;
});

// 总结
console.log('');
console.log('='.repeat(60));
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
console.log(`成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
console.log('='.repeat(60));

// 如果有失败，退出码为 1
if (failed > 0) {
    throw new Error(`${failed} 个测试失败`);
}

