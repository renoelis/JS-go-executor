const axios = require('axios');

const headers = {   
  'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl = 'https://api.qingflow.com/app/6kechv9d8801/apply/filter';
const pageSize = 200;

// queId 和字段名的映射
const queIdTitleMap = {
  '230540649': '单行文字',
  '230540650': '单行w',
  '230540651': '单行文字1'
  // 需要可继续添加
};

// ==================== 单页处理 ====================
function processPage(pageNum) {
  const postData = { pageSize, pageNum };
  return axios.post(apiUrl, postData, { headers })
    .then(response => response.data.result)
    .catch(() => ({ result: [], pageAmount: 0 }));
}

// ==================== 多页处理 ====================
function processAllPages() {
  return processPage(1).then(firstPageData => {
    let totalPages = firstPageData.pageAmount || 1;
    const promises = [];

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      promises.push(processPage(pageNum));
    }

    return Promise.all(promises).then(responses => {
      const reslist = extractData(firstPageData);
      responses.forEach(data => {
        const extractedData = extractData(data);
        reslist.push(...extractedData);
      });
      return reslist;
    });
  });
}

// ==================== 数据提取 ====================
function extractData(response) {
  const result = response.result || [];
  const res_list = [];

  result.forEach(value => {
    // 初始化字段，默认值为 null
    const res_msg = Object.keys(queIdTitleMap).reduce((acc, id) => {
      acc[queIdTitleMap[id]] = null;
      return acc;
    }, {});

    (value.answers || []).forEach(v => {
      const queId = v.queId.toString();
      if (queId in queIdTitleMap) {
        const values = v.values || [];
        const dataValue = values.length > 0 ? values[0].dataValue : null;
        res_msg[queIdTitleMap[queId]] = dataValue;
      }
    });

    res_list.push(res_msg);
  });

  return res_list;
}

// ==================== 主执行流程 ====================
function main() {
  return processAllPages()
    .then(reslist => {
      return { reslist };
    })
    .catch(() => {
      return { error: '请求发生错误' };
    });
}

return main();
