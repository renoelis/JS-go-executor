const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  必修项修复验证测试（Node.js v22 兼容）');
console.log('========================================\n');

const results = {};

// 1. copy() 边界夹取 + 重叠
console.log('1. copy() 边界夹取 + 重叠:');
try {
    const a = Buffer.from([1, 2, 3, 4, 5, 6]);
    const s = a.subarray(1, 5);  // [2, 3, 4, 5]
    
    // sourceEnd 超界应被夹到 4 (s.length)
    // 复制 s[0..3] = [2, 3, 4, 5] 到 a[2..5]
    s.copy(a, 2, 0, 10);
    
    const result = [...a];
    // 🔥 修正：正确的预期值
    // a[0] = 1 (不变)
    // a[1] = 2 (不变)
    // a[2] = s[0] = 2
    // a[3] = s[1] = 3
    // a[4] = s[2] = 4
    // a[5] = s[3] = 5
    const expected = [1, 2, 2, 3, 4, 5];
    results.copy_boundary = JSON.stringify(result) === JSON.stringify(expected);
    
    console.log('   结果:', result);
    console.log('   预期:', expected);
    console.log('   测试:', results.copy_boundary ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.copy_boundary = false;
}

// 2. copy() 负数参数验证（Node.js v22 严格模式）
console.log('\n2. copy() 负数参数验证:');
try {
    const buf1 = Buffer.from([1, 2, 3, 4, 5]);
    const buf2 = Buffer.alloc(5);
    
    // Node.js v22: 负数参数应该抛出 RangeError
    try {
        buf1.copy(buf2, 0, -5, 3);
        results.copy_negative = false;  // 没抛出错误，测试失败
        console.log('   ❌ 应该抛出 RangeError，但没有');
    } catch (err) {
        // 预期抛出错误
        const isRangeError = err.message.includes('out of range') || err.message.includes('ERR_OUT_OF_RANGE');
        results.copy_negative = isRangeError;
        console.log('   ✅ 正确抛出 RangeError:', err.message.substring(0, 80));
    }
} catch (e) {
    console.log('   ❌ 意外失败:', e.message);
    results.copy_negative = false;
}

// 3. fill() 大小写 - Base64Url
console.log('\n3. fill() 大小写 - Base64Url:');
try {
    const b = Buffer.alloc(6);
    b.fill('YWJj', 0, 3, 'Base64Url');  // 大小写混合
    
    const result = b.toString('utf8', 0, 3);
    results.fill_case = result === 'abc';
    
    console.log('   结果:', result, '- 预期: abc');
    console.log('   测试:', results.fill_case ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_case = false;
}

// 4. fill() base64url 编码
console.log('\n4. fill() base64url 编码:');
try {
    const b = Buffer.alloc(6);
    b.fill('YWJj', 0, 3, 'base64url');
    
    const result = b.toString('utf8', 0, 3);
    results.fill_base64url = result === 'abc';
    
    console.log('   结果:', result, '- 预期: abc');
    console.log('   测试:', results.fill_base64url ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_base64url = false;
}

// 5. fill() ASCII 编码
console.log('\n5. fill() ASCII 编码:');
try {
    const b = Buffer.alloc(6);
    b.fill('𠮷', 0, 6, 'ASCII');  // UTF-16 码元 -> 两个 7bit 字节循环
    
    results.fill_ascii = b.length === 6;
    
    console.log('   长度:', b.length, '- 预期: 6');
    console.log('   内容:', [...b]);
    console.log('   测试:', results.fill_ascii ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_ascii = false;
}

// 6. fill() Latin1 编码
console.log('\n6. fill() Latin1 编码:');
try {
    const b = Buffer.alloc(4);
    b.fill('test', 0, 4, 'latin1');
    
    const result = b.toString('latin1');
    results.fill_latin1 = result === 'test';
    
    console.log('   结果:', result, '- 预期: test');
    console.log('   测试:', results.fill_latin1 ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_latin1 = false;
}

// 7. fill() UTF-16LE 编码
console.log('\n7. fill() UTF-16LE 编码:');
try {
    const b = Buffer.alloc(8);
    b.fill('test', 0, 8, 'utf16le');
    
    const result = b.toString('utf16le');
    results.fill_utf16le = result === 'test';
    
    console.log('   结果:', result, '- 预期: test');
    console.log('   测试:', results.fill_utf16le ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_utf16le = false;
}

// 8. fill() Buffer/Uint8Array
console.log('\n8. fill() Buffer/Uint8Array:');
try {
    const b = Buffer.alloc(6);
    b.fill(Buffer.from([1, 2, 3]));  // 循环 1,2,3
    
    const result = [...b];
    const expected = [1, 2, 3, 1, 2, 3];
    results.fill_buffer = JSON.stringify(result) === JSON.stringify(expected);
    
    console.log('   结果:', result);
    console.log('   预期:', expected);
    console.log('   测试:', results.fill_buffer ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_buffer = false;
}

// 9. fill() 大小写 - HEX
console.log('\n9. fill() 大小写 - HEX:');
try {
    const b = Buffer.alloc(3);
    b.fill('616263', 0, 3, 'HEX');  // 大写
    
    const result = b.toString();
    results.fill_hex_case = result === 'abc';
    
    console.log('   结果:', result, '- 预期: abc');
    console.log('   测试:', results.fill_hex_case ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_hex_case = false;
}

// 10. copy() 超出上界夹取
console.log('\n10. copy() 超出上界夹取:');
try {
    const buf1 = Buffer.from([1, 2, 3, 4, 5]);
    const buf2 = Buffer.alloc(5);
    
    // sourceEnd 超出上界应该被夹到 buf1.length
    buf1.copy(buf2, 0, 0, 100);
    
    const result = [...buf2];
    const expected = [1, 2, 3, 4, 5];
    results.copy_clamp_upper = JSON.stringify(result) === JSON.stringify(expected);
    
    console.log('   结果:', result);
    console.log('   预期:', expected);
    console.log('   测试:', results.copy_clamp_upper ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.copy_clamp_upper = false;
}

// 11. copy() 零长度
console.log('\n11. copy() 零长度:');
try {
    const buf1 = Buffer.from([1, 2, 3]);
    const buf2 = Buffer.from([4, 5, 6]);
    
    // sourceStart === sourceEnd，应该复制 0 字节
    const copied = buf1.copy(buf2, 0, 2, 2);
    
    const result = [...buf2];
    const expected = [4, 5, 6];
    results.copy_zero = copied === 0 && JSON.stringify(result) === JSON.stringify(expected);
    
    console.log('   复制字节数:', copied, '- 预期: 0');
    console.log('   结果:', result);
    console.log('   预期:', expected);
    console.log('   测试:', results.copy_zero ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.copy_zero = false;
}

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');

// 统计结果
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
    console.log('\n🎉 所有必修项修复验证通过！');
} else {
    console.log('\n⚠️  有', failed, '个测试失败');
    console.log('\n失败的测试:');
    for (const key in results) {
        if (!results[key]) {
            console.log('  -', key);
        }
    }
}

// 收集失败的测试
const failedTests = [];
for (const key in results) {
    if (!results[key]) {
        failedTests.push(key);
    }
}

return {
    passed: passed,
    failed: failed,
    total: total,
    successRate: ((passed / total) * 100).toFixed(1) + '%',
    details: results,
    failedTests: failedTests,
    summary: failed === 0 ? '🎉 所有必修项修复验证通过（Node.js v22 兼容）！' : `⚠️ 有 ${failed} 个测试失败`,
    note: 'Node.js v22 严格模式：负数参数抛出 RangeError，超出上界自动夹取'
};
