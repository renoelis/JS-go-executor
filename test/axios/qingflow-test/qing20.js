const axios = require('axios');

const headers = {   
    'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
    'Content-Type': 'application/json'
};

const apiUrl1 = 'https://api.qingflow.com/app/6kechv9d8801/apply/filter';
const pageSize = 200;

const queriesApi1 = [
    { "queId": 60687736, "scope": 2 },
    { "queId": 60687737, "scope": 2 }
]; // API1的查询条件：筛选经纬度不为空的数据

// queId 与 queTitle 的映射
const queIdTitleMapApi1 = {
    '230540649': '单行文字',
    '230540650': '单行w',
    '230540651': '单行文字1'
};

// =============== 单页处理 ===============
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

// =============== 多页处理 ===============
function processAllPages(apiUrl, queries, queIdTitleMap) {
    return processPage(apiUrl, 1, queries).then(firstPageData => {
        let totalPages = firstPageData.pageAmount || 1;
        const promises = [];

        for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
            promises.push(processPage(apiUrl, pageNum, queries));
        }

        return Promise.all(promises).then(responses => {
            const reslist = extractData(firstPageData, queIdTitleMap);
            responses.forEach(data => {
                const extractedData = extractData(data, queIdTitleMap);
                reslist.push(...extractedData);
            });
            return reslist;
        });
    });
}

// =============== 数据提取 ===============
function extractData(response, queIdTitleMap) {
    const result = response.result || [];
    const res_list = [];

    result.forEach(value => {
        // 预设字段为 null
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

// =============== 主执行流程 ===============
function main() {
    return processAllPages(apiUrl1, queriesApi1, queIdTitleMapApi1)
        .then(reslist1 => {
            return { reslist1 };
        })
        .catch(() => {
            return { error: '请求发生错误' };
        });
}

return main();
