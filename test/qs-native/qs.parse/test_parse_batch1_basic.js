// qs.parse() 批次1: 基础功能 + 嵌套对象 + 数组处理
// 版本: qs v6.14.0
// 用例数: 约 30 个

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = deepEqual(got, expect);
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function deepEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return a === b;
      if (typeof a !== 'object' || typeof b !== 'object') return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (let key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }

      return true;
    }

    console.log('📦 批次1: 基础功能 + 嵌套对象 + 数组处理\n');

    // 基础功能
    t('parse empty string', qs.parse(''), {});
    t('parse whitespace only', qs.parse('   '), { '   ': '' });
    t('parse single param', qs.parse('a=b'), { a: 'b' });
    t('parse multiple params', qs.parse('a=b&c=d&e=f'), { a: 'b', c: 'd', e: 'f' });
    t('parse key without value', qs.parse('a'), { a: '' });
    t('parse key with empty value', qs.parse('a='), { a: '' });
    t('parse key with equals only', qs.parse('a=='), { a: '=' });
    t('parse multiple equals in value', qs.parse('a=b=c=d'), { a: 'b=c=d' });

    // 嵌套对象
    console.log('\n嵌套对象测试:');
    t('parse simple nesting', qs.parse('a[b]=c'), { a: { b: 'c' } });
    t('parse 2-level nesting', qs.parse('a[b][c]=d'), { a: { b: { c: 'd' } } });
    t('parse 3-level nesting', qs.parse('a[b][c][d]=e'), { a: { b: { c: { d: 'e' } } } });
    t('parse 5-level nesting', qs.parse('a[b][c][d][e]=f'), 
      { a: { b: { c: { d: { e: 'f' } } } } });
    t('parse 6-level nesting', qs.parse('a[b][c][d][e][f]=g'), 
      { a: { b: { c: { d: { e: { f: 'g' } } } } } });
    t('parse multiple nested keys', qs.parse('a[b]=1&a[c]=2&a[d]=3'), 
      { a: { b: '1', c: '2', d: '3' } });
    t('parse nested without value', qs.parse('a[b][c]'), { a: { b: { c: '' } } });

    // 数组处理
    console.log('\n数组处理测试:');
    t('parse array with empty brackets', qs.parse('a[]=1&a[]=2'), { a: ['1', '2'] });
    t('parse array with indices', qs.parse('a[0]=1&a[1]=2'), { a: ['1', '2'] });
    t('parse array out of order', qs.parse('a[2]=c&a[0]=a&a[1]=b'), { a: ['a', 'b', 'c'] });
    t('parse array sparse (0,2)', qs.parse('a[0]=1&a[2]=3'), { a: ['1', '3'] });
    t('parse array sparse (0,5)', qs.parse('a[0]=1&a[5]=6'), { a: ['1', '6'] });
    t('parse array single item', qs.parse('a[]=only'), { a: ['only'] });
    t('parse array single indexed', qs.parse('a[0]=only'), { a: ['only'] });
    t('parse array large index', qs.parse('a[999]=value'), { a: { '999': 'value' } });
    t('parse mixed array/object', qs.parse('a[0]=1&a[b]=2'), { a: { '0': '1', b: '2' } });
    t('parse nested array', qs.parse('a[0][b]=1&a[0][c]=2'), { a: [{ b: '1', c: '2' }] });
    t('parse array of arrays', qs.parse('a[0][0]=1&a[0][1]=2&a[1][0]=3'), 
      { a: [['1', '2'], ['3']] });

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

