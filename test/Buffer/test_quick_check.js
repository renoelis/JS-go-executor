const Buffer = require('buffer').Buffer;

console.log('=== 快速验证测试 ===\n');

// 1. 大小写 HEX
try {
    const buf = Buffer.from('616263', 'HEX');
    console.log('1. HEX 大写:', buf.toString('utf8'), '- 预期: abc');
} catch (e) {
    console.log('1. HEX 大写失败:', e.message);
}

// 2. base64url 带 padding
try {
    const buf = Buffer.from('YWJj==', 'base64url');
    console.log('2. base64url padding:', buf.toString('utf8'), '- 预期: abc');
} catch (e) {
    console.log('2. base64url padding 失败:', e.message);
}

// 3. base64url 带空格
try {
    const buf = Buffer.from('Y W J j', 'base64url');
    console.log('3. base64url spaces:', buf.toString('utf8'), '- 预期: abc');
} catch (e) {
    console.log('3. base64url spaces 失败:', e.message);
}

// 4. copy 重叠
const a = Buffer.from([1,2,3,4,5,6]);
const x = a.subarray(1, 5);
x.copy(a, 2, 0, 3);
console.log('4. copy 重叠:', Array.from(a).join(','), '- 预期: 1,2,2,3,4,6');

return {
    hex_ok: Buffer.from('616263', 'HEX').toString('utf8') === 'abc',
    base64url_padding_ok: Buffer.from('YWJj==', 'base64url').toString('utf8') === 'abc',
    base64url_spaces_ok: Buffer.from('Y W J j', 'base64url').toString('utf8') === 'abc',
    copy_ok: Array.from(a).join(',') === '1,2,2,3,4,6'
};
