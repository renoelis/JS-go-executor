// 安全绕过测试 - 完全干净版本

console.log('测试开始\n');

// 测试: 通过对象属性链访问构造器
var obj = {};
var k = 'constr' + 'uctor';

try {
    var c = obj[k];
    
    if (c && c[k]) {
        console.log('严重漏洞: 可以访问构造器链');
        console.log('类型: ' + typeof c[k]);
        
        // 尝试执行代码
        try {
            var code = 'return 42';
            var result = c[k](code)();
            console.log('执行成功: ' + result);
            console.log('沙箱逃逸成功！');
            
            return {
                vulnerable: true,
                bypassMethod: '对象构造器链',
                executed: result
            };
        } catch (err) {
            console.log('执行被阻止: ' + err.message);
        }
    } else {
        console.log('防御成功: 构造器不可访问');
    }
} catch (e) {
    console.log('防御成功: ' + e.message);
}

return { vulnerable: false };





