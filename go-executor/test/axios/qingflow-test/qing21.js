const axios = require('axios');

const headers = {
    'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
    'Content-Type': 'application/json'
};

const apiUrl1 = 'https://api.qingflow.com/app/6i0q6tsg7802/apply/filter';
const pageSize = 200;
const lybh = "T001";

// 接口的筛选条件
const queriesApi1 = [
    {
        "queId": 226449326,
        "searchKey": lybh
    }
]; 

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
function processAllPages(apiUrl, queries, tableId, rowIds) {
    return processPage(apiUrl, 1, queries).then(firstPageData => {
        let totalPages = firstPageData.pageAmount || 1;
        const promises = [];

        for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
            promises.push(processPage(apiUrl, pageNum, queries));
        }

        return Promise.all(promises).then(responses => {
            const reslist = extractTableValues(firstPageData, tableId, rowIds);
            responses.forEach(data => {
                const extractedData = extractTableValues(data, tableId, rowIds);
                reslist.push(...extractedData);
            });
            return reslist;
        });
    });
}

// ==================== 处理表格字段 ====================
function extractTableValues(obj, tableId, rowIds) {
    const result = [];

    (obj.result || []).forEach(element => {
        // 查找是否存在 tableId 对应的表格
        const tableAnswer = (element.answers || []).find(answer => answer.queId === tableId);
        
        if (!tableAnswer || !tableAnswer.tableValues) {
            return; // 没找到表格就跳过
        }

        tableAnswer.tableValues.forEach(row => {
            const rowObject = {};
            row.forEach(cell => {
                if (rowIds.includes(cell.queId) && cell.values.length > 0) {
                    rowObject[cell.queTitle] = cell.values[0].value;
                }
            });
            result.push(rowObject);
        });
    });

    return result;
}

// ==================== 主执行流程 ====================
function main() {
    const tableId = 226449327;
    const rowIdsApi1 = [226449328, 226449329];

    if (lybh == null) {
        return Promise.resolve({ reslist1: null });
    } else {
        return processAllPages(apiUrl1, queriesApi1, tableId, rowIdsApi1)
            .then(reslist1 => {
                return { reslist1 };
            })
            .catch(() => {
                return { error: '请求发生错误' };
            });
    }
}

return main();
