const axios = require('axios');

const headers = {   
  'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl = 'https://api.qingflow.com/app/5pr6kokd3c02/apply/filter';
const pageSize = 200;

// ==================== 单页请求 ====================
function processPage(pageNum) {
  const postData = { pageSize, pageNum };
  return axios.post(apiUrl, postData, { headers })
    .then(response => response.data.result)
    .catch(() => ({ result: [], pageAmount: 0 }));
}

// ==================== 多页处理 ====================
function processAllPages() {
  return processPage(1).then(firstPageData => {
    let totalPages = firstPageData.pageAmount;
    const promises = [];

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      promises.push(processPage(pageNum));
    }

    return Promise.all(promises).then(responses => {
      const reslist = extractData(firstPageData, [1, 2]);

      responses.forEach(data => {
        const extractedData = extractData(data, [1, 2]);
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
  return processAllPages()
    .then(reslist => {
      return { reslist };
    })
    .catch(() => {
      return { error: '请求发生错误' };
    });
}

return main();
