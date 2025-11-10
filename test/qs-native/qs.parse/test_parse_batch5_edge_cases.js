// qs.parse() 批次5: 编码 + 边界输入 + 极端输入 + 特殊键名 + 真实场景
// 版本: qs v6.14.0
// 用例数: 约 40 个

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

    function tCondition(name, condition) {
      total++;
      const ok = Boolean(condition);
      detail.push({ case: name, pass: ok });
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

    console.log('📦 批次5: 编码 + 边界 + 极端输入 + 特殊键名 + 真实场景\n');

    // 编码与特殊字符
    console.log('编码与特殊字符:');
    t('parse URL encoded space', qs.parse('a=hello%20world'), { a: 'hello world' });
    t('parse plus as space', qs.parse('a=hello+world'), { a: 'hello world' });
    t('parse encoded special chars', qs.parse('a=%21%40%23%24%25%5E%26%2A'), { a: '!@#$%^&*' });
    t('parse unicode', qs.parse('a=%E2%9C%93%E2%9C%94'), { a: '✓✔' });
    t('parse encoded brackets', qs.parse('a=%5Bvalue%5D'), { a: '[value]' });
    t('parse encoded equals', qs.parse('a=b%3Dc'), { a: 'b=c' });
    t('parse incomplete percent', qs.parse('a=%'), { a: '%' });
    t('parse malformed percent', qs.parse('a=%ZZ'), { a: '%ZZ' });
    t('parse percent in key', qs.parse('%25key=value'), { '%key': 'value' });
    t('parse null byte', qs.parse('a=b%00c'), { a: 'b\x00c' });

    // 边界与异常输入
    console.log('\n边界与异常输入:');
    t('parse empty value', qs.parse('a=&b=c'), { a: '', b: 'c' });
    t('parse multiple empty values', qs.parse('a=&b=&c='), { a: '', b: '', c: '' });
    t('parse only key (no equals)', qs.parse('a&b&c'), { a: '', b: '', c: '' });
    t('parse trailing &', qs.parse('a=1&'), { a: '1' });
    t('parse leading &', qs.parse('&a=1'), { a: '1' });
    t('parse multiple &', qs.parse('a=1&&b=2'), { a: '1', b: '2' });
    t('parse only ?', qs.parse('?', { ignoreQueryPrefix: true }), {});
    t('parse only &', qs.parse('&'), {});
    t('parse only =', qs.parse('='), {});
    t('parse empty key', qs.parse('=value'), {});
    t('parse only delimiters', qs.parse('&&&'), {});

    // 极端输入
    console.log('\n极端输入/DoS防护:');
    const longKey = 'k'.repeat(100);
    const longValue = 'v'.repeat(100);
    t('parse long key', qs.parse(`${longKey}=value`), { [longKey]: 'value' });
    t('parse long value', qs.parse(`key=${longValue}`), { key: longValue });

    const manyParams = Array.from({ length: 50 }, (_, i) => `p${i}=${i}`).join('&');
    tCondition('parse 50 parameters', Object.keys(qs.parse(manyParams)).length === 50);

    const manyDuplicates = Array(50).fill('a=1').join('&');
    const dupResult = qs.parse(manyDuplicates);
    tCondition('parse 50 duplicate keys', Array.isArray(dupResult.a) && dupResult.a.length === 50);

    t('parse huge array index', qs.parse('a[999999]=value'), { a: { '999999': 'value' } });

    // 特殊键名
    console.log('\n特殊键名:');
    t('parse key with space', qs.parse('a%20b=c'), { 'a b': 'c' });
    t('parse key with special chars', qs.parse('a%21%40=b'), { 'a!@': 'b' });
    t('parse unicode key', qs.parse('%E4%B8%AD%E6%96%87=value'), { '中文': 'value' });
    t('parse numeric key', qs.parse('123=value'), { '123': 'value' });
    t('parse key starting with bracket', qs.parse('[key]=value'), { key: 'value' });
    t('parse key ending with bracket', qs.parse('key]=value'), { 'key]': 'value' });
    t('parse only brackets', qs.parse('[]=value'), { '0': 'value' });

    // 真实场景
    console.log('\n真实场景模拟:');
    t('parse typical URL query', 
      qs.parse('search=test&page=1&limit=10&sort=desc'), 
      { search: 'test', page: '1', limit: '10', sort: 'desc' });
    t('parse filter query', 
      qs.parse('filter[status]=active&filter[type]=user'), 
      { filter: { status: 'active', type: 'user' } });
    t('parse pagination query', 
      qs.parse('page[number]=1&page[size]=20'), 
      { page: { number: '1', size: '20' } });
    t('parse sort query', 
      qs.parse('sort[]=name&sort[]=-created'), 
      { sort: ['name', '-created'] });

    // 非字符串输入
    console.log('\n非字符串输入:');
    let nullInputResult = '';
    try {
      nullInputResult = qs.parse(null);
    } catch (e) {
      nullInputResult = 'error';
    }
    tCondition('parse null input', typeof nullInputResult === 'object' || nullInputResult === 'error');

    let undefinedInputResult = '';
    try {
      undefinedInputResult = qs.parse(undefined);
    } catch (e) {
      undefinedInputResult = 'error';
    }
    tCondition('parse undefined input', 
      typeof undefinedInputResult === 'object' || undefinedInputResult === 'error');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次5测试汇总:', JSON.stringify(summary, null, 2));
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

