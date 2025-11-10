// qs.stringify() 批次1: 基础功能 + 简单对象 + 数组处理
// 版本: qs v6.14.0
// 用例数: 约 40 个

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

    console.log('📦 批次1: 基础功能 + 简单对象 + 数组处理\n');

    // 基础功能
    console.log('基础功能测试:');
    t('stringify empty object', qs.stringify({}), '');
    t('stringify null', qs.stringify(null), '');
    t('stringify undefined', qs.stringify(undefined), '');
    t('stringify single key-value', qs.stringify({ a: 'b' }), 'a=b');
    t('stringify multiple keys', qs.stringify({ a: 'b', c: 'd', e: 'f' }), 'a=b&c=d&e=f');
    t('stringify empty value', qs.stringify({ a: '' }), 'a=');
    t('stringify special characters', 
      qs.stringify({ a: 'b c', d: 'e&f' }), 'a=b%20c&d=e%26f');
    t('stringify with equals in value', qs.stringify({ a: 'b=c' }), 'a=b%3Dc');
    t('stringify number value', qs.stringify({ a: 123 }), 'a=123');
    t('stringify boolean true', qs.stringify({ a: true }), 'a=true');
    t('stringify boolean false', qs.stringify({ a: false }), 'a=false');

    // 嵌套对象
    console.log('\n嵌套对象测试:');
    t('stringify simple nested', 
      qs.stringify({ a: { b: 'c' } }), 'a%5Bb%5D=c');
    t('stringify 2-level nested', 
      qs.stringify({ a: { b: { c: 'd' } } }), 'a%5Bb%5D%5Bc%5D=d');
    t('stringify 3-level nested', 
      qs.stringify({ a: { b: { c: { d: 'e' } } } }), 'a%5Bb%5D%5Bc%5D%5Bd%5D=e');
    t('stringify nested with multiple keys', 
      qs.stringify({ a: { b: '1', c: '2', d: '3' } }), 
      'a%5Bb%5D=1&a%5Bc%5D=2&a%5Bd%5D=3');
    t('stringify mixed nested and flat', 
      qs.stringify({ a: 'b', c: { d: 'e' } }), 
      'a=b&c%5Bd%5D=e');

    // 数组处理 - indices (默认)
    console.log('\n数组处理测试 (默认 indices):');
    t('stringify array with indices', 
      qs.stringify({ a: ['b', 'c', 'd'] }), 'a%5B0%5D=b&a%5B1%5D=c&a%5B2%5D=d');
    t('stringify single element array', 
      qs.stringify({ a: ['b'] }), 'a%5B0%5D=b');
    t('stringify empty array', 
      qs.stringify({ a: [] }), '');
    t('stringify array with numbers', 
      qs.stringify({ a: [1, 2, 3] }), 'a%5B0%5D=1&a%5B1%5D=2&a%5B2%5D=3');
    t('stringify nested array', 
      qs.stringify({ a: [{ b: 'c' }] }), 'a%5B0%5D%5Bb%5D=c');
    t('stringify array of arrays', 
      qs.stringify({ a: [['b', 'c'], ['d']] }), 
      'a%5B0%5D%5B0%5D=b&a%5B0%5D%5B1%5D=c&a%5B1%5D%5B0%5D=d');

    // 数组格式 - brackets
    console.log('\n数组格式测试 - brackets:');
    t('stringify array with brackets format', 
      qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'brackets' }), 
      'a%5B%5D=b&a%5B%5D=c');
    t('stringify single element array brackets', 
      qs.stringify({ a: ['b'] }, { arrayFormat: 'brackets' }), 
      'a%5B%5D=b');

    // 数组格式 - repeat
    console.log('\n数组格式测试 - repeat:');
    t('stringify array with repeat format', 
      qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'repeat' }), 
      'a=b&a=c');
    t('stringify single element array repeat', 
      qs.stringify({ a: ['b'] }, { arrayFormat: 'repeat' }), 
      'a=b');

    // 数组格式 - comma
    console.log('\n数组格式测试 - comma:');
    t('stringify array with comma format', 
      qs.stringify({ a: ['b', 'c', 'd'] }, { arrayFormat: 'comma' }), 
      'a=b%2Cc%2Cd');
    t('stringify single element array comma', 
      qs.stringify({ a: ['b'] }, { arrayFormat: 'comma' }), 
      'a=b');
    t('stringify empty array comma', 
      qs.stringify({ a: [] }, { arrayFormat: 'comma' }), 
      '');

    // encode 选项
    console.log('\nencode 选项测试:');
    t('stringify with encode=false', 
      qs.stringify({ a: 'b c' }, { encode: false }), 
      'a=b c');
    t('stringify nested with encode=false', 
      qs.stringify({ a: { b: 'c' } }, { encode: false }), 
      'a[b]=c');
    t('stringify array with encode=false', 
      qs.stringify({ a: ['b', 'c'] }, { encode: false, arrayFormat: 'brackets' }), 
      'a[]=b&a[]=c');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次1测试汇总:', JSON.stringify(summary, null, 2));
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

