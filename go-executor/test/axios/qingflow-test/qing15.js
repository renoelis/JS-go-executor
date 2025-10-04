const axios = require('axios');

const headers = {   
  'accessToken': '4f8a10*****54fbab',
  'Content-Type': 'application/json'
};

const apiUrl1 = 'https://ql.966599.com/openApi/app/910ba12d/apply/filter';
const pageSize = 200;

const queriesApi1 = [
  { "queId": 60687736, "scope": 2 },
  { "queId": 60687737, "scope": 2 }
]; // API1的查询条件：筛选经纬度不为空的数据

// ==================== 单页处理 ====================
function processPage(apiUrl, pageNum, queries) {
  const postData = {
    pageSize: pageSize.toString(), 
    pageNum: pageNum.toString(),
    queries: queries
  };

  return axios.post(apiUrl, postData, { headers })
    .then(response => response.data.result)
    .catch(() => ({ result: [], pageAmount: 0 }));
}

// ==================== 多页处理 ====================
function processAllPages(apiUrl, queries, extractQueIds) {
  return processPage(apiUrl, 1, queries).then(firstPageData => {
    let totalPages = firstPageData.pageAmount || 1;
    const promises = [];

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      promises.push(processPage(apiUrl, pageNum, queries));
    }

    return Promise.all(promises).then(responses => {
      const reslist = extractData(firstPageData, extractQueIds);

      responses.forEach(data => {
        const extractedData = extractData(data, extractQueIds);
        reslist.push(...extractedData);
      });

      return reslist;
    });
  });
}

// ==================== 数据提取 ====================
function extractData(response, queIds) {
  if (!response || !response.result) {
    return [];
  }

  const result = response.result;
  const res_list = [];

  result.forEach(value => {
    const res_msg = {};
    res_msg["applyId"] = value.applyId; // 存入 applyId

    value.answers.forEach(v => {
      const queId = v.queId;
      const queTitle = v.queTitle;

      if (queIds.includes(queId)) {
        const values = v.values;
        if (Array.isArray(values) && values.length > 0 && values[0].hasOwnProperty('dataValue')) {
          res_msg[queTitle] = values[0].dataValue;
        } else {
          res_msg[queTitle] = null;
        }
      }
    });

    res_list.push(res_msg);
  });

  return res_list;
}

// ==================== 主执行流程 ====================
function main() {
  const extractQueIdsApi1 = [60412694, 60687736, 60687737]; 

  return processAllPages(apiUrl1, queriesApi1, extractQueIdsApi1)
    .then(reslist1 => {
      return { reslist1 };
    })
    .catch(() => {
      return { error: '请求发生错误' };
    });
}

return main();
