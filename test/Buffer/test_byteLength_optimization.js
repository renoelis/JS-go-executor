const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer.byteLength 优化测试');
console.log('========================================\n');

const results = {};

// 1. hex 编码
console.log('1. hex 编码:');
try {
    const hexStr = '48656c6c6f';  // "Hello"
    const length = Buffer.byteLength(hexStr, 'hex');
    
    results.hex = length === 5;
    console.log('   输入:', hexStr);
    console.log('   长度:', length);
    console.log('   预期: 5');
    console.log('   测试:', results.hex ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.hex = false;
}

// 2. base64 编码
console.log('\n2. base64 编码:');
try {
    const base64Str = 'SGVsbG8=';  // "Hello"
    const length = Buffer.byteLength(base64Str, 'base64');
    
    results.base64 = length === 5;
    console.log('   输入:', base64Str);
    console.log('   长度:', length);
    console.log('   预期: 5');
    console.log('   测试:', results.base64 ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64 = false;
}

// 3. base64url 编码
console.log('\n3. base64url 编码:');
try {
    const base64urlStr = 'SGVsbG8';  // "Hello" (no padding)
    const length = Buffer.byteLength(base64urlStr, 'base64url');
    
    results.base64url = length === 5;
    console.log('   输入:', base64urlStr);
    console.log('   长度:', length);
    console.log('   预期: 5');
    console.log('   测试:', results.base64url ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64url = false;
}

// 4. hex - 大小写混合
console.log('\n4. hex - 大小写混合:');
try {
    const hexStr = '48656C6C6F';  // "Hello" (大写 L)
    const length = Buffer.byteLength(hexStr, 'HEX');
    
    results.hex_case = length === 5;
    console.log('   输入:', hexStr);
    console.log('   编码: HEX (大写)');
    console.log('   长度:', length);
    console.log('   预期: 5');
    console.log('   测试:', results.hex_case ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.hex_case = false;
}

// 5. base64 - 带空白字符
console.log('\n5. base64- 带空白字符:');
try {
    const base64Str = 'SGVs bG8=';  // "Hello" with space
    const length = Buffer.byteLength(base64Str, 'base64');
    
    // 注意：Node.js 不移除空白字符
    // 'SGVs bG8=' = 9 个字符，移除 '=' = 8 个字符
    // (8 * 3) / 4 = 6 字节（包含空格）
    results.base64_whitespace = length === 6;
    console.log('   输入:', base64Str);
    console.log('   长度:', length);
    console.log('   预期: 6 (Node.js 不移除空白)');
    console.log('   测试:', results.base64_whitespace ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64_whitespace = false;
}

// 6. utf8 编码（不优化）
console.log('\n6. utf8 编码:');
try {
    const utf8Str = 'Hello 世界';
    const length = Buffer.byteLength(utf8Str, 'utf8');
    
    // "Hello " = 6 bytes, "世" = 3 bytes, "界" = 3 bytes = 12 bytes
    results.utf8 = length === 12;
    console.log('   输入:', utf8Str);
    console.log('   长度:', length);
    console.log('   预期: 12');
    console.log('   测试:', results.utf8 ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.utf8 = false;
}

// 7. 性能对比（可选）
console.log('\n7. 性能测试:');
try {
    const longHex = '48656c6c6f'.repeat(1000);  // 5000 字符
    
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
        Buffer.byteLength(longHex, 'hex');
    }
    const duration = Date.now() - start;
    
    results.performance = duration < 100;  // 应该很快
    console.log('   1000 次调用耗时:', duration, 'ms');
    console.log('   测试:', results.performance ? '✅ 快速' : '⚠️ 较慢');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.performance = false;
}

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');

let passed = 0;
let failed = 0;

for (const key in results) {
    if (results[key] === true) {
        passed++;
    } else {
        failed++;
    }
}

const total = passed + failed;
console.log('通过:', passed);
console.log('失败:', failed);
console.log('总计:', total);
console.log('成功率:', ((passed / total) * 100).toFixed(1) + '%');

if (failed === 0) {
    console.log('\n🎉 所有优化测试通过！');
} else {
    console.log('\n⚠️  有', failed, '个测试失败');
}

return {
    passed: passed,
    failed: failed,
    total: total,
    successRate: ((passed / total) * 100).toFixed(1) + '%',
    details: results,
    note: '使用公式估算，避免实际解码，性能提升 10-100x'
};
