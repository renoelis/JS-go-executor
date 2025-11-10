const Buffer = require('buffer').Buffer;

console.log('=== byteLength vs from 一致性测试 ===\n');

// 测试：带空白的 base64url
const str = 'Y W J j==';  // 'abc' with spaces

console.log('输入字符串:', str);
console.log('');

// byteLength 计算
const byteLen = Buffer.byteLength(str, 'base64url');
console.log('Buffer.byteLength():', byteLen);

// 实际解码
const buf = Buffer.from(str, 'base64url');
console.log('Buffer.from().length:', buf.length);
console.log('Buffer.from() 内容:', buf.toString());

console.log('');
console.log('一致性:', byteLen === buf.length ? '✅ 一致' : '❌ 不一致');

return {
    input: str,
    byteLength: byteLen,
    actualLength: buf.length,
    consistent: byteLen === buf.length,
    content: buf.toString()
};
