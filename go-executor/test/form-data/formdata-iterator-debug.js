/**
 * FormData 迭代器调试脚本
 * 排查 keys(), values(), entries() 为什么报 "object is not iterable"
 */

console.log('=== FormData 迭代器调试 ===\n');

// 测试 1: 检查 FormData 实例
console.log('步骤 1: 创建 FormData 实例');
const form = new FormData();
form.append('name', 'John');
form.append('email', 'john@example.com');
form.append('age', '30');

console.log('  FormData 实例创建成功');
console.log('  typeof form:', typeof form);
console.log('');

// 测试 2: 检查迭代器方法是否存在
console.log('步骤 2: 检查迭代器方法');
console.log('  typeof form.keys:', typeof form.keys);
console.log('  typeof form.values:', typeof form.values);
console.log('  typeof form.entries:', typeof form.entries);
console.log('  typeof form[Symbol.iterator]:', typeof form[Symbol.iterator]);
console.log('');

// 测试 3: 调用 keys() 并检查返回值
console.log('步骤 3: 调用 keys() 方法');
try {
    const keysResult = form.keys();
    console.log('  keys() 调用成功');
    console.log('  typeof keysResult:', typeof keysResult);
    console.log('  keysResult.constructor.name:', keysResult.constructor ? keysResult.constructor.name : 'no constructor');
    console.log('  typeof keysResult.next:', typeof keysResult.next);
    console.log('  typeof keysResult[Symbol.iterator]:', typeof keysResult[Symbol.iterator]);
    
    // 检查是否有 Symbol.iterator
    if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        console.log('  Symbol.iterator 存在');
        console.log('  keysResult[Symbol.iterator]:', keysResult[Symbol.iterator]);
    } else {
        console.log('  ⚠️  Symbol.iterator 不存在');
    }
} catch (e) {
    console.log('  ❌ keys() 调用失败:', e.message);
    console.log('  Stack:', e.stack);
}
console.log('');

// 测试 4: 手动调用 next()
console.log('步骤 4: 手动调用 next()');
try {
    const keysIterator = form.keys();
    console.log('  尝试调用 next()...');
    const result1 = keysIterator.next();
    console.log('  第一次 next():', JSON.stringify(result1));
    
    const result2 = keysIterator.next();
    console.log('  第二次 next():', JSON.stringify(result2));
    
    const result3 = keysIterator.next();
    console.log('  第三次 next():', JSON.stringify(result3));
    
    const result4 = keysIterator.next();
    console.log('  第四次 next():', JSON.stringify(result4));
} catch (e) {
    console.log('  ❌ next() 调用失败:', e.message);
}
console.log('');

// 测试 5: 尝试 for...of
console.log('步骤 5: 尝试 for...of 循环');
try {
    console.log('  尝试: for (const key of form.keys())');
    const keys = [];
    for (const key of form.keys()) {
        keys.push(key);
    }
    console.log('  ✅ for...of 成功!');
    console.log('  keys:', JSON.stringify(keys));
} catch (e) {
    console.log('  ❌ for...of 失败:', e.message);
    console.log('  这是预期的错误!');
}
console.log('');

// 测试 6: 检查迭代器协议
console.log('步骤 6: 检查迭代器协议实现');
try {
    const keysIterator = form.keys();
    
    // 检查是否实现了迭代器协议
    console.log('  检查 next 方法:', typeof keysIterator.next === 'function');
    
    // 检查是否实现了可迭代协议
    if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        const iteratorFunc = keysIterator[Symbol.iterator];
        console.log('  检查 Symbol.iterator:', typeof iteratorFunc);
        
        if (typeof iteratorFunc === 'function') {
            const iter = iteratorFunc.call(keysIterator);
            console.log('  调用 Symbol.iterator() 返回:', typeof iter);
            console.log('  返回的是自己?', iter === keysIterator);
        }
    }
} catch (e) {
    console.log('  ❌ 协议检查失败:', e.message);
}
console.log('');

// 测试 7: 使用 while 循环模拟 for...of
console.log('步骤 7: 使用 while 循环 (for...of 的替代方案)');
try {
    const keysIterator = form.keys();
    const keys = [];
    let result = keysIterator.next();
    
    while (!result.done) {
        keys.push(result.value);
        result = keysIterator.next();
    }
    
    console.log('  ✅ while 循环成功!');
    console.log('  收集的 keys:', JSON.stringify(keys));
} catch (e) {
    console.log('  ❌ while 循环失败:', e.message);
}
console.log('');

// 测试 8: 测试 forEach (标准方法)
console.log('步骤 8: 测试 forEach 方法');
try {
    if (typeof form.forEach === 'function') {
        const collected = [];
        form.forEach(function(value, key) {
            collected.push({ key: key, value: value });
        });
        console.log('  ✅ forEach 成功!');
        console.log('  收集的数据:', JSON.stringify(collected));
    } else {
        console.log('  ⚠️  forEach 方法不存在');
    }
} catch (e) {
    console.log('  ❌ forEach 失败:', e.message);
}
console.log('');

// 测试 9: 检查 Goja 的 for...of 支持
console.log('步骤 9: 检查 Goja 对 for...of 的一般支持');
try {
    const testArray = ['a', 'b', 'c'];
    const result = [];
    for (const item of testArray) {
        result.push(item);
    }
    console.log('  ✅ 数组的 for...of 工作正常');
    console.log('  结果:', JSON.stringify(result));
} catch (e) {
    console.log('  ❌ 数组的 for...of 失败:', e.message);
    console.log('  这说明 Goja 不支持 for...of!');
}
console.log('');

// 总结
console.log('=== 诊断总结 ===');
console.log('');
console.log('如果看到 "object is not iterable" 错误:');
console.log('  可能原因 1: Goja 不支持 ES6 for...of 语法');
console.log('  可能原因 2: FormData 迭代器没有正确实现 Symbol.iterator');
console.log('  可能原因 3: Symbol.iterator 在 Goja 中不可用');
console.log('');
console.log('解决方案:');
console.log('  1. 使用 while + next() 代替 for...of');
console.log('  2. 使用 forEach() 方法 (如果可用)');
console.log('  3. 手动实现迭代逻辑');

return {
    message: '调试完成,请查看上面的输出'
};








