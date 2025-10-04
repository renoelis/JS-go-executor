// 测试迭代器兼容性
console.log('========================================');
console.log('URLSearchParams 迭代器兼容性测试');
console.log('========================================\n');

var params = new URLSearchParams([
    ['name', 'Alice'],
    ['age', '25'],
    ['skill', 'JavaScript'],
    ['skill', 'Go']
]);

console.log('【测试 1】entries() 迭代器');
console.log('----------------------------------------');
var entriesIterator = params.entries();
console.log('typeof entriesIterator:', typeof entriesIterator);
console.log('entriesIterator.next:', typeof entriesIterator.next);

// 测试手动调用 next()
var entry1 = entriesIterator.next();
console.log('第1次 next():', entry1.value, 'done:', entry1.done);
var entry2 = entriesIterator.next();
console.log('第2次 next():', entry2.value, 'done:', entry2.done);

console.log('\n【测试 2】keys() 返回类型');
console.log('----------------------------------------');
var keysResult = params.keys();
console.log('typeof keys():', typeof keysResult);
console.log('keys() instanceof Array:', Array.isArray ? Array.isArray(keysResult) : (keysResult instanceof Array));
console.log('keys().next:', keysResult.next);

console.log('\n【测试 3】values() 返回类型');
console.log('----------------------------------------');
var valuesResult = params.values();
console.log('typeof values():', typeof valuesResult);
console.log('values() instanceof Array:', Array.isArray ? Array.isArray(valuesResult) : (valuesResult instanceof Array));
console.log('values().next:', valuesResult.next);

console.log('\n【测试 4】entries() 是否支持 for...of');
console.log('----------------------------------------');
try {
    var count = 0;
    // 注意：Goja 可能不支持 for...of 语法，我们用 while 模拟
    var iter = params.entries();
    var result;
    while (!(result = iter.next()).done) {
        count++;
        console.log('  条目', count, ':', result.value[0], '=', result.value[1]);
    }
    console.log('✅ entries() 可以通过迭代器协议遍历');
} catch (e) {
    console.log('❌ 错误:', String(e));
}

console.log('\n【测试 5】Array.from(entries) 支持');
console.log('----------------------------------------');
try {
    if (typeof Array.from === 'function') {
        var entriesArray = Array.from(params.entries());
        console.log('Array.from 结果数量:', entriesArray.length);
        console.log('✅ 支持 Array.from()');
    } else {
        console.log('⚠️  Array.from 不存在');
    }
} catch (e) {
    console.log('❌ 错误:', String(e));
}

console.log('\n========================================');
console.log('测试完成');
console.log('========================================');

// 返回结果
return {
    success: true,
    message: '迭代器兼容性测试完成'
};

