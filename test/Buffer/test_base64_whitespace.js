const Buffer = require('buffer').Buffer;

console.log('=== base64 空白字符测试 ===\n');

// 测试 1: 无空白
console.log('1. 无空白:');
const str1 = 'SGVsbG8=';
const len1 = Buffer.byteLength(str1, 'base64');
console.log('   输入:', str1);
console.log('   长度:', len1);
console.log('   预期: 5');
console.log('');

// 测试 2: 带空格
console.log('2. 带空格:');
const str2 = 'SGVs bG8=';
const len2 = Buffer.byteLength(str2, 'base64');
console.log('   输入:', str2);
console.log('   长度:', len2);
console.log('   预期: 5 或 6？');
console.log('');

// 测试 3: 实际解码验证
console.log('3. 实际解码验证:');
try {
    const buf1 = Buffer.from('SGVsbG8=', 'base64');
    console.log('   "SGVsbG8=" 解码:', buf1.toString(), '- 长度:', buf1.length);
    
    const buf2 = Buffer.from('SGVs bG8=', 'base64');
    console.log('   "SGVs bG8=" 解码:', buf2.toString(), '- 长度:', buf2.length);
} catch (e) {
    console.log('   解码失败:', e.message);
}
console.log('');

// 测试 4: Node.js 文档说明
console.log('4. Node.js 文档说明:');
console.log('   对于 base64，byteLength() 可能返回比实际 Buffer 更大的值');
console.log('   如果输入包含非 base64 字符（如空白），返回值可能不准确');
console.log('');

return {
    no_whitespace: {
        input: str1,
        byteLength: len1,
        expected: 5,
        passed: len1 === 5
    },
    with_whitespace: {
        input: str2,
        byteLength: len2,
        expected_if_removed: 5,
        expected_if_not_removed: 6,
        actual: len2,
        note: 'Node.js 可能不移除空白字符'
    }
};
