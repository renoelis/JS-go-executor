// qs.stringify() 批次4: 边界条件和特殊情况测试
// 版本: qs v6.14.0
// 用例数: 约 50 个

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = got === expect;
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function tError(name, fn, expectedErrorMessage) {
      total++;
      try {
        fn();
        detail.push({ case: name, expect: 'Error', got: 'No error', pass: false });
        console.log(`❌ ${name} - Expected error but none thrown`);
        return false;
      } catch (err) {
        const ok = err.message.includes(expectedErrorMessage);
        detail.push({ case: name, expect: expectedErrorMessage, got: err.message, pass: ok });
        console.log(`${ok ? '✅' : '❌'} ${name}`);
        if (ok) pass++;
        return ok;
      }
    }

    console.log('📦 批次4: 边界条件和特殊情况测试\n');

    // 空值和边界情况
    console.log('空值和边界测试:');
    t('stringify empty string value', qs.stringify({ a: '' }), 'a=');
    t('stringify multiple empty values', qs.stringify({ a: '', b: '', c: '' }), 'a=&b=&c=');
    t('stringify empty key (not supported, treated as normal)', 
      qs.stringify({ '': 'value' }), '=value');
    t('stringify whitespace key', qs.stringify({ ' ': 'value' }), '%20=value');
    t('stringify whitespace value', qs.stringify({ a: '   ' }), 'a=%20%20%20');

    // 特殊字符
    console.log('\n特殊字符测试:');
    t('stringify with &', qs.stringify({ a: 'b&c' }), 'a=b%26c');
    t('stringify with =', qs.stringify({ a: 'b=c' }), 'a=b%3Dc');
    t('stringify with ?', qs.stringify({ a: 'b?c' }), 'a=b%3Fc');
    t('stringify with #', qs.stringify({ a: 'b#c' }), 'a=b%23c');
    t('stringify with /', qs.stringify({ a: 'b/c' }), 'a=b%2Fc');
    t('stringify with backslash', qs.stringify({ a: 'b\\c' }), 'a=b%5Cc');
    t('stringify with quotes', qs.stringify({ a: 'b"c\'d' }), 'a=b%22c%27d');
    t('stringify with newline', qs.stringify({ a: 'b\nc' }), 'a=b%0Ac');
    t('stringify with tab', qs.stringify({ a: 'b\tc' }), 'a=b%09c');
    t('stringify with unicode', qs.stringify({ a: '你好' }), 'a=%E4%BD%A0%E5%A5%BD');
    t('stringify with emoji', qs.stringify({ a: '😀' }), 'a=%F0%9F%98%80');

    // 数字和布尔值
    console.log('\n数字和布尔值测试:');
    t('stringify zero', qs.stringify({ a: 0 }), 'a=0');
    t('stringify negative number', qs.stringify({ a: -123 }), 'a=-123');
    t('stringify float', qs.stringify({ a: 3.14 }), 'a=3.14');
    t('stringify large number', qs.stringify({ a: 999999999999 }), 'a=999999999999');
    t('stringify scientific notation', qs.stringify({ a: 1e10 }), 'a=10000000000');
    t('stringify boolean true', qs.stringify({ a: true }), 'a=true');
    t('stringify boolean false', qs.stringify({ a: false }), 'a=false');

    // undefined 处理
    console.log('\nundefined 处理测试:');
    t('stringify undefined value (should skip)', 
      qs.stringify({ a: undefined, b: 'c' }), 'b=c');
    t('stringify all undefined', 
      qs.stringify({ a: undefined, b: undefined }), '');
    t('stringify nested undefined', 
      qs.stringify({ a: { b: undefined, c: 'd' } }), 'a%5Bc%5D=d');
    t('stringify array with undefined', 
      qs.stringify({ a: [undefined, 'b', undefined] }), 'a%5B1%5D=b');

    // 数组边界情况
    console.log('\n数组边界测试:');
    t('stringify single element array', qs.stringify({ a: ['b'] }), 'a%5B0%5D=b');
    t('stringify large array (10 elements)', 
      qs.stringify({ a: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }), 
      'a%5B0%5D=0&a%5B1%5D=1&a%5B2%5D=2&a%5B3%5D=3&a%5B4%5D=4&a%5B5%5D=5&a%5B6%5D=6&a%5B7%5D=7&a%5B8%5D=8&a%5B9%5D=9');
    t('stringify array with null', 
      qs.stringify({ a: [null, 'b'] }), 'a%5B0%5D=&a%5B1%5D=b');
    t('stringify array with mixed types', 
      qs.stringify({ a: ['str', 123, true, null] }), 
      'a%5B0%5D=str&a%5B1%5D=123&a%5B2%5D=true&a%5B3%5D=');

    // 深度嵌套
    console.log('\n深度嵌套测试:');
    t('stringify 4-level nesting', 
      qs.stringify({ a: { b: { c: { d: { e: 'f' } } } } }), 
      'a%5Bb%5D%5Bc%5D%5Bd%5D%5Be%5D=f');
    t('stringify 5-level nesting', 
      qs.stringify({ a: { b: { c: { d: { e: { f: 'g' } } } } } }), 
      'a%5Bb%5D%5Bc%5D%5Bd%5D%5Be%5D%5Bf%5D=g');
    t('stringify nested arrays in objects', 
      qs.stringify({ a: { b: [{ c: ['d'] }] } }), 
      'a%5Bb%5D%5B0%5D%5Bc%5D%5B0%5D=d');

    // 循环引用检测
    console.log('\n循环引用测试:');
    tError('stringify circular reference (self)', function() {
      const obj = { a: 'b' };
      obj.self = obj;
      qs.stringify(obj);
    }, 'Cyclic');

    tError('stringify circular reference (nested)', function() {
      const obj = { a: { b: 'c' } };
      obj.a.parent = obj;
      qs.stringify(obj);
    }, 'Cyclic');

    tError('stringify circular reference (array)', function() {
      const obj = { a: [] };
      obj.a.push(obj);
      qs.stringify(obj);
    }, 'Cyclic');

    // commaRoundTrip 选项
    console.log('\ncommaRoundTrip 选项测试:');
    t('stringify single element with commaRoundTrip=false', 
      qs.stringify({ a: ['b'] }, { arrayFormat: 'comma' }), 
      'a=b');
    t('stringify single element with commaRoundTrip=true', 
      qs.stringify({ a: ['b'] }, { arrayFormat: 'comma', commaRoundTrip: true }), 
      'a%5B%5D=b');
    t('stringify multiple elements with commaRoundTrip', 
      qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'comma', commaRoundTrip: true }), 
      'a=b%2Cc');

    // allowSparse 选项
    console.log('\nallowSparse 选项测试:');
    const sparseArray = [];
    sparseArray[0] = 'a';
    sparseArray[2] = 'c';
    sparseArray[5] = 'f';
    
    t('stringify sparse array (default - skips undefined)', 
      qs.stringify({ arr: sparseArray }), 
      'arr%5B0%5D=a&arr%5B2%5D=c&arr%5B5%5D=f');
    
    t('stringify sparse array with allowSparse=true', 
      qs.stringify({ arr: sparseArray }, { allowSparse: true }), 
      'arr%5B0%5D=a&arr%5B2%5D=c&arr%5B5%5D=f');

    // 点号在键中的处理
    console.log('\n点号在键中的处理:');
    t('stringify dot in key (default)', 
      qs.stringify({ 'a.b': 'c' }), 
      'a.b=c');
    t('stringify dot in key with encode=false', 
      qs.stringify({ 'a.b': 'c' }, { encode: false }), 
      'a.b=c');
    t('stringify nested object with dot key', 
      qs.stringify({ x: { 'a.b': 'c' } }), 
      'x%5Ba.b%5D=c');

    // 键顺序保持
    console.log('\n键顺序测试:');
    t('stringify maintains key order', 
      qs.stringify({ z: '1', y: '2', x: '3', a: '4', b: '5' }), 
      'z=1&y=2&x=3&a=4&b=5');
    t('stringify nested maintains order', 
      qs.stringify({ outer: { z: '1', a: '2' } }), 
      'outer%5Bz%5D=1&outer%5Ba%5D=2');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次4测试汇总:', JSON.stringify(summary, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return testResults;

  } catch (err) {
    const result = {
      success: false,
      error: {
        message: err && err.message,
        stack: err && err.stack
      }
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();

