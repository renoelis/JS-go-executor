// qs.parse() 批次3: comma + delimiter + charset + charsetSentinel
// 版本: qs v6.14.0
// 用例数: 约 25 个

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

    console.log('📦 批次3: comma + delimiter + charset + charsetSentinel\n');

    // comma
    console.log('comma 测试:');
    t('parse comma: false', qs.parse('a=b,c', { comma: false }), { a: 'b,c' });
    t('parse comma: true', qs.parse('a=b,c', { comma: true }), { a: ['b', 'c'] });
    t('parse comma: true (multiple values)', qs.parse('a=1,2,3', { comma: true }), 
      { a: ['1', '2', '3'] });
    t('parse comma: true (multiple params)', qs.parse('a=1,2&b=3,4', { comma: true }), 
      { a: ['1', '2'], b: ['3', '4'] });
    t('parse comma: true (single value)', qs.parse('a=b', { comma: true }), { a: 'b' });
    t('parse comma: true (empty values)', qs.parse('a=,', { comma: true }), { a: ['', ''] });
    t('parse comma: true (nested)', qs.parse('a[b]=1,2', { comma: true }), 
      { a: { b: ['1', '2'] } });
    t('parse comma + parseArrays: false', qs.parse('a=1,2', { comma: true, parseArrays: false }), 
      { a: { '0': '1', '1': '2' } });

    // delimiter
    console.log('\ndelimiter 测试:');
    t('parse delimiter: ;', qs.parse('a=1;b=2', { delimiter: ';' }), { a: '1', b: '2' });
    t('parse delimiter: |', qs.parse('a=1|b=2|c=3', { delimiter: '|' }), 
      { a: '1', b: '2', c: '3' });
    t('parse delimiter: ,', qs.parse('a=1,b=2', { delimiter: ',' }), { a: '1', b: '2' });
    t('parse delimiter: regex /[;&]/', qs.parse('a=1;b=2&c=3', { delimiter: /[;&]/ }), 
      { a: '1', b: '2', c: '3' });
    t('parse delimiter: regex /[|,]/', qs.parse('a=1|b=2,c=3', { delimiter: /[|,]/ }), 
      { a: '1', b: '2', c: '3' });
    t('parse delimiter: →', qs.parse('a=1→b=2', { delimiter: '→' }), { a: '1', b: '2' });
    t('parse delimiter: ; + allowDots', 
      qs.parse('a.b=1;c.d=2', { delimiter: ';', allowDots: true }), 
      { a: { b: '1' }, c: { d: '2' } });
    t('parse delimiter: ; + comma', 
      qs.parse('a=1,2;b=3,4', { delimiter: ';', comma: true }), 
      { a: ['1', '2'], b: ['3', '4'] });

    // charset
    console.log('\ncharset 测试:');
    t('parse charset: utf-8', qs.parse('a=%E4%B8%AD%E6%96%87', { charset: 'utf-8' }), 
      { a: '中文' });
    t('parse charset: utf-8 (unicode)', qs.parse('a=%E2%9C%93', { charset: 'utf-8' }), { a: '✓' });
    t('parse charset: iso-8859-1', qs.parse('a=%A3%BF', { charset: 'iso-8859-1' }), { a: '£¿' });
    t('parse charset: iso-8859-1 (latin)', qs.parse('a=%E9', { charset: 'iso-8859-1' }), { a: 'é' });

    // charsetSentinel
    console.log('\ncharsetSentinel 测试:');
    t('parse charsetSentinel: true (with utf8 sentinel)', 
      qs.parse('utf8=%E2%9C%93&a=%E4%B8%AD', { charsetSentinel: true }), { a: '中' });
    t('parse charsetSentinel: true (without sentinel)', 
      qs.parse('a=b', { charsetSentinel: true }), { a: 'b' });
    t('parse charsetSentinel: true (with iso sentinel)', 
      qs.parse('utf8=%26%2310003%3B&a=%A3', { charsetSentinel: true, charset: 'iso-8859-1' }), 
      { a: '£' });
    t('parse charsetSentinel: false', 
      qs.parse('utf8=%E2%9C%93&a=b', { charsetSentinel: false }), { utf8: '✓', a: 'b' });

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次3测试汇总:', JSON.stringify(summary, null, 2));
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

