/**
 * 🔒 安全绕过测试
 * 
 * 目的：验证当前的字符串检测是否可以被绕过
 * ⚠️ 这些是真实的攻击向量，请在隔离环境中测试
 */

console.log('========================================');
console.log('🔒 安全绕过测试');
console.log('========================================\n');

var results = [];

// 测试 1: 字符串拼接绕过 Function 检测
console.log('测试 1: 字符串拼接绕过');
console.log('----------------------------------------');
try {
    var F = 'Func' + 'tion';
    var ctor = globalThis[F];
    if (typeof ctor === 'function') {
        console.log('❌ 绕过成功: 通过字符串拼接获取 Function 构造器');
        results.push({ test: 1, name: '字符串拼接', bypassed: true, critical: true });
    } else {
        console.log('✅ 防御成功: Function 构造器不可用');
        results.push({ test: 1, name: '字符串拼接', bypassed: false });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 1, name: '字符串拼接', bypassed: false });
}

// 测试 2: 构造器链绕过
console.log('\n测试 2: 构造器链绕过');
console.log('----------------------------------------');
try {
    var ctor = ({}).constructor.constructor;
    if (typeof ctor === 'function') {
        // 尝试执行代码
        var result = ctor('return "沙箱逃逸成功"')();
        console.log('❌ 严重漏洞: 通过构造器链执行任意代码');
        console.log('   执行结果: ' + result);
        results.push({ test: 2, name: '构造器链', bypassed: true, critical: true });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 2, name: '构造器链', bypassed: false });
}

// 测试 3: 编码绕过
console.log('\n测试 3: 编码绕过 (fromCharCode)');
console.log('----------------------------------------');
try {
    // "Function" 的字符编码
    var F = String.fromCharCode(70,117,110,99,116,105,111,110);
    var ctor = globalThis[F];
    if (typeof ctor === 'function') {
        console.log('❌ 绕过成功: 通过字符编码获取 Function');
        results.push({ test: 3, name: '编码绕过', bypassed: true, critical: true });
    } else {
        console.log('✅ 防御成功: Function 不可用');
        results.push({ test: 3, name: '编码绕过', bypassed: false });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 3, name: '编码绕过', bypassed: false });
}

// 测试 4: 数组构造器绕过
console.log('\n测试 4: 数组构造器绕过');
console.log('----------------------------------------');
try {
    var ctor = [].constructor.constructor;
    if (typeof ctor === 'function') {
        console.log('❌ 绕过成功: 通过数组构造器获取 Function');
        results.push({ test: 4, name: '数组构造器', bypassed: true, critical: true });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 4, name: '数组构造器', bypassed: false });
}

// 测试 5: Promise 构造器绕过
console.log('\n测试 5: Promise 构造器绕过');
console.log('----------------------------------------');
try {
    var ctor = Promise.constructor.constructor;
    if (typeof ctor === 'function') {
        console.log('❌ 绕过成功: 通过 Promise 构造器获取 Function');
        results.push({ test: 5, name: 'Promise构造器', bypassed: true, critical: true });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 5, name: 'Promise构造器', bypassed: false });
}

// 测试 6: 正则构造器绕过
console.log('\n测试 6: 正则构造器绕过');
console.log('----------------------------------------');
try {
    var ctor = /x/.constructor.constructor;
    if (typeof ctor === 'function') {
        console.log('❌ 绕过成功: 通过正则构造器获取 Function');
        results.push({ test: 6, name: '正则构造器', bypassed: true, critical: true });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 6, name: '正则构造器', bypassed: false });
}

// 测试 7: globalThis 访问绕过
console.log('\n测试 7: globalThis 间接访问');
console.log('----------------------------------------');
try {
    // 通过 this 获取全局对象
    var global = (function() { return this; })();
    if (global !== undefined) {
        console.log('❌ 绕过成功: 获取全局对象');
        console.log('   全局对象类型: ' + typeof global);
        results.push({ test: 7, name: 'globalThis间接访问', bypassed: true, critical: true });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 7, name: 'globalThis间接访问', bypassed: false });
}

// 测试 8: 原型污染
console.log('\n测试 8: 原型污染');
console.log('----------------------------------------');
try {
    Object.prototype.isAdmin = true;
    var testObj = {};
    if (testObj.isAdmin === true) {
        console.log('❌ 漏洞: 可以污染 Object 原型');
        delete Object.prototype.isAdmin;  // 清理
        results.push({ test: 8, name: '原型污染', bypassed: true, critical: false });
    }
} catch (e) {
    console.log('✅ 防御成功: ' + e.message);
    results.push({ test: 8, name: '原型污染', bypassed: false });
}

// 汇总结果
console.log('\n========================================');
console.log('📊 测试结果汇总');
console.log('========================================');

var criticalBypass = 0;
var totalBypass = 0;
var totalTests = results.length;

results.forEach(function(r) {
    if (r.bypassed) {
        totalBypass++;
        if (r.critical) {
            criticalBypass++;
        }
    }
});

console.log('总测试数: ' + totalTests);
console.log('成功绕过: ' + totalBypass + ' (' + ((totalBypass/totalTests)*100).toFixed(1) + '%)');
console.log('严重漏洞: ' + criticalBypass);

if (criticalBypass > 0) {
    console.log('\n🔴 警告: 发现 ' + criticalBypass + ' 个严重安全漏洞！');
    console.log('   建议立即修复: 在运行时层面禁用危险功能');
} else if (totalBypass > 0) {
    console.log('\n🟡 警告: 发现 ' + totalBypass + ' 个安全问题');
} else {
    console.log('\n✅ 良好: 所有测试都被正确防御');
}

console.log('\n详细结果:');
results.forEach(function(r) {
    var status = r.bypassed ? '❌' : '✅';
    var severity = r.critical ? '[严重]' : '[一般]';
    console.log('  ' + status + ' 测试 ' + r.test + ': ' + r.name + (r.bypassed && r.critical ? ' ' + severity : ''));
});

return {
    totalTests: totalTests,
    totalBypass: totalBypass,
    criticalBypass: criticalBypass,
    safe: criticalBypass === 0,
    results: results
};





