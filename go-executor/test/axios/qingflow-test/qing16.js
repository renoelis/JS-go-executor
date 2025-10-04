const axios = require('axios');

const headers = {   
  'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl1 = 'https://api.qingflow.com/app/5t9168bii002/apply/filter';
const apiUrl2 = 'https://api.qingflow.com/app/5t91ta4e8s01/apply/filter'; // 第二个API
const pageSize = 200;

// ==================== 单页处理 ====================
function processPage(apiUrl, pageNum) {
  const postData = { pageSize, pageNum };
  return axios.post(apiUrl, postData, { headers })
    .then(response => response.data.result)
    .catch(() => ({ result: [], pageAmount: 0 }));
}

// ==================== 多页处理 ====================
function processAllPages(apiUrl, queIds) {
  return processPage(apiUrl, 1).then(firstPageData => {
    let totalPages = firstPageData.pageAmount || 1;
    const promises = [];

    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      promises.push(processPage(apiUrl, pageNum));
    }

    return Promise.all(promises).then(responses => {
      const reslist = extractData(firstPageData, queIds);

      responses.forEach(data => {
        const extractedData = extractData(data, queIds);
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
  const queIdsApi1 = [1, 2]; 
  const queIdsApi2 = [1, 2]; 

  return Promise.all([
    processAllPages(apiUrl1, queIdsApi1),
    processAllPages(apiUrl2, queIdsApi2)
  ])
  .then(([reslist1, reslist2]) => {
    const combinedResList = reslist1.concat(reslist2);
    return { combinedResList };
  })
  .catch(() => {
    return { error: '请求发生错误' };
  });
}

return main();
