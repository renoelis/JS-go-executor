const Buffer = require('buffer').Buffer;

console.log('=== Base64 宽松解码调试 ===\n');

// 测试 1: 无空格
try {
    const buf1 = Buffer.from('YWJj', 'base64');
    console.log('1. 无空格 "YWJj":', buf1.toString(), '- 预期: abc', buf1.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('1. 无空格失败:', e.message);
}

// 测试 2: 带 padding
try {
    const buf2 = Buffer.from('YWJj==', 'base64');
    console.log('2. 带 padding "YWJj==":', buf2.toString(), '- 预期: abc', buf2.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('2. 带 padding 失败:', e.message);
}

// 测试 3: 带空格
try {
    const buf3 = Buffer.from('Y W J j', 'base64');
    console.log('3. 带空格 "Y W J j":', buf3.toString(), '- 预期: abc', buf3.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('3. 带空格失败:', e.message);
}

// 测试 4: 带空格和 padding
try {
    const buf4 = Buffer.from('Y W J j==', 'base64');
    console.log('4. 带空格和 padding "Y W J j==":', buf4.toString(), '- 预期: abc', buf4.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('4. 带空格和 padding 失败:', e.message);
}

// 测试 base64url
console.log('\n=== Base64URL 宽松解码调试 ===\n');

// 测试 5: base64url 无空格
try {
    const buf5 = Buffer.from('YWJj', 'base64url');
    console.log('5. 无空格 "YWJj":', buf5.toString(), '- 预期: abc', buf5.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('5. 无空格失败:', e.message);
}

// 测试 6: base64url 带 padding
try {
    const buf6 = Buffer.from('YWJj==', 'base64url');
    console.log('6. 带 padding "YWJj==":', buf6.toString(), '- 预期: abc', buf6.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('6. 带 padding 失败:', e.message);
}

// 测试 7: base64url 带空格
try {
    const buf7 = Buffer.from('Y W J j', 'base64url');
    console.log('7. 带空格 "Y W J j":', buf7.toString(), '- 预期: abc', buf7.toString() === 'abc' ? '✅' : '❌');
} catch (e) {
    console.log('7. 带空格失败:', e.message);
}

return 'debug complete';
