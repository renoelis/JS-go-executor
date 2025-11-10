/**
 * 测试 Array 包装是否影响正常使用
 */

console.log('测试 Array 包装功能\n');

const results = [];

// 测试 1: 数组字面量
console.log('测试 1: 数组字面量');
try {
    const arr = [1, 2, 3, 4, 5];
    console.log('  创建: [1,2,3,4,5]');
    console.log('  长度:', arr.length);
    console.log('  内容:', arr.join(','));
    console.log('  ✅ 通过');
    results.push({test: '数组字面量', success: true});
} catch (e) {
    console.log('  ❌ 失败:', e.message);
    results.push({test: '数组字面量', success: false, error: e.message});
}

// 测试 2: new Array()
console.log('\n测试 2: new Array()');
try {
    const arr = new Array();
    console.log('  创建: new Array()');
    console.log('  长度:', arr.length);
    console.log('  ✅ 通过');
    results.push({test: 'new Array()', success: true});
} catch (e) {
    console.log('  ❌ 失败:', e.message);
    results.push({test: 'new Array()', success: false, error: e.message});
}

// 测试 3: new Array(5)
console.log('\n测试 3: new Array(5)');
try {
    const arr = new Array(5);
    console.log('  创建: new Array(5)');
    console.log('  长度:', arr.length);
    console.log('  ✅ 通过');
    results.push({test: 'new Array(5)', success: true});
} catch (e) {
    console.log('  ❌ 失败:', e.message);
    results.push({test: 'new Array(5)', success: false, error: e.message});
}

// 测试 4: new Array(1, 2, 3)
console.log('\n测试 4: new Array(1, 2, 3)');
try {
    const arr = new Array(1, 2, 3);
    console.log('  创建: new Array(1, 2, 3)');
    console.log('  长度:', arr.length);
    console.log('  内容:', arr.join(','));
    
    if (arr.length !== 3 || arr[0] !== 1 || arr[1] !== 2 || arr[2] !== 3) {
        throw new Error('数组内容不正确');
    }
    
    console.log('  ✅ 通过');
    results.push({test: 'new Array(1,2,3)', success: true});
} catch (e) {
    console.log('  ❌ 失败:', e.message);
    results.push({test: 'new Array(1,2,3)', success: false, error: e.message});
}

// 测试 5: Array.from()
console.log('\n测试 5: Array.from()');
try {
    const arr = Array.from([10, 20, 30]);
    console.log('  创建: Array.from([10,20,30])');
    console.log('  长度:', arr.length);
    console.log('  内容:', arr.join(','));
    console.log('  ✅ 通过');
    results.push({test: 'Array.from()', success: true});
} catch (e) {
    console.log('  ❌ 失败:', e.message);
    results.push({test: 'Array.from()', success: false, error: e.message});
}

// 测试 6: Promise.all([])
console.log('\n测试 6: Promise.all([])');
try {
    Promise.all([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3)
    ]).then(values => {
        console.log('  Promise.all 结果:', values.join(','));
        console.log('  ✅ 通过');
    });
    results.push({test: 'Promise.all([])', success: true});
} catch (e) {
    console.log('  ❌ 失败:', e.message);
    results.push({test: 'Promise.all([])', success: false, error: e.message});
}

// 汇总
console.log('\n========================================');
console.log('测试结果');
console.log('========================================');

const passed = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log('总计:', results.length);
console.log('通过:', passed);
console.log('失败:', failed);

if (failed > 0) {
    console.log('\n失败的测试:');
    results.forEach(r => {
        if (!r.success) {
            console.log('  -', r.test + ':', r.error);
        }
    });
}

return {
    success: failed === 0,
    passed: passed,
    failed: failed,
    results: results
};







