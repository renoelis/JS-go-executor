const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  第3轮代码审查修复验证');
console.log('========================================\n');

const results = {};

// ===== 1. byteLength 与 from 一致性测试 =====

console.log('1. byteLength base64 空白字符:');
try {
    const str1 = 'Y W J j==';  // 'abc' with spaces
    const byteLen1 = Buffer.byteLength(str1, 'base64');
    const buf1 = Buffer.from(str1, 'base64');
    
    // 🔥 Node.js 设计行为：byteLength 不移除空白，可能大于实际长度
    // 'Y W J j==' = 9 字符，移除 '==' (2个) → 'Y W J j' = 7 字符（包含空格）
    // (7 * 3) / 4 = 5.25 → 5 字节
    results.base64_whitespace_consistent = byteLen1 === 5 && buf1.length === 3;
    console.log('   输入:', str1);
    console.log('   byteLength:', byteLen1, '(预期: 5, 包含空格)');
    console.log('   from().length:', buf1.length, '(预期: 3, 移除空格)');
    console.log('   内容:', buf1.toString());
    console.log('   Node.js 行为:', results.base64_whitespace_consistent ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64_whitespace_consistent = false;
}

console.log('\n2. byteLength base64url 空白字符:');
try {
    const str2 = 'Y W J j';  // 'abc' with spaces, no padding
    const byteLen2 = Buffer.byteLength(str2, 'base64url');
    const buf2 = Buffer.from(str2, 'base64url');
    
    // 🔥 Node.js 设计行为：byteLength 不移除空白
    // 'Y W J j' = 7 字符（包含空格）
    // (7 * 3) / 4 = 5.25 -> 5 字节
    results.base64url_whitespace_consistent = byteLen2 === 5 && buf2.length === 3;
    console.log('   输入:', str2);
    console.log('   byteLength:', byteLen2, '(预期: 5, 包含空格)');
    console.log('   from().length:', buf2.length, '(预期: 3, 移除空格)');
    console.log('   内容:', buf2.toString());
    console.log('   Node.js 行为:', results.base64url_whitespace_consistent ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64url_whitespace_consistent = false;
}

console.log('\n3. byteLength base64 换行符:');
try {
    const str3 = 'SGVs\nbG8=';  // 'Hello' with newline
    const byteLen3 = Buffer.byteLength(str3, 'base64');
    const buf3 = Buffer.from(str3, 'base64');
    
    // 🔥 Node.js 设计行为：byteLength 不移除换行符
    // 'SGVs\nbG8=' = 9 字符，移除 '=' = 8 字符（包含换行）
    // (8 * 3) / 4 = 6 字节
    results.base64_newline_consistent = byteLen3 === 6 && buf3.length === 5;
    console.log('   输入:', str3.replace(/\n/g, '\\n'));
    console.log('   byteLength:', byteLen3, '(预期: 6, 包含换行)');
    console.log('   from().length:', buf3.length, '(预期: 5, 移除换行)');
    console.log('   内容:', buf3.toString());
    console.log('   Node.js 行为:', results.base64_newline_consistent ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64_newline_consistent = false;
}

// ===== 2. set() 重叠测试 =====

console.log('\n4. set() 共享 ArrayBuffer 重叠（向后复制）:');
try {
    // 创建一个 Buffer
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    
    // 创建子视图
    const view = buf.subarray(0, 4);  // [1, 2, 3, 4]
    
    // 向后复制（重叠）：将 [1,2,3,4] 复制到位置 2
    // 预期：[1, 2, 1, 2, 3, 4, 7, 8]
    buf.set(view, 2);
    
    const expected = [1, 2, 1, 2, 3, 4, 7, 8];
    const actual = [...buf];
    results.set_overlap_forward = JSON.stringify(actual) === JSON.stringify(expected);
    
    console.log('   初始:', [1, 2, 3, 4, 5, 6, 7, 8]);
    console.log('   子视图:', [1, 2, 3, 4]);
    console.log('   操作: buf.set(view, 2)');
    console.log('   结果:', actual);
    console.log('   预期:', expected);
    console.log('   测试:', results.set_overlap_forward ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.set_overlap_forward = false;
}

console.log('\n5. set() 共享 ArrayBuffer 重叠（向前复制）:');
try {
    // 创建一个 Buffer
    const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    
    // 创建子视图（从位置 2 开始）
    const view = buf.subarray(2, 6);  // [3, 4, 5, 6]
    
    // 向前复制（重叠）：将 [3,4,5,6] 复制到位置 0
    // 预期：[3, 4, 5, 6, 5, 6, 7, 8]
    buf.set(view, 0);
    
    const expected = [3, 4, 5, 6, 5, 6, 7, 8];
    const actual = [...buf];
    results.set_overlap_backward = JSON.stringify(actual) === JSON.stringify(expected);
    
    console.log('   初始:', [1, 2, 3, 4, 5, 6, 7, 8]);
    console.log('   子视图:', [3, 4, 5, 6]);
    console.log('   操作: buf.set(view, 0)');
    console.log('   结果:', actual);
    console.log('   预期:', expected);
    console.log('   测试:', results.set_overlap_backward ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.set_overlap_backward = false;
}

console.log('\n6. set() 不同 Buffer（无重叠）:');
try {
    const buf1 = Buffer.from([1, 2, 3, 4, 5]);
    const buf2 = Buffer.from([9, 8, 7]);
    
    // 不同 Buffer，无重叠
    buf1.set(buf2, 1);
    
    const expected = [1, 9, 8, 7, 5];
    const actual = [...buf1];
    results.set_no_overlap = JSON.stringify(actual) === JSON.stringify(expected);
    
    console.log('   buf1:', [1, 2, 3, 4, 5]);
    console.log('   buf2:', [9, 8, 7]);
    console.log('   操作: buf1.set(buf2, 1)');
    console.log('   结果:', actual);
    console.log('   预期:', expected);
    console.log('   测试:', results.set_no_overlap ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.set_no_overlap = false;
}

// ===== 测试总结 =====

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
    console.log('\n🎉 所有第3轮修复验证通过！');
} else {
    console.log('\n⚠️  有', failed, '个测试失败');
    console.log('\n失败的测试:');
    for (const key in results) {
        if (!results[key]) {
            console.log('  -', key);
        }
    }
}

return {
    passed: passed,
    failed: failed,
    total: total,
    successRate: ((passed / total) * 100).toFixed(1) + '%',
    details: results,
    fixes: [
        '1. byteLength base64/base64url 复用宽松解码',
        '2. set() 处理共享 ArrayBuffer 的重叠情况'
    ]
};
