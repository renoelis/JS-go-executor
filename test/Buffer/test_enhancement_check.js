const Buffer = require('buffer').Buffer;

console.log('=== 检查 Buffer 增强是否生效 ===\n');

// 1. 检查 Buffer.from 是否被覆盖
console.log('1. Buffer.from 函数:');
console.log('   类型:', typeof Buffer.from);
console.log('   toString:', Buffer.from.toString().substring(0, 100));

// 2. 测试简单的 hex
console.log('\n2. 简单 hex 测试:');
try {
    const buf = Buffer.from('616263', 'hex');
    console.log('   结果:', buf.toString(), '- 预期: abc');
} catch (e) {
    console.log('   失败:', e.message);
}

// 3. 测试大写 HEX
console.log('\n3. 大写 HEX 测试:');
try {
    const buf = Buffer.from('616263', 'HEX');
    console.log('   结果:', buf.toString(), '- 预期: abc');
} catch (e) {
    console.log('   失败:', e.message);
}

// 4. 测试 base64 无空格
console.log('\n4. base64 无空格:');
try {
    const buf = Buffer.from('YWJj', 'base64');
    console.log('   结果:', buf.toString(), '- 预期: abc');
} catch (e) {
    console.log('   失败:', e.message);
}

// 5. 测试 base64 带空格（关键测试）
console.log('\n5. base64 带空格（关键）:');
try {
    const buf = Buffer.from('YWJj', 'base64');  // 先测试无空格
    console.log('   无空格成功:', buf.toString());
    
    const buf2 = Buffer.from('Y W J j', 'base64');  // 再测试带空格
    console.log('   带空格成功:', buf2.toString());
} catch (e) {
    console.log('   失败:', e.message);
    console.log('   这说明我们的宽松解码没有生效！');
}

return 'check complete';
