/**
 * 🔒 隐蔽绕过测试
 * 
 * 使用更隐蔽的方式绕过检测
 */

console.log('========================================');
console.log('🔒 隐蔽绕过测试');
console.log('========================================\n');

// 测试 1: 使用字符串拼接绕过 Function 检测
console.log('测试 1: 字符串拼接 + globalThis');
try {
    var funcName = 'Func' + 'tion';
    var global = eval('this');  // 获取全局对象
    var FunctionCtor = global[funcName];
    
    if (typeof FunctionCtor === 'function') {
        console.log('❌ 严重: 绕过成功，获取 Function 构造器');
        var result = FunctionCtor('return "沙箱逃逸"')();
        console.log('   执行结果: ' + result);
    }
} catch (e) {
    console.log('✅ 被阻止: ' + e.message);
}

// 测试 2: 间接访问全局对象
console.log('\n测试 2: 通过函数 this 获取全局对象');
try {
    var getGlobal = new Function('return this');
    var global = getGlobal();
    console.log('❌ 严重: 获取全局对象成功');
    console.log('   全局对象类型: ' + typeof global);
} catch (e) {
    console.log('✅ 被阻止: ' + e.message);
}

// 测试 3: 使用计算属性
console.log('\n测试 3: 使用计算属性名');
try {
    var obj = {};
    var key1 = 'const' + 'ructor';
    var key2 = key1;  // constructor
    var ctor = obj[key2][key2];  // obj.constructor.constructor
    
    if (typeof ctor === 'function') {
        console.log('❌ 严重: 通过计算属性绕过');
        var result = ctor('return 42')();
        console.log('   执行结果: ' + result);
    }
} catch (e) {
    console.log('✅ 被阻止: ' + e.message);
}

console.log('\n========================================');
console.log('测试完成');
console.log('========================================');

return { done: true };





