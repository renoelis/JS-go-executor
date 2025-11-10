/**
 * 🔒 干净的绕过测试（不使用被检测的关键词）
 */

console.log('🔒 安全测试开始\n');

// 测试 1: 通过字符串操作获取 Function
console.log('测试 1: 字符串拼接');
var part1 = 'Func';
var part2 = 'tion';
var name = part1 + part2;

console.log('  构造的名称: ' + name);
console.log('  尝试访问 globalThis[' + name + ']...');

// 注意：这里无法直接访问 globalThis，因为已被禁用
// 但可以尝试其他方式

// 测试 2: 使用对象属性链
console.log('\n测试 2: 对象属性链');
var obj = {};
var key = 'constr' + 'uctor';

console.log('  动态 key: ' + key);

try {
    var c = obj[key];
    console.log('  obj[key] 类型: ' + typeof c);
    
    if (c && c[key]) {
        console.log('  ❌ 警告: 可以访问构造器链');
        console.log('  类型: ' + typeof c[key]);
    }
} catch (e) {
    console.log('  ✅ 被阻止: ' + e.message);
}

// 测试 3: 数组方法链
console.log('\n测试 3: 数组属性链');
var arr = [];
var k = 'cons' + 'tructor';

try {
    var arrCtor = arr[k];
    console.log('  [].constructor 类型: ' + typeof arrCtor);
    
    if (arrCtor && arrCtor[k]) {
        console.log('  ❌ 严重: 可以访问 Array 构造器链');
        console.log('  这意味着可以执行任意代码！');
        
        // 尝试执行代码（不会真的执行危险代码，只是测试）
        var testCode = 'return 1 + 1';
        try {
            var result = arrCtor[k](testCode)();
            console.log('  执行结果: ' + result);
            console.log('  🔴 沙箱逃逸成功！');
        } catch (err) {
            console.log('  执行时被阻止: ' + err.message);
        }
    }
} catch (e) {
    console.log('  ✅ 被阻止: ' + e.message);
}

// 测试 4: Promise 链
console.log('\n测试 4: Promise 链');
var pk = 'constru' + 'ctor';

try {
    var PCtor = Promise[pk];
    console.log('  Promise.constructor 类型: ' + typeof PCtor);
    
    if (PCtor && PCtor[pk]) {
        console.log('  ❌ 严重: 可以通过 Promise 链访问');
    }
} catch (e) {
    console.log('  ✅ 被阻止: ' + e.message);
}

console.log('\n========================================');
console.log('测试完成');

return { 
    test: '安全绕过测试',
    message: '检查上面的输出查看结果'
};

