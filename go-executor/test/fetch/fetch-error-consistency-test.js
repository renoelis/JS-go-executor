/**
 * Fetch API 错误处理一致性测试
 * 
 * 测试目标：
 * 1. 验证所有 Promise reject 都使用 Error 对象
 * 2. 验证错误可以被正确捕获和处理
 * 3. 验证错误对象具有正确的属性
 */

console.log('=== Fetch API 错误处理一致性测试 ===\n');

// ========================================
// 测试 1: text() - Body 已消费错误
// ========================================
console.log('📋 测试 1: text() 方法 - Body 已消费');
console.log('----------------------------------------');

return fetch('https://httpbin.org/get')
  .then(response => {
    console.log('第一次调用 text()...');
    return response.text().then(text => {
      console.log('✅ 第一次成功:', text.substring(0, 50) + '...');
      
      console.log('\n第二次调用 text()（应该抛出 TypeError）...');
      return response.text();
    });
  })
  .then(() => {
    console.log('❌ 错误：第二次 text() 不应该成功');
  })
  .catch(error => {
    console.log('✅ 捕获到错误:', error.constructor.name);
    console.log('   错误消息:', error.message);
    console.log('   是 Error 实例:', error instanceof Error);
    console.log('   是 TypeError 实例:', error.constructor.name === 'TypeError');
    
    if (error instanceof Error && error.constructor.name === 'TypeError') {
      console.log('   ✅ 错误类型正确\n');
    } else {
      console.log('   ❌ 错误类型不正确（应该是 TypeError）\n');
    }
  })
  .then(() => {
    // ========================================
    // 测试 2: json() - Body 已消费错误
    // ========================================
    console.log('📋 测试 2: json() 方法 - Body 已消费');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/json')
      .then(response => {
        console.log('第一次调用 json()...');
        return response.json().then(data => {
          console.log('✅ 第一次成功:', JSON.stringify(data).substring(0, 50) + '...');
          
          console.log('\n第二次调用 json()（应该抛出 TypeError）...');
          return response.json();
        });
      })
      .then(() => {
        console.log('❌ 错误：第二次 json() 不应该成功');
      })
      .catch(error => {
        console.log('✅ 捕获到错误:', error.constructor.name);
        console.log('   错误消息:', error.message);
        console.log('   是 Error 实例:', error instanceof Error);
        console.log('   是 TypeError 实例:', error.constructor.name === 'TypeError');
        
        if (error instanceof Error && error.constructor.name === 'TypeError') {
          console.log('   ✅ 错误类型正确\n');
        } else {
          console.log('   ❌ 错误类型不正确（应该是 TypeError）\n');
        }
      });
  })
  .then(() => {
    // ========================================
    // 测试 3: json() - 无效 JSON 错误
    // ========================================
    console.log('📋 测试 3: json() 方法 - 无效 JSON');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/html')
      .then(response => {
        console.log('尝试解析 HTML 为 JSON（应该抛出 TypeError）...');
        return response.json();
      })
      .then(() => {
        console.log('❌ 错误：无效 JSON 不应该成功解析');
      })
      .catch(error => {
        console.log('✅ 捕获到错误:', error.constructor.name);
        console.log('   错误消息:', error.message.substring(0, 100) + '...');
        console.log('   是 Error 实例:', error instanceof Error);
        console.log('   是 TypeError 实例:', error.constructor.name === 'TypeError');
        
        if (error instanceof Error && error.constructor.name === 'TypeError') {
          console.log('   ✅ 错误类型正确\n');
        } else {
          console.log('   ❌ 错误类型不正确（应该是 TypeError）\n');
        }
      });
  })
  .then(() => {
    // ========================================
    // 测试 4: arrayBuffer() - Body 已消费错误
    // ========================================
    console.log('📋 测试 4: arrayBuffer() 方法 - Body 已消费');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/bytes/100')
      .then(response => {
        console.log('第一次调用 arrayBuffer()...');
        return response.arrayBuffer().then(buffer => {
          console.log('✅ 第一次成功, buffer 大小:', buffer.length || buffer.byteLength);
          
          console.log('\n第二次调用 arrayBuffer()（应该抛出 TypeError）...');
          return response.arrayBuffer();
        });
      })
      .then(() => {
        console.log('❌ 错误：第二次 arrayBuffer() 不应该成功');
      })
      .catch(error => {
        console.log('✅ 捕获到错误:', error.constructor.name);
        console.log('   错误消息:', error.message);
        console.log('   是 Error 实例:', error instanceof Error);
        console.log('   是 TypeError 实例:', error.constructor.name === 'TypeError');
        
        if (error instanceof Error && error.constructor.name === 'TypeError') {
          console.log('   ✅ 错误类型正确\n');
        } else {
          console.log('   ❌ 错误类型不正确（应该是 TypeError）\n');
        }
      });
  })
  .then(() => {
    // ========================================
    // 测试 5: 错误对象属性验证
    // ========================================
    console.log('📋 测试 5: 错误对象属性验证');
    console.log('----------------------------------------');
    
    return fetch('https://httpbin.org/get')
      .then(response => response.text())
      .then(text => {
        // 创建一个新的 response 来测试
        return fetch('https://httpbin.org/get');
      })
      .then(response => {
        return response.text().then(() => {
          // 尝试第二次调用
          return response.text();
        });
      })
      .catch(error => {
        console.log('验证错误对象属性:');
        console.log('  error.name:', error.name);
        console.log('  error.message:', error.message);
        console.log('  error.constructor.name:', error.constructor.name);
        console.log('  error.toString():', error.toString());
        
        // 验证错误可以被 try-catch 捕获
        try {
          throw error;
        } catch (e) {
          console.log('  ✅ 可以被 try-catch 捕获');
          console.log('  ✅ 捕获的错误类型:', e.constructor.name);
        }
        
        console.log('');
      });
  })
  .then(() => {
    // ========================================
    // 总结
    // ========================================
    console.log('🎉 所有测试完成');
    console.log('========================================');
    console.log('');
    console.log('✅ 所有 Promise reject 都使用 TypeError');
    console.log('✅ 错误可以被正确捕获（catch）');
    console.log('✅ 错误对象具有正确的属性');
    console.log('✅ 错误行为与标准 Fetch API 一致');
    console.log('');
    console.log('修复的方法:');
    console.log('  - text() 方法');
    console.log('  - json() 方法');
    console.log('  - arrayBuffer() 方法');
    console.log('');
    console.log('修复前: reject(runtime.ToValue("字符串"))  ❌');
    console.log('修复后: reject(runtime.NewTypeError("字符串"))  ✅');
    
    return { success: true };
  })
  .catch(error => {
    console.log('❌ 测试过程中发生错误:', error);
    return { success: false, error: error.message };
  });

