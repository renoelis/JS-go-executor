// qs.parse() 批次2: ignoreQueryPrefix + allowDots + depth + 限制选项
// 版本: qs v6.14.0
// 用例数: 约 35 个

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

    console.log('📦 批次2: ignoreQueryPrefix + allowDots + depth + 限制选项\n');

    // ignoreQueryPrefix
    console.log('ignoreQueryPrefix 测试:');
    t('parse with ? (ignoreQueryPrefix: true)', 
      qs.parse('?a=b&c=d', { ignoreQueryPrefix: true }), { a: 'b', c: 'd' });
    t('parse with ? (ignoreQueryPrefix: false)', 
      qs.parse('?a=b', { ignoreQueryPrefix: false }), { '?a': 'b' });
    t('parse without ? (ignoreQueryPrefix: true)', 
      qs.parse('a=b', { ignoreQueryPrefix: true }), { a: 'b' });
    t('parse multiple ? (ignoreQueryPrefix: true)', 
      qs.parse('??a=b', { ignoreQueryPrefix: true }), { '?a': 'b' });
    t('parse ? in middle (ignoreQueryPrefix: true)', 
      qs.parse('a=b?c=d', { ignoreQueryPrefix: true }), { a: 'b?c=d' });

    // allowDots
    console.log('\nallowDots 测试:');
    t('parse dots (allowDots: false)', qs.parse('a.b=c', { allowDots: false }), { 'a.b': 'c' });
    t('parse dots (allowDots: true)', qs.parse('a.b=c', { allowDots: true }), { a: { b: 'c' } });
    t('parse deep dots', qs.parse('a.b.c.d.e=f', { allowDots: true }), 
      { a: { b: { c: { d: { e: 'f' } } } } });
    t('parse dots + brackets', qs.parse('a.b[c]=d', { allowDots: true }), { a: { b: { c: 'd' } } });
    t('parse brackets + dots', qs.parse('a[b].c=d', { allowDots: true }), { a: { b: { c: 'd' } } });
    t('parse dots with array', qs.parse('a.b[0]=1&a.b[1]=2', { allowDots: true }), 
      { a: { b: ['1', '2'] } });
    t('parse multiple dots paths', qs.parse('a.b=1&a.c=2&d.e=3', { allowDots: true }), 
      { a: { b: '1', c: '2' }, d: { e: '3' } });

    // depth
    console.log('\ndepth 测试:');
    t('parse depth: 0', qs.parse('a[b]=c', { depth: 0 }), { 'a[b]': 'c' });
    t('parse depth: 1', qs.parse('a[b][c]=d', { depth: 1 }), { a: { b: { '[c]': 'd' } } });
    t('parse depth: 2', qs.parse('a[b][c][d]=e', { depth: 2 }), 
      { a: { b: { c: { '[d]': 'e' } } } });
    t('parse depth: 5 (default)', qs.parse('a[b][c][d][e][f]=g', { depth: 5 }), 
      { a: { b: { c: { d: { e: { f: 'g' } } } } } });
    t('parse depth: 10', qs.parse('a[1][2][3][4][5][6][7][8][9][10]=v', { depth: 10 }), 
      { a: [[[[[[[[[['v']]]]]]]]]] });
    t('parse depth: Infinity', qs.parse('a[b][c][d][e][f][g][h]=i', { depth: Infinity }), 
      { a: { b: { c: { d: { e: { f: { g: { h: 'i' } } } } } } } });
    t('parse depth: false', qs.parse('a[b][c][d][e][f]=g', { depth: false }), 
      { 'a[b][c][d][e][f]': 'g' });
    t('parse allowDots + depth: 1', qs.parse('a.b.c=d', { allowDots: true, depth: 1 }), 
      { a: { b: { '[c]': 'd' } } });
    t('parse allowDots + depth: 0', qs.parse('a.b=c', { allowDots: true, depth: 0 }), 
      { 'a[b]': 'c' });

    // parameterLimit
    console.log('\nparameterLimit 测试:');
    t('parse parameterLimit: 1', qs.parse('a=1&b=2&c=3', { parameterLimit: 1 }), { a: '1' });
    t('parse parameterLimit: 2', qs.parse('a=1&b=2&c=3', { parameterLimit: 2 }), { a: '1', b: '2' });
    t('parse parameterLimit: 5', qs.parse('a=1&b=2&c=3', { parameterLimit: 5 }), 
      { a: '1', b: '2', c: '3' });
    t('parse parameterLimit: 0', qs.parse('a=1&b=2', { parameterLimit: 0 }), {});

    // arrayLimit
    console.log('\narrayLimit 测试:');
    t('parse arrayLimit: 0', qs.parse('a[0]=1&a[1]=2', { arrayLimit: 0 }), 
      { a: { '0': '1', '1': '2' } });
    t('parse arrayLimit: 1', qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: 1 }), 
      { a: { '0': '1', '1': '2', '2': '3' } });
    t('parse arrayLimit: 2', qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: 2 }), 
      { a: { '0': '1', '1': '2', '2': '3' } });
    t('parse arrayLimit: 20', qs.parse('a[0]=1&a[1]=2', { arrayLimit: 20 }), { a: ['1', '2'] });
    t('parse arrayLimit with large index', qs.parse('a[0]=1&a[100]=2', { arrayLimit: 20 }), 
      { a: { '0': '1', '100': '2' } });

    // parseArrays
    console.log('\nparseArrays 测试:');
    t('parse parseArrays: true', qs.parse('a[0]=1&a[1]=2', { parseArrays: true }), { a: ['1', '2'] });
    t('parse parseArrays: false', qs.parse('a[0]=1&a[1]=2', { parseArrays: false }), 
      { a: { '0': '1', '1': '2' } });

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次2测试汇总:', JSON.stringify(summary, null, 2));
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

