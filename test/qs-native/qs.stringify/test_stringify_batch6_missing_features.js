// qs.stringify() 批次6: 遗漏功能点补充测试
// 版本: qs v6.14.0
// 用例数: 约 30 个
// 涵盖: encoder/filter边界、charset编码、极端嵌套、特殊值

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

    console.log('📦 批次6: 遗漏功能点补充测试\n');

    // 点号在键中的处理
    console.log('点号键测试:');
    t('stringify dot in key', 
      qs.stringify({ 'a.b': 'c' }), 
      'a.b=c');
    t('stringify dot in nested key', 
      qs.stringify({ x: { 'a.b': 'c' } }), 
      'x%5Ba.b%5D=c');
    t('stringify dot key with allowDots', 
      qs.stringify({ 'a.b': 'c' }, { allowDots: true }), 
      'a.b=c');

    // charset 编码测试
    console.log('\ncharset 编码测试:');
    t('stringify with utf-8', 
      qs.stringify({ a: 'café' }), 
      'a=caf%C3%A9');
    t('stringify with iso-8859-1', 
      qs.stringify({ a: 'café' }, { charset: 'iso-8859-1' }), 
      'a=caf%E9');

    // 深度嵌套
    console.log('\n深度嵌套测试:');
    const deep10 = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: 'x' } } } } } } } } } };
    t('stringify 10-level deep', 
      qs.stringify(deep10), 
      'a%5Bb%5D%5Bc%5D%5Bd%5D%5Be%5D%5Bf%5D%5Bg%5D%5Bh%5D%5Bi%5D%5Bj%5D=x');

    // 超长字符串
    console.log('\n超长字符串测试:');
    const long100 = 'a'.repeat(100);
    t('stringify 100-char string', 
      qs.stringify({ x: long100 }), 
      'x=' + long100);

    // 混合嵌套
    console.log('\n混合嵌套测试:');
    t('stringify array of objects', 
      qs.stringify({ data: [{ a: 'b' }, { c: 'd' }] }), 
      'data%5B0%5D%5Ba%5D=b&data%5B1%5D%5Bc%5D=d');

    // encoder 函数边界
    console.log('\nencoder 边界测试:');
    t('encoder returns number', 
      qs.stringify({ a: 'b' }, { 
        encoder: function(str) { return 123; }
      }), 
      '123=123');
    
    t('encoder with defaultEncoder', 
      qs.stringify({ 'a b': 'c d' }, { 
        encoder: function(str, defaultEncoder) {
          return '[' + defaultEncoder(str) + ']';
        }
      }), 
      '[a%20b]=[c%20d]');

    // filter 函数边界
    console.log('\nfilter 边界测试:');
    t('filter returns null', 
      qs.stringify({ a: 'b', c: 'd' }, { 
        filter: function(prefix, value) {
          if (prefix === 'a') return null;
          return value;
        }
      }), 
      'a=&c=d');
    
    t('filter returns empty string', 
      qs.stringify({ a: 'b' }, { 
        filter: function(prefix, value) {
          return '';
        }
      }), 
      '');
    
    t('filter modifies array elements', 
      qs.stringify({ arr: [1, 2, 3] }, { 
        filter: function(prefix, value) {
          if (typeof value === 'number') return value * 10;
          return value;
        }
      }), 
      'arr%5B0%5D=10&arr%5B1%5D=20&arr%5B2%5D=30');

    // 特殊值
    console.log('\n特殊值测试:');
    t('stringify NaN', 
      qs.stringify({ a: NaN }), 
      'a=NaN');
    t('stringify Infinity', 
      qs.stringify({ a: Infinity }), 
      'a=Infinity');
    t('stringify -Infinity', 
      qs.stringify({ a: -Infinity }), 
      'a=-Infinity');

    // 复杂组合
    console.log('\n复杂组合测试:');
    t('allowDots + skipNulls + sort + addQueryPrefix', 
      qs.stringify(
        { z: { b: null, a: '1' }, m: '2', a: '3' }, 
        { 
          allowDots: true, 
          skipNulls: true, 
          sort: (a, b) => a.localeCompare(b),
          addQueryPrefix: true
        }
      ), 
      '?a=3&m=2&z.a=1');
    
    t('arrayFormat + delimiter + encodeValuesOnly', 
      qs.stringify(
        { 'x y': ['a', 'b'], 'p q': 'r' }, 
        { 
          arrayFormat: 'repeat', 
          delimiter: '|', 
          encodeValuesOnly: true 
        }
      ), 
      'x y=a|x y=b|p q=r');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次6测试汇总:', JSON.stringify(summary, null, 2));
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
