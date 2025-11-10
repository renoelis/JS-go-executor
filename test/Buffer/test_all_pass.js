const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer 模块最终验证测试');
console.log('========================================\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result) {
            console.log('✅', name);
            passed++;
            tests.push({ name, passed: true });
        } else {
            console.log('❌', name);
            failed++;
            tests.push({ name, passed: false });
        }
    } catch (e) {
        console.log('❌', name, '-', e.message);
        failed++;
        tests.push({ name, passed: false, error: e.message });
    }
}

// 1. 共享视图
test('slice 共享视图', function() {
    const buf = Buffer.from([1, 2, 3, 4, 5]);
    const slice = buf.slice(1, 4);
    slice[0] = 99;
    return buf[1] === 99;
});

test('subarray 共享视图', function() {
    const buf = Buffer.from([10, 20, 30, 40, 50]);
    const sub = buf.subarray(2, 5);
    sub[1] = 88;
    return buf[3] === 88;
});

// 2. copy 重叠
test('copy 跨视图重叠', function() {
    const a = Buffer.from([1, 2, 3, 4, 5, 6]);
    const x = a.subarray(1, 5);
    x.copy(a, 2, 0, 3);
    return Array.from(a).join(',') === '1,2,2,3,4,6';
});

// 3. encoding 大小写
test('HEX 大写', function() {
    return Buffer.from('616263', 'HEX').toString('utf8') === 'abc';
});

test('Base64URL 大写', function() {
    return Buffer.from('YWJj', 'Base64URL').toString('utf8') === 'abc';
});

test('Utf8 混合大小写', function() {
    return Buffer.from('hello', 'Utf8').toString() === 'hello';
});

// 4. base64url 宽松
test('base64url 无 padding', function() {
    return Buffer.from('YWJj', 'base64url').toString('utf8') === 'abc';
});

test('base64url 有 padding', function() {
    return Buffer.from('YWJj==', 'base64url').toString('utf8') === 'abc';
});

test('base64url 带空格', function() {
    return Buffer.from('Y W J j', 'base64url').toString('utf8') === 'abc';
});

// 5. indexOf/lastIndexOf
test('indexOf base64url', function() {
    const buf = Buffer.from('test');
    return buf.indexOf('dGVzdA', 0, 'base64url') === 0;
});

test('indexOf 负 offset', function() {
    const buf = Buffer.from('hello hello');
    return buf.indexOf('hello', -6) === 6;
});

test('lastIndexOf', function() {
    const buf = Buffer.from('hello hello');
    return buf.lastIndexOf('hello') === 6;
});

// 6. fill
test('fill 数字', function() {
    const buf = Buffer.alloc(5);
    buf.fill(0xAB);
    return Array.from(buf).join(',') === '171,171,171,171,171';
});

test('fill 字符串', function() {
    const buf = Buffer.alloc(9);
    buf.fill('abc');
    return buf.toString('utf8', 0, 9) === 'abcabcabc';
});

// 7. 边界检查
test('fill end 超出范围抛出错误', function() {
    try {
        const buf = Buffer.alloc(10);
        buf.fill(0xFF, 5, 20);
        return false;
    } catch (e) {
        return true;
    }
});

// 8. 编码
test('UTF-16 非 BMP 字符', function() {
    const buf = Buffer.from('𠮷', 'utf16le');
    return buf.length === 4;
});

test('latin1 UTF-16 码元', function() {
    const buf = Buffer.from('𠮷', 'latin1');
    return buf.length === 2;
});

// 9. 迭代器
test('values() 迭代器', function() {
    const buf = Buffer.from([10, 20, 30]);
    const iter = buf.values();
    const val1 = iter.next();
    return val1.value === 10 && val1.done === false;
});

test('keys() 迭代器', function() {
    const buf = Buffer.from([10, 20, 30]);
    const iter = buf.keys();
    const key1 = iter.next();
    return key1.value === 0 && key1.done === false;
});

test('entries() 迭代器', function() {
    const buf = Buffer.from([10, 20, 30]);
    const iter = buf.entries();
    const entry1 = iter.next();
    return entry1.value[0] === 0 && entry1.value[1] === 10;
});

console.log('\n========================================');
console.log('  测试结果');
console.log('========================================');
console.log('通过:', passed);
console.log('失败:', failed);
console.log('总计:', passed + failed);
console.log('成功率:', ((passed / (passed + failed)) * 100).toFixed(1) + '%');

if (failed === 0) {
    console.log('\n🎉 所有测试通过！Buffer 模块完全兼容 Node.js！');
} else {
    console.log('\n⚠️  有', failed, '个测试失败');
}

return {
    passed: passed,
    failed: failed,
    total: passed + failed,
    successRate: ((passed / (passed + failed)) * 100).toFixed(1) + '%',
    allPassed: failed === 0
};
