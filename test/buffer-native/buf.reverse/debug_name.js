const { Buffer } = require('buffer');

const name = Buffer.prototype.reverse.name;
const length = Buffer.prototype.reverse.length;

const result = {
  success: true,
  data: {
    name: name,
    nameType: typeof name,
    length: length,
    lengthType: typeof length
  }
};

console.log(JSON.stringify(result, null, 2));
return result;
