// 测试最终修复
const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  测试最终修复');
console.log('========================================\n');

const results = {};

// 测试 1: copy 跨视图重叠
console.log('1. 测试 copy 跨视图重叠:');
const a = Buffer.from([1, 2, 3, 4, 5, 6]);
const x = a.subarray(1, 5); // [2,3,4,5] 与 a 共享
console.log('   原始 a:', Array.from(a).join(','));
console.log('   视图 x (subarray(1,5)):', Array.from(x).join(','));

x.copy(a, 2, 0, 3); // 目标区(2..4) 与 源区(1..3) 重叠
console.log('   执行 x.copy(a, 2, 0, 3)');
console.log('   结果 a:', Array.from(a).join(','));
console.log('   预期 a: 1,2,2,3,4,6');

results.copy_overlap = Array.from(a).join(',') === '1,2,2,3,4,6';
console.log('   结果:', results.copy_overlap ? '✅ 正确' : '❌ 错误');

// 测试 2: encoding 大小写
console.log('\n2. 测试 encoding 大小写:');
results.isEncoding_UTF8 = Buffer.isEncoding('UTF8');
results.isEncoding_Base64URL = Buffer.isEncoding('Base64URL');
console.log('   Buffer.isEncoding("UTF8"):', results.isEncoding_UTF8);
console.log('   Buffer.isEncoding("Base64URL"):', results.isEncoding_Base64URL);

try {
    const hexBuf = Buffer.from('616263', 'HEX');
    results.from_HEX = hexBuf.toString('Utf8') === 'abc';
    console.log('   Buffer.from("616263", "HEX").toString("Utf8"):', hexBuf.toString('Utf8'));
} catch (e) {
    results.from_HEX = false;
    console.log('   Buffer.from("616263", "HEX") 失败:', e.message);
}

console.log('   结果:', (results.isEncoding_UTF8 && results.isEncoding_Base64URL && results.from_HEX) ? '✅ 正确' : '❌ 错误');

// 测试 3: base64url 宽松（有 padding/空白）
console.log('\n3. 测试 base64url 宽松解码:');
const s = Buffer.from('abc').toString('base64url'); // 'YWJj'
console.log('   原始 base64url:', s);

try {
    const withPadding = Buffer.from(s + '==', 'base64url');
    results.base64url_padding = withPadding.toString('utf8') === 'abc';
    console.log('   带 padding "' + s + '==":', withPadding.toString('utf8'));
} catch (e) {
    results.base64url_padding = false;
    console.log('   带 padding 失败:', e.message);
}

try {
    const withSpaces = Buffer.from('Y W J j', 'base64url');
    results.base64url_spaces = withSpaces.toString('utf8') === 'abc';
    console.log('   带空格 "Y W J j":', withSpaces.toString('utf8'));
} catch (e) {
    results.base64url_spaces = false;
    console.log('   带空格失败:', e.message);
}

console.log('   结果:', (results.base64url_padding && results.base64url_spaces) ? '✅ 正确' : '❌ 错误');

// 测试 4: indexOf 的 base64url
console.log('\n4. 测试 indexOf base64url:');
try {
    const buf4 = Buffer.from('test');
    const encoded = buf4.toString('base64url');
    console.log('   "test" 的 base64url:', encoded);
    
    const index = buf4.indexOf(encoded, 0, 'base64url');
    results.indexOf_base64url = index === 0;
    console.log('   indexOf("' + encoded + '", 0, "base64url"):', index);
    console.log('   结果:', results.indexOf_base64url ? '✅ 正确' : '❌ 错误');
} catch (e) {
    results.indexOf_base64url = false;
    console.log('   indexOf base64url 失败:', e.message);
}

// 测试 5: 验证共享视图仍然工作
console.log('\n5. 验证共享视图仍然工作:');
const buf5 = Buffer.from([10, 20, 30, 40, 50]);
const slice5 = buf5.slice(1, 4);
slice5[0] = 99;
results.slice_still_shared = buf5[1] === 99;
console.log('   buf5[1] =', buf5[1]);
console.log('   结果:', results.slice_still_shared ? '✅ 共享视图正常' : '❌ 共享视图失败');

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');

const passCount = Object.values(results).filter(function(v) { return v === true; }).length;
const totalCount = Object.keys(results).length;

console.log('通过:', passCount + '/' + totalCount);
console.log('成功率:', ((passCount / totalCount) * 100).toFixed(1) + '%');

if (passCount === totalCount) {
    console.log('\n🎉 所有测试通过！');
} else {
    console.log('\n⚠️  部分测试失败');
    console.log('\n失败的测试:');
    for (const key in results) {
        if (!results[key]) {
            console.log('  -', key);
        }
    }
}

// 返回结果
return {
    passed: passCount,
    total: totalCount,
    successRate: ((passCount / totalCount) * 100).toFixed(1) + '%',
    details: results
};
