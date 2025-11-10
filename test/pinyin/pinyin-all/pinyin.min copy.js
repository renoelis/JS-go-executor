(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.pinyin = {}));
})(this, (function (exports) { 'use strict';
//字段和词组这边先注释掉
  const dict = {};


const phrases_dict = {}

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    }

    return _assertThisInitialized(self);
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  /**
   * 单词类型
   */
  var POSTAG = {
    D_A: 0x40000000,
    // 形容词 形语素
    D_B: 0x20000000,
    // 区别词 区别语素
    D_C: 0x10000000,
    // 连词 连语素
    D_D: 0x08000000,
    // 副词 副语素
    D_E: 0x04000000,
    // 叹词 叹语素
    D_F: 0x02000000,
    // 方位词 方位语素
    D_I: 0x01000000,
    // 成语
    D_L: 0x00800000,
    // 习语
    A_M: 0x00400000,
    // 数词 数语素
    D_MQ: 0x00200000,
    // 数量词
    D_N: 0x00100000,
    // 名词 名语素
    D_O: 0x00080000,
    // 拟声词
    D_P: 0x00040000,
    // 介词
    A_Q: 0x00020000,
    // 量词 量语素
    D_R: 0x00010000,
    // 代词 代语素
    D_S: 0x00008000,
    // 处所词
    D_T: 0x00004000,
    // 时间词
    D_U: 0x00002000,
    // 助词 助语素
    D_V: 0x00001000,
    // 动词 动语素
    D_W: 0x00000800,
    // 标点符号
    D_X: 0x00000400,
    // 非语素字
    D_Y: 0x00000200,
    // 语气词 语气语素
    D_Z: 0x00000100,
    // 状态词
    A_NR: 0x00000080,
    // 人名
    A_NS: 0x00000040,
    // 地名
    A_NT: 0x00000020,
    // 机构团体
    A_NX: 0x00000010,
    // 外文字符
    A_NZ: 0x00000008,
    // 其他专名
    D_ZH: 0x00000004,
    // 前接成分
    D_K: 0x00000002,
    // 后接成分
    UNK: 0x00000000,
    // 未知词性
    URL: 0x00000001 // 网址、邮箱地址

  };

  var Tokenizer =
  /*#__PURE__*/
  function () {
    /**
     * 分词模块管理器
     *
     * @param {Segment} 分词接口
     */
    function Tokenizer(segment) {
      _classCallCheck(this, Tokenizer);

      this.segment = segment;
    }
    /**
     * 对一段文本进行分词
     *
     * @param {string} text 文本
     * @param {array} modules 分词模块数组
     * @return {array}
     */


    _createClass(Tokenizer, [{
      key: "split",
      value: function split(text, modules) {
        if (modules.length < 1) {
          throw Error('No tokenizer module!');
        } // 按顺序分别调用各个module来进行分词 ： 各个module仅对没有识别类型的单词进行分词


        var result = [{
          w: text
        }];
        modules.forEach(function (module) {
          result = module.split(result);
        });
        return result;
      }
    }]);

    return Tokenizer;
  }();

  var Optimizer =
  /*#__PURE__*/
  function () {
    /**
     * 优化模块管理器
     *
     * @param {Segment} 分词接口
     */
    function Optimizer(segment) {
      _classCallCheck(this, Optimizer);

      this.segment = segment;
    }
    /**
     * 分词一段文本
     *
     * @param {array} words 单词数组
     * @param {array} modules 分词模块数组
     * @return {array}
     */


    _createClass(Optimizer, [{
      key: "doOptimize",
      value: function doOptimize(words, modules) {
        var result = _toConsumableArray(words); // 按顺序分别调用各个module来进行分词，各个module仅对没有识别类型的单词进行分词


        modules.forEach(function (module) {
          result = module.doOptimize(result);
        });
        return result;
      }
    }]);

    return Optimizer;
  }();

  /**
   * 创建分词器接口
   */

  var Segment =
  /*#__PURE__*/
  function () {
    function Segment() {
      var _this = this;

      _classCallCheck(this, Segment);

      _defineProperty(this, "use", function (Module) {
        // 传入列表的话就递归调用
        if (Array.isArray(Module)) {
          Module.forEach(_this.use);
        } else {
          // 初始化并注册模块
          if (typeof Module.init === 'function') {
            Module.init(_this);

            _this.modules[Module.type].push(Module);
          } else {
            var module = new Module(_this);

            _this.modules[module.type].push(module);
          }
        }

        return _this;
      });

      _defineProperty(this, "loadDict", function (dict) {
        var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'TABLE';
        var convertToLower = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        if (Array.isArray(dict)) {
          dict.forEach(function (d) {
            return _this.loadDict(d);
          });
        } else {
          // 初始化词典
          if (!_this.DICT[type]) _this.DICT[type] = {};
          if (!_this.DICT["".concat(type, "2")]) _this.DICT["".concat(type, "2")] = {};
          var TABLE = _this.DICT[type]; // 词典表  '词' => {属性}

          var TABLE2 = _this.DICT["".concat(type, "2")]; // 词典表  '长度' => '词' => 属性
          // 导入数据


          dict.split(/\r?\n/).map(function (line) {
            if (convertToLower) return line.toLowerCase();
            return line;
          }).forEach(function (line) {
            var blocks = line.split('|');

            if (blocks.length > 2) {
              var w = blocks[0].trim();
              var p = Number(blocks[1]);
              var f = Number(blocks[2]); // 一定要检查单词是否为空，如果为空会导致Bug

              if (w.length > 0) {
                TABLE[w] = {
                  f: f,
                  p: p
                };
                if (!TABLE2[w.length]) TABLE2[w.length] = {};
                TABLE2[w.length][w] = TABLE[w];
              }
            }
          });
        }

        return _this;
      });

      _defineProperty(this, "getDict", function (type) {
        return _this.DICT[type];
      });

      _defineProperty(this, "loadSynonymDict", function (dict) {
        if (Array.isArray(dict)) {
          dict.forEach(function (d) {
            return _this.loadSynonymDict(d);
          });
        } else {
          var type = 'SYNONYM'; // 初始化词典

          if (!_this.DICT[type]) _this.DICT[type] = {};
          var TABLE = _this.DICT[type]; // 词典表  '同义词' => '标准词'
          // 导入数据

          dict.split(/\r?\n/).map(function (line) {
            return line.split(',');
          }).forEach(function (blocks) {
            if (blocks.length > 1) {
              var n1 = blocks[0].trim();
              var n2 = blocks[1].trim();
              TABLE[n1] = n2;

              if (TABLE[n2] === n1) {
                delete TABLE[n2];
              }
            }
          });
        }

        return _this;
      });

      _defineProperty(this, "loadStopwordDict", function (dict) {
        if (Array.isArray(dict)) {
          dict.forEach(function (d) {
            return _this.loadStopwordDict(d);
          });
        } else {
          var type = 'STOPWORD'; // 初始化词典

          if (!_this.DICT[type]) _this.DICT[type] = {};
          var TABLE = _this.DICT[type]; // 词典表  '同义词' => '标准词'
          // 导入数据

          dict.split(/\r?\n/).map(function (line) {
            return line.trim();
          }).forEach(function (line) {
            if (line) {
              TABLE[line] = true;
            }
          });
        }

        return _this;
      });

      _defineProperty(this, "doSegment", function (text, options) {
        var me = _this;
        options = options || {};
        var ret = []; // 将文本按照换行符分割成多段，并逐一分词

        text.replace(/\r/g, '\n') // 用换行符和空格把长文本切小，以减小传入中间件的数组长度
        .split(/\n+/).forEach(function (section) {
          var section = section.trim();
          if (section.length < 1) return; // ======================================
          // 分词

          var sret = me.tokenizer.split(section, me.modules.tokenizer); // 优化

          sret = me.optimizer.doOptimize(sret, me.modules.optimizer); // ======================================
          // 连接分词结果

          if (sret.length > 0) ret = ret.concat(sret);
        }); // 去除标点符号

        if (options.stripPunctuation) {
          ret = ret.filter(function (item) {
            return item.p !== POSTAG.D_W;
          });
        } // 转换同义词


        function convertSynonym(list) {
          var count = 0;
          var TABLE = me.getDict('SYNONYM');
          list = list.map(function (item) {
            if (item.w in TABLE) {
              count++;
              return {
                w: TABLE[item.w],
                p: item.p
              };
            }

            return item;
          });
          return {
            count: count,
            list: list
          };
        }

        if (options.convertSynonym) {
          do {
            var result = convertSynonym(ret);
            ret = result.list;
          } while (result.count > 0);
        } // 去除停止符


        if (options.stripStopword) {
          var STOPWORD = me.getDict('STOPWORD');
          ret = ret.filter(function (item) {
            return !(item.w in STOPWORD);
          });
        } // 仅返回单词内容


        if (options.simple) {
          ret = ret.map(function (item) {
            return item.w;
          });
        }

        return ret;
      });

      this.POSTAG = POSTAG; // 词性

      this.DICT = {}; // 词典表

      this.modules = {
        tokenizer: [],
        // 分词模块
        optimizer: [] // 优化模块

      };
      this.tokenizer = new Tokenizer(this);
      this.optimizer = new Optimizer(this);
    }
    /**
     * 载入分词模块
     *
     * @param {String|Array|Object} module 模块名称(数组)或模块对象
     * @return {Segment}
     */


    _createClass(Segment, [{
      key: "toString",

      /**
       * 将单词数组连接成字符串
       *
       * @param {Array} words 单词数组
       * @return {String}
       */
      value: function toString(words) {
        return words.map(function (item) {
          return item.w;
        }).join('');
      }
      /**
       * 根据某个单词或词性来分割单词数组
       *
       * @param {Array} words 单词数组
       * @param {Number|String} s 用于分割的单词或词性
       * @return {Array}
       */

    }, {
      key: "split",
      value: function split(words, s) {
        var ret = [];
        var lasti = 0;
        var i = 0;
        var f = typeof s === 'string' ? 'w' : 'p';

        while (i < words.length) {
          if (words[i][f] === s) {
            if (lasti < i) ret.push(words.slice(lasti, i));
            ret.push(words.slice(i, i + 1));
            i++;
            lasti = i;
          } else {
            i++;
          }
        }

        if (lasti < words.length - 1) {
          ret.push(words.slice(lasti, words.length));
        }

        return ret;
      }
      /**
       * 在单词数组中查找某一个单词或词性所在的位置
       *
       * @param {Array} words 单词数组
       * @param {Number|String} s 要查找的单词或词性
       * @param {Number} cur 开始位置
       * @return {Number} 找不到，返回-1
       */

    }, {
      key: "indexOf",
      value: function indexOf(words, s, cur) {
        cur = isNaN(cur) ? 0 : cur;
        var f = typeof s === 'string' ? 'w' : 'p';

        while (cur < words.length) {
          if (words[cur][f] === s) return cur;
          cur++;
        }

        return -1;
      }
    }]);

    return Segment;
  }();

  var Module = function Module(segment) {
    _classCallCheck(this, Module);

    _defineProperty(this, "type", void 0);

    this.segment = segment;
  };
  var Tokenizer$1 =
  /*#__PURE__*/
  function (_Module) {
    _inherits(Tokenizer, _Module);

    function Tokenizer() {
      var _getPrototypeOf2;

      var _this;

      _classCallCheck(this, Tokenizer);

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      _this = _possibleConstructorReturn(this, (_getPrototypeOf2 = _getPrototypeOf(Tokenizer)).call.apply(_getPrototypeOf2, [this].concat(args)));

      _defineProperty(_assertThisInitialized(_this), "type", 'tokenizer');

      return _this;
    }

    return Tokenizer;
  }(Module);
  var Optimizer$1 =
  /*#__PURE__*/
  function (_Module2) {
    _inherits(Optimizer, _Module2);

    function Optimizer() {
      var _getPrototypeOf3;

      var _this2;

      _classCallCheck(this, Optimizer);

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      _this2 = _possibleConstructorReturn(this, (_getPrototypeOf3 = _getPrototypeOf(Optimizer)).call.apply(_getPrototypeOf3, [this].concat(args)));

      _defineProperty(_assertThisInitialized(_this2), "type", 'optimizer');

      return _this2;
    }

    return Optimizer;
  }(Module);

  var COLOR_WITH_RGB = [];/*这里COLOR_WITH_RGB的颜色也已提取至字典中 */
  var colors = ['赤', '朱', '丹', '绯', '彤', '绛', '茜', '纁', '赭', '栗', '褐', '驼', '赭', '橘', '曙', '翠', '碧', '金', '米', '缃', '靛', '紫', '藕', '桃', '青', '玄', '皂', '乌', '墨', '黛', '黝', '素', '杏', '缟', '鹤', '皓', '苍', '华', '银'].concat(_toConsumableArray(COLOR_WITH_RGB.map(function (item) {
    return item[0];
  })));

  var AdjectiveOptimizer =
  /*#__PURE__*/
  function (_Optimizer) {
    _inherits(AdjectiveOptimizer, _Optimizer);

    function AdjectiveOptimizer() {
      _classCallCheck(this, AdjectiveOptimizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(AdjectiveOptimizer).apply(this, arguments));
    }

    _createClass(AdjectiveOptimizer, [{
      key: "doOptimize",
      value: function doOptimize(words) {
        var POSTAG = this.segment.POSTAG;
        var index = 0;

        while (index < words.length) {
          var word = words[index];
          var nextword = words[index + 1];

          if (nextword) {
            // 对于<颜色>+<的>，直接判断颜色是形容词（字典里颜色都是名词）
            if (nextword.p === POSTAG.D_U && colors.includes(word.w)) {
              word.p = POSTAG.D_A;
            } // 如果是连续的两个名词，前一个是颜色，那这个颜色也是形容词


            if (word.p === POSTAG.D_N && this.isNominal(nextword.p) && colors.includes(word.w)) {
              word.p = POSTAG.D_A;
            }
          } // 移到下一个单词


          index += 1;
        }

        return words;
      }
    }, {
      key: "isNominal",
      value: function isNominal(pos) {
        if (Array.isArray(pos)) {
          return this.isNominal(pos[0]);
        }

        var POSTAG = this.segment.POSTAG;
        return pos === POSTAG.D_N || pos === POSTAG.A_NT || pos === POSTAG.A_NX || pos === POSTAG.A_NZ || pos === POSTAG.A_NR || pos === POSTAG.A_NS || pos === POSTAG.URL;
      }
    }]);

    return AdjectiveOptimizer;
  }(Optimizer$1);

  /**
   * 中文姓
   */
  function addOrderInfo(chars, order) {
    var result = {};
    chars.forEach(function (char) {
      result[char] = order;
    });
    return result;
  } // 单姓

/*这里的姓式都已提取到字典中 */
  var FAMILY_NAME_1 = addOrderInfo([// 有明显歧义的姓氏
  '王', '张', '黄', '周', '徐', '胡', '高', '林', '马', '于', '程', '傅', '曾', '叶', '余', '夏', '钟', '田', '任', '方', '石', '熊', '白', '毛', '江', '史', '候', '龙', '万', '段', '雷', '钱', '汤', '易', '常', '武', '赖', '文', '查', // 没有明显歧义的姓氏
  '赵', '肖', '孙', '李', '吴', '郑', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许', '何', '吕', '施', '桓', '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '戚', '谢', '邹', '喻', '柏', '窦', '苏', '潘', '葛', '奚', '范', '彭', '鲁', '韦', '昌', '俞', '袁', '酆', '鲍', '唐', '费', '廉', '岑', '薛', '贺', '倪', '滕', '殷', '罗', '毕', '郝', '邬', '卞', '康', '卜', '顾', '孟', '穆', '萧', '尹', '姚', '邵', '湛', '汪', '祁', '禹', '狄', '贝', '臧', '伏', '戴', '宋', '茅', '庞', '纪', '舒', '屈', '祝', '董', '梁', '杜', '阮', '闵', '贾', '娄', '颜', '郭', '邱', '骆', '蔡', '樊', '凌', '霍', '虞', '柯', '昝', '卢', '柯', '缪', '宗', '丁', '贲', '邓', '郁', '杭', '洪', '崔', '龚', '嵇', '邢', '滑', '裴', '陆', '荣', '荀', '惠', '甄', '芮', '羿', '储', '靳', '汲', '邴', '糜', '隗', '侯', '宓', '蓬', '郗', '仲', '栾', '钭', '历', '戎', '刘', '詹', '幸', '韶', '郜', '黎', '蓟', '溥', '蒲', '邰', '鄂', '咸', '卓', '蔺', '屠', '乔', '郁', '胥', '苍', '莘', '翟', '谭', '贡', '劳', '冉', '郦', '雍', '璩', '桑', '桂', '濮', '扈', '冀', '浦', '庄', '晏', '瞿', '阎', '慕', '茹', '习', '宦', '艾', '容', '慎', '戈', '廖', '庾', '衡', '耿', '弘', '匡', '阙', '殳', '沃', '蔚', '夔', '隆', '巩', '聂', '晁', '敖', '融', '訾', '辛', '阚', '毋', '乜', '鞠', '丰', '蒯', '荆', '竺', '盍', '单', '欧'], 1); // 复姓

  var FAMILY_NAME_2 = addOrderInfo(['司马', '上官', '欧阳', '夏侯', '诸葛', '闻人', '东方', '赫连', '皇甫', '尉迟', '公羊', '澹台', '公冶', '宗政', '濮阳', '淳于', '单于', '太叔', '申屠', '公孙', '仲孙', '轩辕', '令狐', '徐离', '宇文', '长孙', '慕容', '司徒', '司空', '万俟'], 2); // 双字姓名第一个字

  var DOUBLE_NAME_1 = addOrderInfo(['阿', '建', '小', '晓', '文', '志', '国', '玉', '丽', '永', '海', '春', '金', '明', '新', '德', '秀', '红', '亚', '伟', '雪', '俊', '桂', '爱', '美', '世', '正', '庆', '学', '家', '立', '淑', '振', '云', '华', '光', '惠', '兴', '天', '长', '艳', '慧', '利', '宏', '佳', '瑞', '凤', '荣', '秋', '继', '嘉', '卫', '燕', '思', '维', '少', '福', '忠', '宝', '子', '成', '月', '洪', '东', '一', '泽', '林', '大', '素', '旭', '宇', '智', '锦', '冬', '玲', '雅', '伯', '翠', '传', '启', '剑', '安', '树', '良', '中', '梦', '广', '昌', '元', '万', '清', '静', '友', '宗', '兆', '丹', '克', '彩', '绍', '喜', '远', '朝', '敏', '培', '胜', '祖', '先', '菊', '士', '向', '有', '连', '军', '健', '巧', '耀', '莉', '英', '方', '和', '仁', '孝', '梅', '汉', '兰', '松', '水', '江', '益', '开', '景', '运', '贵', '祥', '青', '芳', '碧', '婷', '龙', '鹏', '自', '顺', '双', '书', '生', '义', '跃', '银', '佩', '雨', '保', '贤', '仲', '鸿', '浩', '加', '定', '炳', '飞', '锡', '柏', '发', '超', '道', '怀', '进', '其', '富', '平', '全', '阳', '吉', '茂', '彦', '诗', '洁', '润', '承', '治', '焕', '如', '君', '增', '善', '希', '根', '应', '勇', '宜', '守', '会', '凯', '育', '湘', '凌', '本', '敬', '博', '延', '乐', '三', '二', '四', '五', '六', '七', '八', '九', '十'], 1); // 双字姓名第二个字

  var DOUBLE_NAME_2 = addOrderInfo(['华', '平', '明', '英', '军', '林', '萍', '芳', '玲', '红', '生', '霞', '梅', '文', '荣', '珍', '兰', '娟', '峰', '琴', '云', '辉', '东', '龙', '敏', '伟', '强', '丽', '春', '杰', '燕', '民', '君', '波', '国', '芬', '清', '祥', '斌', '婷', '飞', '良', '忠', '新', '凤', '锋', '成', '勇', '刚', '玉', '元', '宇', '海', '兵', '安', '庆', '涛', '鹏', '亮', '青', '阳', '艳', '松', '江', '莲', '娜', '兴', '光', '德', '武', '香', '俊', '秀', '慧', '雄', '才', '宏', '群', '琼', '胜', '超', '彬', '莉', '中', '山', '富', '花', '宁', '利', '贵', '福', '发', '义', '蓉', '喜', '娥', '昌', '仁', '志', '全', '宝', '权', '美', '琳', '建', '金', '贤', '星', '丹', '根', '和', '珠', '康', '菊', '琪', '坤', '泉', '秋', '静', '佳', '顺', '源', '珊', '达', '欣', '如', '莹', '章', '浩', '勤', '芹', '容', '友', '芝', '豪', '洁', '鑫', '惠', '洪', '旺', '虎', '远', '妮', '森', '妹', '南', '雯', '奇', '健', '卿', '虹', '娇', '媛', '怡', '铭', '川', '进', '博', '智', '来', '琦', '学', '聪', '洋', '乐', '年', '翔', '然', '栋', '凯', '颖', '鸣', '丰', '瑞', '奎', '立', '堂', '威', '雪', '鸿', '晶', '桂', '凡', '娣', '先', '洲', '毅', '雅', '月', '旭', '田', '晖', '方', '恒', '亚', '泽', '风', '银', '高', '贞', '九', '薇'], 2); // 单字姓名

  var SINGLE_NAME = addOrderInfo(['家', '民', '敏', '伟', '勇', '军', '斌', '静', '丽', '涛', '芳', '杰', '萍', '强', '俊', '明', '燕', '磊', '玲', '华', '平', '鹏', '健', '波', '红', '丹', '辉', '超', '艳', '莉', '刚', '娟', '峰', '婷', '亮', '洁', '颖', '琳', '英', '慧', '飞', '霞', '浩', '凯', '宇', '毅', '林', '佳', '云', '莹', '娜', '晶', '洋', '文', '鑫', '欣', '琴', '宁', '琼', '兵', '青', '琦', '翔', '彬', '锋', '阳', '璐', '旭', '蕾', '剑', '虹', '蓉', '建', '倩', '梅', '宏', '威', '博', '君', '力', '龙', '晨', '薇', '雪', '琪', '欢', '荣', '江', '炜', '成', '庆', '冰', '东', '帆', '雷', '楠', '锐', '进', '海', '凡', '巍', '维', '迪', '媛', '玮', '杨', '群', '瑛', '悦', '春', '瑶', '婧', '兰', '茜', '松', '爽', '立', '瑜', '睿', '晖', '聪', '帅', '瑾', '骏', '雯', '晓', '昊', '勤', '新', '瑞', '岩', '星', '忠', '志', '怡', '坤', '康', '航', '利', '畅', '坚', '雄', '智', '萌', '哲', '岚', '洪', '捷', '珊', '恒', '靖', '清', '扬', '昕', '乐', '武', '玉', '诚', '菲', '锦', '凤', '珍', '晔', '妍', '璇', '胜', '菁', '科', '芬', '露', '越', '彤', '曦', '义', '良', '鸣', '芸', '方', '月', '铭', '光', '震', '冬', '源', '政', '虎', '莎', '彪', '蓓', '钢', '凌', '奇', '卫', '彦', '烨', '可', '黎', '川', '淼', '惠', '祥', '然', '三', '二', '一', '四', '五', '六', '七', '八', '九', '十'], 1);

  var ChsNameTokenizer =
  /*#__PURE__*/
  function (_Tokenizer) {
    _inherits(ChsNameTokenizer, _Tokenizer);

    function ChsNameTokenizer() {
      _classCallCheck(this, ChsNameTokenizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(ChsNameTokenizer).apply(this, arguments));
    }

    _createClass(ChsNameTokenizer, [{
      key: "split",
      value: function split(words) {
        var POSTAG = this.segment.POSTAG;
        var ret = [];

        for (var i = 0, word; word = words[i]; i++) {
          if (word.p > 0) {
            ret.push(word);
            continue;
          } // 仅对未识别的词进行匹配


          var nameinfo = ChsNameTokenizer.matchName(word.w);

          if (nameinfo.length < 1) {
            ret.push(word);
            continue;
          } // 分离出人名


          var lastc = 0;

          for (var ui = 0, url; url = nameinfo[ui]; ui++) {
            if (url.c > lastc) {
              ret.push({
                w: word.w.substr(lastc, url.c - lastc)
              });
            }

            ret.push({
              w: url.w,
              p: POSTAG.A_NR
            });
            lastc = url.c + url.w.length;
          }

          var lastn = nameinfo[nameinfo.length - 1];

          if (lastn.c + lastn.w.length < word.w.length) {
            ret.push({
              w: word.w.substr(lastn.c + lastn.w.length)
            });
          }
        }

        return ret;
      } // 匹配包含的人名，并返回相关信息

    }], [{
      key: "matchName",
      value: function matchName(text, startPos) {
        var startPosition = 0;
        if (!isNaN(startPos)) startPosition = startPos;
        var result = [];

        while (startPosition < text.length) {
          var name = false; // 取两个字，看看在不在复姓表里

          var f2 = text.substr(startPosition, 2);

          if (f2 in FAMILY_NAME_2) {
            var n1 = text.charAt(startPosition + 2);
            var n2 = text.charAt(startPosition + 3); // 看看姓后面的字在不在名表里

            if (n1 in DOUBLE_NAME_1 && n2 in DOUBLE_NAME_2) {
              name = f2 + n1 + n2;
            } else if (n1 in SINGLE_NAME) {
              name = f2 + n1 + (n1 === n2 ? n2 : '');
            }
          } // 单姓


          var f1 = text.charAt(startPosition);

          if (name === false && f1 in FAMILY_NAME_1) {
            var _n = text.charAt(startPosition + 1);

            var _n2 = text.charAt(startPosition + 2);

            if (_n in DOUBLE_NAME_1 && _n2 in DOUBLE_NAME_2) {
              name = f1 + _n + _n2;
            } else if (_n in SINGLE_NAME) {
              name = f1 + _n + (_n === _n2 ? _n2 : '');
            }
          } // 检查是否匹配成功


          if (name === false) {
            startPosition++;
          } else {
            result.push({
              w: name,
              c: startPosition
            });
            startPosition += name.length;
          }
        }

        return result;
      }
    }]);

    return ChsNameTokenizer;
  }(Tokenizer$1);

  var DictOptimizer =
  /*#__PURE__*/
  function (_Optimizer) {
    _inherits(DictOptimizer, _Optimizer);

    function DictOptimizer() {
      _classCallCheck(this, DictOptimizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(DictOptimizer).apply(this, arguments));
    }

    _createClass(DictOptimizer, [{
      key: "doOptimize",

      /**
       * 词典优化
       *
       * @param {array} words 单词数组
       * @param {bool} isNotFirst 是否为管理器调用的
       * @return {array}
       */
      value: function doOptimize(words, isNotFirst) {
        // debug(words);
        if (typeof isNotFirst === 'undefined') {
          isNotFirst = false;
        } // 合并相邻的能组成一个单词的两个词


        var TABLE = this.segment.getDict('TABLE');
        var POSTAG = this.segment.POSTAG;
        var i = 0;
        var ie = words.length - 1;

        while (i < ie) {
          var w1 = words[i];
          var w2 = words[i + 1]; // debug(w1.w + ', ' + w2.w);
          // ==========================================
          // 能组成一个新词的(词性必须相同)

          var nw = w1.w + w2.w;

          if (w1.p === w2.p && nw in TABLE) {
            words.splice(i, 2, {
              w: nw,
              p: TABLE[nw].p
            });
            ie--;
            continue;
          } // 形容词 + 助词 = 形容词，如： 不同 + 的 = 不同的


          if ((w1.p & POSTAG.D_A) > 0 && w2.p & POSTAG.D_U) {
            words.splice(i, 2, {
              w: nw,
              p: POSTAG.D_A
            });
            ie--;
            continue;
          } // ============================================
          // 数词组合


          if ((w1.p & POSTAG.A_M) > 0) {
            // debug(w2.w + ' ' + (w2.p & POSTAG.A_M));
            // 百分比数字 如 10%，或者下一个词也是数词，则合并
            if ((w2.p & POSTAG.A_M) > 0 || w2.w === '%') {
              words.splice(i, 2, {
                w: w1.w + w2.w,
                p: POSTAG.A_M
              });
              ie--;
              continue;
            } // 数词 + 量词，合并。如： 100个


            if ((w2.p & POSTAG.A_Q) > 0) {
              words.splice(i, 2, {
                w: w1.w + w2.w,
                p: POSTAG.D_MQ // 数量词

              });
              ie--;
              continue;
            } // 带小数点的数字 ，如 “3 . 14”，或者 “十五点三”
            // 数词 + "分之" + 数词，如“五十分之一”


            var w3 = words[i + 2];

            if (w3 && (w3.p & POSTAG.A_M) > 0 && (w2.w === '.' || w2.w === '点' || w2.w === '分之')) {
              words.splice(i, 3, {
                w: w1.w + w2.w + w3.w,
                p: POSTAG.A_M
              });
              ie -= 2;
              continue;
            }
          } // 修正 “十五点五八”问题


          if ((w1.p & POSTAG.D_MQ) > 0 && w1.w.substr(-1) === '点' && w2.p & POSTAG.A_M) {
            // debug(w1, w2);
            var i2 = 2;
            var w4w = '';

            for (var j = i + i2; j < ie; j++) {
              var w3 = words[j];

              if ((w3.p & POSTAG.A_M) > 0) {
                w4w += w3.w;
                i2++;
              } else {
                break;
              }
            }

            words.splice(i, i2, {
              w: w1.w + w2.w + w4w,
              p: POSTAG.D_MQ // 数量词

            });
            ie -= i2 - 1;
            continue;
          } // 移到下一个词


          i++;
        } // 针对组合数字后无法识别新组合的数字问题，需要重新扫描一次


        return isNotFirst === true ? words : this.doOptimize(words, true);
      }
    }]);

    return DictOptimizer;
  }(Optimizer$1);

  // 邮箱地址中允许出现的字符
  // 参考：http://www.cs.tut.fi/~jkorpela/rfc/822addr.html
  var _EMAILCHAR = '!"#$%&\'*+-/0123456789=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz{|}~.'.split('');

  var EMAILCHAR = {};

  for (var i in _EMAILCHAR) {
    EMAILCHAR[_EMAILCHAR[i]] = 1;
  }

  var EmailOptimizer =
  /*#__PURE__*/
  function (_Optimizer) {
    _inherits(EmailOptimizer, _Optimizer);

    function EmailOptimizer() {
      _classCallCheck(this, EmailOptimizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(EmailOptimizer).apply(this, arguments));
    }

    _createClass(EmailOptimizer, [{
      key: "doOptimize",
      value: function doOptimize(words) {
        var POSTAG = this.segment.POSTAG; // debug(words);

        var i = 0;
        var ie = words.length - 1;
        var addr_start = false;
        var has_at = false;

        while (i < ie) {
          var word = words[i];
          var is_ascii = !!(word.p === POSTAG.A_NX || word.p === POSTAG.A_M && word.w.charCodeAt(0) < 128); // 如果是外文字符或者数字，符合电子邮件地址开头的条件

          if (addr_start === false && is_ascii) {
            addr_start = i;
            i++;
            continue;
          } else {
            // 如果遇到@符号，符合第二个条件
            if (has_at === false && word.w === '@') {
              has_at = true;
              i++;
              continue;
            } // 如果已经遇到过@符号，且出现了其他字符，则截取邮箱地址


            if (has_at !== false && words[i - 1].w != '@' && is_ascii === false && !(word.w in EMAILCHAR)) {
              var mailws = words.slice(addr_start, i);
              words.splice(addr_start, mailws.length, {
                w: EmailOptimizer.toEmailAddress(mailws),
                p: POSTAG.URL
              });
              i = addr_start + 1;
              ie -= mailws.length - 1;
              addr_start = false;
              has_at = false;
              continue;
            } // 如果已经开头


            if (addr_start !== false && (is_ascii || word.w in EMAILCHAR)) {
              i++;
              continue;
            }
          } // 移到下一个词


          addr_start = false;
          has_at = false;
          i++;
        } // 检查剩余部分


        if (addr_start && has_at && words[ie]) {
          var word = words[ie];
          var is_ascii = !!(word.p === POSTAG.A_NX || word.p === POSTAG.A_M && word.w in EMAILCHAR);

          if (is_ascii) {
            var mailws = words.slice(addr_start, words.length);
            words.splice(addr_start, mailws.length, {
              w: EmailOptimizer.toEmailAddress(mailws),
              p: POSTAG.URL
            });
          }
        }

        return words;
      }
      /**
      * 根据一组单词生成邮箱地址
      *
      * @param {array} words 单词数组
      * @return {string}
      */

    }], [{
      key: "toEmailAddress",
      value: function toEmailAddress(words) {
        var ret = words[0].w;

        for (var i = 1, word; word = words[i]; i++) {
          ret += word.w;
        }

        return ret;
      }
    }]);

    return EmailOptimizer;
  }(Optimizer$1);

  // 标点符号
  var _STOPWORD = ' ,.;+-|/\\\'":?<>[]{}=!@#$%^&*()~`' + '。，、＇：∶；?‘’“”〝〞ˆˇ﹕︰﹔﹖﹑·¨….¸;！´？！～—ˉ｜‖＂〃｀@﹫¡¿﹏﹋﹌︴々﹟#﹩$﹠&﹪%*﹡﹢﹦' + '﹤‐￣¯―﹨ˆ˜﹍﹎+=<­＿_-ˇ~﹉﹊（）〈〉‹›﹛﹜『』〖〗［］《》〔〕{}「」【】︵︷︿︹︽_﹁﹃︻︶︸' + '﹀︺︾ˉ﹂﹄︼＋－×÷﹢﹣±／＝≈≡≠∧∨∑∏∪∩∈⊙⌒⊥∥∠∽≌＜＞≤≥≮≯∧∨√﹙﹚[]﹛﹜∫∮∝∞⊙∏' + '┌┬┐┏┳┓╒╤╕─│├┼┤┣╋┫╞╪╡━┃└┴┘┗┻┛╘╧╛┄┆┅┇╭─╮┏━┓╔╦╗┈┊│╳│┃┃╠╬╣┉┋╰─╯┗━┛' + '╚╩╝╲╱┞┟┠┡┢┦┧┨┩┪╉╊┭┮┯┰┱┲┵┶┷┸╇╈┹┺┽┾┿╀╁╂╃╄╅╆' + '○◇□△▽☆●◆■▲▼★♠♥♦♣☼☺◘♀√☻◙♂×▁▂▃▄▅▆▇█⊙◎۞卍卐╱╲▁▏↖↗↑←↔◤◥╲╱▔▕↙↘↓→↕◣◢∷▒░℡™';

  _STOPWORD = _STOPWORD.split('');
  var STOPWORD = {};
  var STOPWORD2 = {};

  for (var i$1 in _STOPWORD) {
    if (_STOPWORD[i$1] === '') continue;
    var len = _STOPWORD[i$1].length;
    STOPWORD[_STOPWORD[i$1]] = len;
    if (!STOPWORD2[len]) STOPWORD2[len] = {};
    STOPWORD2[len][_STOPWORD[i$1]] = len;
  }

  var PunctuationTokenizer =
  /*#__PURE__*/
  function (_Tokenizer) {
    _inherits(PunctuationTokenizer, _Tokenizer);

    function PunctuationTokenizer() {
      _classCallCheck(this, PunctuationTokenizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(PunctuationTokenizer).apply(this, arguments));
    }

    _createClass(PunctuationTokenizer, [{
      key: "split",
      value: function split(words) {
        var POSTAG = this.segment.POSTAG;
        var ret = [];

        for (var i = 0, word; word = words[i]; i++) {
          if (word.p > 0) {
            ret.push(word);
            continue;
          } // 仅对未识别的词进行匹配


          var stopinfo = PunctuationTokenizer.matchStopword(word.w);

          if (stopinfo.length < 1) {
            ret.push(word);
            continue;
          } // 分离出标点符号


          var lastc = 0;

          for (var ui = 0, sw; sw = stopinfo[ui]; ui++) {
            if (sw.c > lastc) {
              ret.push({
                w: word.w.substr(lastc, sw.c - lastc)
              });
            } // 忽略空格


            if (sw.w != ' ') {
              ret.push({
                w: sw.w,
                p: POSTAG.D_W
              });
            }

            lastc = sw.c + sw.w.length;
          }

          var lastsw = stopinfo[stopinfo.length - 1];

          if (lastsw.c + lastsw.w.length < word.w.length) {
            ret.push({
              w: word.w.substr(lastsw.c + lastsw.w.length)
            });
          }
        }

        return ret;
      }
      /**
       * 匹配包含的标点符号，返回相关信息
       *
       * @param {string} text 文本
       * @param {int} cur 开始位置
       * @return {array}  返回格式   {w: '网址', c: 开始位置}
       */

    }], [{
      key: "matchStopword",
      value: function matchStopword(text, cur) {
        if (isNaN(cur)) cur = 0;
        var ret = [];
        var isMatch = false;

        while (cur < text.length) {
          for (var _i in STOPWORD2) {
            var w = text.substr(cur, _i);

            if (w in STOPWORD2[_i]) {
              ret.push({
                w: w,
                c: cur
              });
              isMatch = true;
              break;
            }
          }

          cur += isMatch === false ? 1 : w.length;
          isMatch = false;
        }

        return ret;
      }
    }]);

    return PunctuationTokenizer;
  }(Tokenizer$1);

  // 协议URL头
  var PROTOTAL = ['http://', 'https://', 'ftp://', 'news://', 'telnet://']; // 协议头最小长度

  var MIN_PROTOTAL_LEN = 100;

  for (var i$2 in PROTOTAL) {
    if (PROTOTAL[i$2].length < MIN_PROTOTAL_LEN) {
      MIN_PROTOTAL_LEN = PROTOTAL[i$2].length;
    }
  } // 允许出现在URL中的字符


  var _URLCHAR = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '!', '#', '$', '%', '&', '‘', '(', ')', '*', '+', ',', '-', '.', '/', ':', ';', '=', '?', '@', '[', '\\', ']', '^', '_', '`', '|', '~'];
  var URLCHAR = {};

  for (var i$2 in _URLCHAR) {
    URLCHAR[_URLCHAR[i$2]] = 1;
  }

  var URLTokenizer =
  /*#__PURE__*/
  function (_Tokenizer) {
    _inherits(URLTokenizer, _Tokenizer);

    function URLTokenizer() {
      _classCallCheck(this, URLTokenizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(URLTokenizer).apply(this, arguments));
    }

    _createClass(URLTokenizer, [{
      key: "split",
      value: function split(words) {
        var POSTAG = this.segment.POSTAG;
        var ret = [];

        for (var i = 0, word; word = words[i]; i++) {
          if (word.p > 0) {
            ret.push(word);
            continue;
          } // 仅对未识别的词进行匹配


          var urlinfo = URLTokenizer.matchURL(word.w);

          if (urlinfo.length < 1) {
            ret.push(word);
            continue;
          } // 分离出URL


          var lastc = 0;

          for (var ui = 0, url; url = urlinfo[ui]; ui++) {
            if (url.c > lastc) {
              ret.push({
                w: word.w.substr(lastc, url.c - lastc)
              });
            }

            ret.push({
              w: url.w,
              p: POSTAG.URL
            });
            lastc = url.c + url.w.length;
          }

          var lasturl = urlinfo[urlinfo.length - 1];

          if (lasturl.c + lasturl.w.length < word.w.length) {
            ret.push({
              w: word.w.substr(lasturl.c + lasturl.w.length)
            });
          }
        } // debug(ret);


        return ret;
      }
      /**
       * 匹配包含的网址，返回相关信息
       *
       * @param {string} text 文本
       * @param {int} cur 开始位置
       * @return {array}  返回格式   {w: '网址', c: 开始位置}
       */

    }], [{
      key: "matchURL",
      value: function matchURL(text, cur) {
        if (isNaN(cur)) cur = 0;
        var ret = [];
        var s = false;

        while (cur < text.length) {
          // 判断是否为 http:// 之类的文本开头
          if (s === false && cur < text.length - MIN_PROTOTAL_LEN) {
            for (var i = 0, prot; prot = PROTOTAL[i]; i++) {
              if (text.substr(cur, prot.length) === prot) {
                s = cur;
                cur += prot.length - 1;
                break;
              }
            }
          } else if (s !== false && !(text.charAt(cur) in URLCHAR)) {
            // 如果以http://之类开头，遇到了非URL字符，则结束
            ret.push({
              w: text.substr(s, cur - s),
              c: s
            });
            s = false;
          }

          cur++;
        } // 检查剩余部分


        if (s !== false) {
          ret.push({
            w: text.substr(s, cur - s),
            c: s
          });
        }

        return ret;
      }
    }]);

    return URLTokenizer;
  }(Tokenizer$1);

  var ChsNameOptimizer =
  /*#__PURE__*/
  function (_Optimizer) {
    _inherits(ChsNameOptimizer, _Optimizer);

    function ChsNameOptimizer() {
      _classCallCheck(this, ChsNameOptimizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(ChsNameOptimizer).apply(this, arguments));
    }

    _createClass(ChsNameOptimizer, [{
      key: "doOptimize",
      value: function doOptimize(words) {
        var POSTAG = this.segment.POSTAG;
        var i = 0;
        /* 第一遍扫描 */

        while (i < words.length) {
          var word = words[i];
          var nextword = words[i + 1];

          if (nextword) {
            // debug(nextword);
            // 如果为  "小|老" + 姓
            if (nextword && (word.w === '小' || word.w === '老') && (nextword.w in FAMILY_NAME_1 || nextword.w in FAMILY_NAME_2)) {
              words.splice(i, 2, {
                w: word.w + nextword.w,
                p: POSTAG.A_NR
              });
              i++;
              continue;
            } // 如果是 姓 + 名（2字以内）


            if ((word.w in FAMILY_NAME_1 || word.w in FAMILY_NAME_2) && (nextword.p & POSTAG.A_NR) > 0 && nextword.w.length <= 2) {
              words.splice(i, 2, {
                w: word.w + nextword.w,
                p: POSTAG.A_NR
              });
              i++;
              continue;
            } // 如果相邻两个均为单字且至少有一个字是未识别的，则尝试判断其是否为人名


            if (!word.p || !nextword.p) {
              if (word.w in SINGLE_NAME && word.w === nextword.w || word.w in DOUBLE_NAME_1 && nextword.w in DOUBLE_NAME_2) {
                words.splice(i, 2, {
                  w: word.w + nextword.w,
                  p: POSTAG.A_NR
                }); // 如果上一个单词可能是一个姓，则合并

                var preword = words[i - 1];

                if (preword && (preword.w in FAMILY_NAME_1 || preword.w in FAMILY_NAME_2)) {
                  words.splice(i - 1, 2, {
                    w: preword.w + word.w + nextword.w,
                    p: POSTAG.A_NR
                  });
                } else {
                  i++;
                }

                continue;
              }
            } // 如果为 无歧义的姓 + 名（2字以内） 且其中一个未未识别词


            if ((word.w in FAMILY_NAME_1 || word.w in FAMILY_NAME_2) && (!word.p || !nextword.p)) {
              // debug(word, nextword);
              words.splice(i, 2, {
                w: word.w + nextword.w,
                p: POSTAG.A_NR
              });
            }
          } // 移到下一个单词


          i++;
        }
        /* 第二遍扫描 */


        i = 0;

        while (i < words.length) {
          var _word = words[i];
          var _nextword = words[i + 1];

          if (_nextword) {
            // 如果为 姓 + 单字名
            if ((_word.w in FAMILY_NAME_1 || _word.w in FAMILY_NAME_2) && _nextword.w in SINGLE_NAME) {
              words.splice(i, 2, {
                w: _word.w + _nextword.w,
                p: POSTAG.A_NR
              });
              i++;
              continue;
            }
          } // 移到下一个单词


          i++;
        }

        return words;
      }
    }]);

    return ChsNameOptimizer;
  }(Optimizer$1);

  // 日期时间常见组合
  var DATETIME_WORDS = ['世纪', '年', '年份', '年度', '月', '月份', '月度', '日', '号', '时', '点', '点钟', '分', '分钟', '秒', '毫秒'];
  var DATETIME = {}; // eslint-disable-next-line

  for (var i$3 in DATETIME_WORDS) {
    DATETIME[DATETIME_WORDS[i$3]] = DATETIME_WORDS[i$3].length;
  }

  var DatetimeOptimizer =
  /*#__PURE__*/
  function (_Optimizer) {
    _inherits(DatetimeOptimizer, _Optimizer);

    function DatetimeOptimizer() {
      _classCallCheck(this, DatetimeOptimizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(DatetimeOptimizer).apply(this, arguments));
    }

    _createClass(DatetimeOptimizer, [{
      key: "doOptimize",

      /**
       * 日期时间优化
       *
       * @param {array} words 单词数组
       * @param {bool} isNotFirst 是否为管理器调用的
       * @return {array}
       */
      value: function doOptimize(words, isNotFirst) {


        this.segment.getDict('TABLE');
        var POSTAG = this.segment.POSTAG;
        var i = 0;
        var ie = words.length - 1;

        while (i < ie) {
          var w1 = words[i];
          var w2 = words[i + 1]; // debug(w1.w + ', ' + w2.w);

          if ((w1.p & POSTAG.A_M) > 0) {
            // =========================================
            // 日期时间组合   数字 + 日期单位，如 “2005年"
            if (w2.w in DATETIME) {
              var nw = w1.w + w2.w;
              var len = 2; // 继续搜索后面连续的日期时间描述，必须符合  数字 + 日期单位

              while (true) {
                var w1 = words[i + len];
                var w2 = words[i + len + 1];

                if (w1 && w2 && (w1.p & POSTAG.A_M) > 0 && w2.w in DATETIME) {
                  len += 2;
                  nw += w1.w + w2.w;
                } else {
                  break;
                }
              }

              words.splice(i, len, {
                w: nw,
                p: POSTAG.D_T
              });
              ie -= len - 1;
              continue;
            } // =========================================

          } // 移到下一个词


          i++;
        }

        return words;
      }
    }]);

    return DatetimeOptimizer;
  }(Optimizer$1);

  // 日期时间常见组合
  var _DATETIME = ['世纪', '年', '年份', '年度', '月', '月份', '月度', '日', '号', '时', '点', '点钟', '分', '分钟', '秒', '毫秒'];
  var DATETIME$1 = {};

  for (var i$4 in _DATETIME) {
    DATETIME$1[_DATETIME[i$4]] = _DATETIME[i$4].length;
  }
  /**
   * 对未识别的单词进行分词
   *
   * @param {array} words 单词数组
   * @return {array}
   */


  var DictTokenizer =
  /*#__PURE__*/
  function (_Tokenizer) {
    _inherits(DictTokenizer, _Tokenizer);

    function DictTokenizer() {
      _classCallCheck(this, DictTokenizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(DictTokenizer).apply(this, arguments));
    }

    _createClass(DictTokenizer, [{
      key: "split",
      value: function split(words) {
        // debug(words);
        this.segment.POSTAG;
        var TABLE = this.segment.getDict('TABLE');
        var ret = [];

        for (var i = 0, word; word = words[i]; i++) {
          if (word.p > 0) {
            ret.push(word);
            continue;
          } // 仅对未识别的词进行匹配


          var wordinfo = this.matchWord(word.w, 0, words[i - 1]);

          if (wordinfo.length < 1) {
            ret.push(word);
            continue;
          } // 分离出已识别的单词


          var lastc = 0;

          for (var ui = 0, bw; bw = wordinfo[ui]; ui++) {
            if (bw.c > lastc) {
              ret.push({
                w: word.w.substr(lastc, bw.c - lastc)
              });
            }

            ret.push({
              w: bw.w,
              p: TABLE[bw.w].p
            });
            lastc = bw.c + bw.w.length;
          }

          var lastword = wordinfo[wordinfo.length - 1];

          if (lastword.c + lastword.w.length < word.w.length) {
            ret.push({
              w: word.w.substr(lastword.c + lastword.w.length)
            });
          }
        }

        return ret;
      }
      /**
       * 匹配单词，返回相关信息
       *
       * @param {string} text 文本
       * @param {int} cur 开始位置
       * @param {object} preword 上一个单词
       * @return {array}  返回格式   {w: '单词', c: 开始位置}
       */

    }, {
      key: "matchWord",
      value: function matchWord(text, cur, preword) {
        if (isNaN(cur)) cur = 0;
        var ret = [];
        var TABLE = this.segment.getDict('TABLE2'); // 匹配可能出现的单词

        while (cur < text.length) {
          for (var _i in TABLE) {
            var w = text.substr(cur, _i);

            if (w in TABLE[_i]) {
              ret.push({
                w: w,
                c: cur,
                f: TABLE[_i][w].f
              });
            }
          }

          cur++;
        }

        return this.filterWord(ret, preword, text);
      } // debug(matchWord('长春市长春药店'));

      /**
       * 选择最有可能匹配的单词
       *
       * @param {array} words 单词信息数组
       * @param {object} preword 上一个单词
       * @param {string} text 本节要分词的文本
       * @return {array}
       */

    }, {
      key: "filterWord",
      value: function filterWord(words, preword, text) {
        var POSTAG = this.segment.POSTAG;
        var TABLE = this.segment.getDict('TABLE');
        var ret = []; // 将单词按位置分组

        var wordpos = DictTokenizer.getPosInfo(words, text); // debug(wordpos);
        // 使用类似于MMSG的分词算法
        // 找出所有分词可能，主要根据一下几项来评价：
        // x、词数量最少；
        // a、词平均频率最大；
        // b、每个词长度标准差最小；
        // c、未识别词最少；
        // d、符合语法结构项：如两个连续的动词减分，数词后面跟量词加分；
        // 取以上几项综合排名最最好的

        var chunks = DictTokenizer.getChunks(wordpos, 0, text); // debug(chunks);

        var assess = []; // 评价表
        // 对各个分支就行评估

        for (var i = 0, chunk; chunk = chunks[i]; i++) {
          assess[i] = {
            x: chunk.length,
            a: 0,
            b: 0,
            c: 0,
            d: 0
          }; // 词平均长度

          var sp = text.length / chunk.length; // 句子经常包含的语法结构

          var has_D_V = false; // 是否包含动词
          // 遍历各个词

          if (preword) {
            var prew = {
              w: preword.w,
              p: preword.p,
              f: preword.f
            };
          } else {
            prew = false;
          }

          for (var j = 0, w; w = chunk[j]; j++) {
            if (w.w in TABLE) {
              w.p = TABLE[w.w].p;
              assess[i].a += w.f; // 总词频
              // ================ 检查语法结构 ===================

              if (prew) {
                // 如果上一个词是数词且当前词是量词（单位），则加分
                if ((prew.p & POSTAG.A_M) > 0 && ((TABLE[w.w].p & POSTAG.A_Q) > 0 || w.w in DATETIME$1)) {
                  assess[i].d++;
                } // 如果当前词是动词


                if ((w.p & POSTAG.D_V) > 0) {
                  has_D_V = true; // 如果是连续的两个动词，则减分
                  // if ((prew.p & POSTAG.D_V) > 0)
                  // assess[i].d--;
                  // 如果是 形容词 + 动词，则加分

                  if ((prew.p & POSTAG.D_A) > 0) {
                    assess[i].d++;
                  }
                } // 如果是地区名、机构名或形容词，后面跟地区、机构、代词、名词等，则加分


                if (((prew.p & POSTAG.A_NS) > 0 || prew.p & POSTAG.A_NT || (prew.p & POSTAG.D_A) > 0) && ((w.p & POSTAG.D_N) > 0 || (w.p & POSTAG.A_NR) > 0 || (w.p & POSTAG.A_NS) > 0 || (w.p & POSTAG.A_NZ) > 0 || (w.p & POSTAG.A_NT) > 0)) {
                  assess[i].d++;
                } // 如果是 方位词 + 数量词，则加分


                if ((prew.p & POSTAG.D_F) > 0 && (w.p & POSTAG.A_M > 0 || w.p & POSTAG.D_MQ > 0)) {
                  // debug(prew, w);
                  assess[i].d++;
                } // 如果是 姓 + 名词，则加分


                if ((prew.w in FAMILY_NAME_1 || prew.w in FAMILY_NAME_2) && ((w.p & POSTAG.D_N) > 0 || (w.p & POSTAG.A_NZ) > 0)) {
                  // debug(prew, w);
                  assess[i].d++;
                } // 探测下一个词


                var nextw = chunk[j + 1];

                if (nextw) {
                  if (nextw.w in TABLE) {
                    nextw.p = TABLE[nextw.w].p;
                  } // 如果是连词，前后两个词词性相同则加分


                  if ((w.p & POSTAG.D_C) > 0 && prew.p === nextw.p) {
                    assess[i].d++;
                  } // 如果当前是“的”+ 名词，则加分


                  if ((w.w === '的' || w.w === '之') && ((nextw.p & POSTAG.D_N) > 0 || (nextw.p & POSTAG.A_NR) > 0 || (nextw.p & POSTAG.A_NS) > 0 || (nextw.p & POSTAG.A_NZ) > 0 || (nextw.p & POSTAG.A_NT) > 0)) {
                    assess[i].d += 1.5;
                  }
                }
              } // ===========================================

            } else {
              assess[i].c++; // 未识别的词数量
            } // 标准差


            assess[i].b += Math.pow(sp - w.w.length, 2);
            prew = chunk[j];
          } // 如果句子中包含了至少一个动词


          if (has_D_V === false) assess[i].d -= 0.5;
          assess[i].a = assess[i].a / chunk.length;
          assess[i].b = assess[i].b / chunk.length;
        } // 计算排名


        var top = DictTokenizer.getTops(assess);
        var currchunk = chunks[top]; // 剔除不能识别的词

        for (var i = 0, word; word = currchunk[i]; i++) {
          if (!(word.w in TABLE)) {
            currchunk.splice(i--, 1);
          }
        }

        ret = currchunk; // debug(ret);

        return ret;
      }
      /* 将单词按照位置排列
        *
        * @param {array} words
        * @param {string} text
        * @return {object}
        */

    }], [{
      key: "getPosInfo",
      value: function getPosInfo(words, text) {
        var wordpos = {}; // 将单词按位置分组

        for (var i = 0, word; word = words[i]; i++) {
          if (!wordpos[word.c]) {
            wordpos[word.c] = [];
          }

          wordpos[word.c].push(word);
        } // 按单字分割文本，填补空缺的位置


        for (var i = 0; i < text.length; i++) {
          if (!wordpos[i]) {
            wordpos[i] = [{
              w: text.charAt(i),
              c: i,
              f: 0
            }];
          }
        }

        return wordpos;
      }
      /**
        * 取所有分支
        *
        * @param {object} wordpos
        * @param {int} pos 当前位置
        * @param {string} text 本节要分词的文本
        * @return {array}
        */

    }, {
      key: "getChunks",
      value: function getChunks(wordpos, pos, text) {
        var words = wordpos[pos] || [];
        var ret = [];

        for (var _i2 = 0; _i2 < words.length; _i2++) {
          var word = words[_i2]; // debug(word);

          var nextcur = word.c + word.w.length;

          if (!wordpos[nextcur]) {
            ret.push([word]);
          } else {
            var chunks = DictTokenizer.getChunks(wordpos, nextcur);

            for (var j = 0; j < chunks.length; j++) {
              ret.push([word].concat(chunks[j]));
            }
          }
        }

        return ret;
      }
      /**
        * 评价排名
        *
        * @param {object} assess
        * @return {object}
        */

    }, {
      key: "getTops",
      value: function getTops(assess) {
        // 取各项最大值
        var top = {
          x: assess[0].x,
          a: assess[0].a,
          b: assess[0].b,
          c: assess[0].c,
          d: assess[0].d
        };

        for (var i = 1, ass; ass = assess[i]; i++) {
          if (ass.a > top.a) top.a = ass.a; // 取最大平均词频

          if (ass.b < top.b) top.b = ass.b; // 取最小标准差

          if (ass.c > top.c) top.c = ass.c; // 取最大未识别词

          if (ass.d < top.d) top.d = ass.d; // 取最小语法分数

          if (ass.x > top.x) top.x = ass.x; // 取最大单词数量
        } // debug(top);
        // 评估排名


        var tops = [];

        for (var i = 0, ass; ass = assess[i]; i++) {
          tops[i] = 0; // 词数量，越小越好

          tops[i] += (top.x - ass.x) * 1.5; // 词总频率，越大越好

          if (ass.a >= top.a) tops[i] += 1; // 词标准差，越小越好

          if (ass.b <= top.b) tops[i] += 1; // 未识别词，越小越好

          tops[i] += top.c - ass.c; // debug(tops[i]);
          // 符合语法结构程度，越大越好

          tops[i] += (ass.d < 0 ? top.d + ass.d : ass.d - top.d) * 1; // debug(tops[i]);debug('---');
        } // debug(tops.join('  '));
        // 取分数最高的


        var curri = 0;
        var maxs = tops[0];

        for (var i in tops) {
          var s = tops[i];

          if (s > maxs) {
            curri = i;
            maxs = s;
          } else if (s === maxs) {
            // 如果分数相同，则根据词长度、未识别词个数和平均频率来选择
            var a = 0;
            var b = 0;
            if (assess[i].c < assess[curri].c) a++;else b++;
            if (assess[i].a > assess[curri].a) a++;else b++;
            if (assess[i].x < assess[curri].x) a++;else b++;

            if (a > b) {
              curri = i;
              maxs = s;
            }
          }
        }

        return curri;
      }
    }]);

    return DictTokenizer;
  }(Tokenizer$1);

  var ForeignTokenizer =
  /*#__PURE__*/
  function (_Tokenizer) {
    _inherits(ForeignTokenizer, _Tokenizer);

    function ForeignTokenizer() {
      _classCallCheck(this, ForeignTokenizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(ForeignTokenizer).apply(this, arguments));
    }

    _createClass(ForeignTokenizer, [{
      key: "split",
      value: function split(words) {
        this.segment.POSTAG;
        var ret = [];

        for (var i = 0, word; word = words[i]; i++) {
          if (word.p) {
            ret.push(word);
          } else {
            // 仅对未识别的词进行匹配
            ret = ret.concat(this.splitForeign(word.w));
          }
        }

        return ret;
      }
      /**
       * 匹配包含的英文字符和数字，并分割
       *
       * @param {string} text 文本
       * @param {int} cur 开始位置
       * @return {array}  返回格式   {w: '单词', c: 开始位置}
       */

    }, {
      key: "splitForeign",
      value: function splitForeign(text, cur) {
        var POSTAG = this.segment.POSTAG;
        var ret = []; // 取第一个字符的ASCII码

        var lastcur = 0;
        var lasttype = 0;
        var c = text.charCodeAt(0); // 全角数字或字母

        if (c >= 65296 && c <= 65370) c -= 65248; // 数字  lasttype = POSTAG.A_M

        if (c >= 48 && c <= 57) lasttype = POSTAG.A_M;else if (c >= 65 && c <= 90 || c >= 97 && c <= 122) {
          // 字母 lasttype = POSTAG.A_NX
          lasttype = POSTAG.A_NX;
        } else lasttype = POSTAG.UNK;

        for (var i = 1; i < text.length; i++) {
          var c = text.charCodeAt(i); // 全角数字或字母

          if (c >= 65296 && c <= 65370) c -= 65248; // 数字  lasttype = POSTAG.A_M

          if (c >= 48 && c <= 57) {
            if (lasttype !== POSTAG.A_M) {
              var nw = {
                w: text.substr(lastcur, i - lastcur)
              };
              if (lasttype !== POSTAG.UNK) nw.p = lasttype;
              ret.push(nw);
              lastcur = i;
            }

            lasttype = POSTAG.A_M;
          } else if (c >= 65 && c <= 90 || c >= 97 && c <= 122) {
            // 字母 lasttype = POSTAG.A_NX
            if (lasttype !== POSTAG.A_NX) {
              var nw = {
                w: text.substr(lastcur, i - lastcur)
              };
              if (lasttype !== POSTAG.UNK) nw.p = lasttype;
              ret.push(nw);
              lastcur = i;
            }

            lasttype = POSTAG.A_NX;
          } else {
            // 其他
            if (lasttype !== POSTAG.UNK) {
              ret.push({
                w: text.substr(lastcur, i - lastcur),
                p: [lasttype]
              });
              lastcur = i;
            }

            lasttype = POSTAG.UNK;
          }
        } // 剩余部分


        var nw = {
          w: text.substr(lastcur, i - lastcur)
        };
        if (lasttype !== POSTAG.UNK) nw.p = lasttype;
        ret.push(nw); // debug(ret);

        return ret;
      }
    }]);

    return ForeignTokenizer;
  }(Tokenizer$1);

  // 通配符识别模块
  var WildcardTokenizer =
  /*#__PURE__*/
  function (_Tokenizer) {
    _inherits(WildcardTokenizer, _Tokenizer);

    function WildcardTokenizer() {
      _classCallCheck(this, WildcardTokenizer);

      return _possibleConstructorReturn(this, _getPrototypeOf(WildcardTokenizer).apply(this, arguments));
    }

    _createClass(WildcardTokenizer, [{
      key: "split",
      value: function split(words) {
        this.segment.POSTAG;
        var TABLE = this.segment.getDict('WILDCARD');
        var ret = [];

        for (var i = 0, word; word = words[i]; i++) {
          if (word.p > 0) {
            ret.push(word);
            continue;
          } // 仅对未识别的词进行匹配


          var wordinfo = this.matchWord(word.w);

          if (wordinfo.length < 1) {
            ret.push(word);
            continue;
          } // 分离出已识别的单词


          var lastc = 0;

          for (var ui = 0, bw; bw = wordinfo[ui]; ui++) {
            if (bw.c > lastc) {
              ret.push({
                w: word.w.substr(lastc, bw.c - lastc)
              });
            }

            ret.push({
              w: bw.w,
              p: TABLE[bw.w.toLowerCase()].p
            });
            lastc = bw.c + bw.w.length;
          }

          var lastword = wordinfo[wordinfo.length - 1];

          if (lastword.c + lastword.w.length < word.w.length) {
            ret.push({
              w: word.w.substr(lastword.c + lastword.w.length)
            });
          }
        }

        return ret;
      }
      /**
       * 匹配单词，返回相关信息
       *
       * @param {string} text 文本
       * @param {int} cur 开始位置
       * @return {array}  返回格式   {w: '单词', c: 开始位置}
       */

    }, {
      key: "matchWord",
      value: function matchWord(text, cur) {
        if (isNaN(cur)) cur = 0;
        var ret = [];
        var TABLE = this.segment.getDict('WILDCARD2'); // 匹配可能出现的单词，取长度最大的那个

        var lowertext = text.toLowerCase();

        while (cur < text.length) {
          var stopword = false;

          for (var i in TABLE) {
            if (lowertext.substr(cur, i) in TABLE[i]) {
              stopword = {
                w: text.substr(cur, i),
                c: cur
              };
            }
          }

          if (stopword !== false) {
            ret.push(stopword);
            cur += stopword.w.length;
          } else {
            cur++;
          }
        }

        return ret;
      }
    }]);

    return WildcardTokenizer;
  }(Tokenizer$1);

  var modules = [// 强制分割类单词识别
  URLTokenizer, // URL识别
  WildcardTokenizer, // 通配符，必须在标点符号识别之前
  PunctuationTokenizer, // 标点符号识别
  ForeignTokenizer, // 外文字符、数字识别，必须在标点符号识别之后
  // 中文单词识别
  DictTokenizer, // 词典识别
  ChsNameTokenizer, // 人名识别，建议在词典识别之后
  // 优化模块
  EmailOptimizer, // 邮箱地址识别
  ChsNameOptimizer, // 人名识别优化
  DictOptimizer, // 词典识别优化
  DatetimeOptimizer, // 日期时间识别优化
  AdjectiveOptimizer];

  var pangu = "" // 已提取字典集，这里注释

  var panguExtend1 =  ""// 已提取字典集，这里注释
  var panguExtend2 = "" // 已提取字典集，这里注释

  var names = "" // 已提取字典集，这里注释

  var wildcard = "" // 已提取字典集，这里注释

  var synonym = "" // 已提取字典集，这里注释

  var stopword = ""; // 已提取字典集，这里注释

  var dicts = [pangu, panguExtend1, panguExtend2, names, wildcard];
  var synonyms = [synonym];
  var stopwords = [stopword];

  function useDefault(segmentInstance) {
    segmentInstance.use(modules);
    segmentInstance.loadDict(dicts);
    segmentInstance.loadSynonymDict(synonyms);
    segmentInstance.loadStopwordDict(stopwords);
    return segmentInstance;
  }

  // @ts-ignore
  let segmentit; // segmentit 加载词典。
  let hansIntlSegmenter; // Intl.Segmenter
  /**
   * TODO: 分词并带词性信息，需要调整 segment_pinyin 方法。
   * 分词并标注词性。
   */
  function segment(hans, segment) {
      // segmentit (Node.js)
      if (segment === "segmentit") {
          if (!segmentit) {
              segmentit = useDefault(new Segment());
          }
          return segmentit.doSegment(hans, {
              simple: true,
          });
      }
      // Intl.Segmenter
      if (segment === "Intl.Segmenter") {
          if (typeof (Intl === null || Intl === void 0 ? void 0 : Intl.Segmenter) === "function") {
              if (!hansIntlSegmenter) {
                  hansIntlSegmenter = new Intl.Segmenter("zh-Hans-CN", {
                      granularity: "word",
                  });
              }
              return [...hansIntlSegmenter.segment(hans)].map((s) => s.segment);
          }
      }
      return [hans];
  }

  // 拼音风格枚举
  var ENUM_PINYIN_STYLE;
  (function (ENUM_PINYIN_STYLE) {
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["NORMAL"] = 0] = "NORMAL";
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["TONE"] = 1] = "TONE";
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["TONE2"] = 2] = "TONE2";
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["TO3NE"] = 5] = "TO3NE";
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["INITIALS"] = 3] = "INITIALS";
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["FIRST_LETTER"] = 4] = "FIRST_LETTER";
      ENUM_PINYIN_STYLE[ENUM_PINYIN_STYLE["PASSPORT"] = 6] = "PASSPORT";
  })(ENUM_PINYIN_STYLE || (ENUM_PINYIN_STYLE = {}));
  // 拼音模式。
  var ENUM_PINYIN_MODE;
  (function (ENUM_PINYIN_MODE) {
      ENUM_PINYIN_MODE[ENUM_PINYIN_MODE["NORMAL"] = 0] = "NORMAL";
      ENUM_PINYIN_MODE[ENUM_PINYIN_MODE["SURNAME"] = 1] = "SURNAME";
      // PLACENAME = 2, // TODO: 地名模式，优先使用地名拼音。
  })(ENUM_PINYIN_MODE || (ENUM_PINYIN_MODE = {}));
  const DEFAULT_OPTIONS = {
      style: ENUM_PINYIN_STYLE.TONE,
      mode: ENUM_PINYIN_MODE.NORMAL,
      heteronym: false,
      group: false,
      compact: false,
  };
  // 带声调字符。
  const PHONETIC_SYMBOL = {
      "ā": "a1",
      "á": "a2",
      "ǎ": "a3",
      "à": "a4",
      "ē": "e1",
      "é": "e2",
      "ě": "e3",
      "è": "e4",
      "ō": "o1",
      "ó": "o2",
      "ǒ": "o3",
      "ò": "o4",
      "ī": "i1",
      "í": "i2",
      "ǐ": "i3",
      "ì": "i4",
      "ū": "u1",
      "ú": "u2",
      "ǔ": "u3",
      "ù": "u4",
      "ü": "v0",
      "ǘ": "v2",
      "ǚ": "v3",
      "ǜ": "v4",
      "ń": "n2",
      "ň": "n3",
      "": "m2",
  };
  // 声母表。
  const INITIALS = "b,p,m,f,d,t,n,l,g,k,h,j,q,x,r,zh,ch,sh,z,c,s".split(",");

  function hasKey(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
  }
  const pinyinStyleMap = new Map([
      ["tone", ENUM_PINYIN_STYLE.TONE],
      ["TONE", ENUM_PINYIN_STYLE.TONE],
      ["1", ENUM_PINYIN_STYLE.TONE],
      ["tone2", ENUM_PINYIN_STYLE.TONE2],
      ["TONE2", ENUM_PINYIN_STYLE.TONE2],
      ["2", ENUM_PINYIN_STYLE.TONE2],
      ["to3ne", ENUM_PINYIN_STYLE.TO3NE],
      ["TO3NE", ENUM_PINYIN_STYLE.TO3NE],
      ["5", ENUM_PINYIN_STYLE.TO3NE],
      ["first_letter", ENUM_PINYIN_STYLE.FIRST_LETTER],
      ["FIRST_LETTER", ENUM_PINYIN_STYLE.FIRST_LETTER],
      ["4", ENUM_PINYIN_STYLE.FIRST_LETTER],
      ["initials", ENUM_PINYIN_STYLE.INITIALS],
      ["INITIALS", ENUM_PINYIN_STYLE.INITIALS],
      ["3", ENUM_PINYIN_STYLE.INITIALS],
      ["normal", ENUM_PINYIN_STYLE.NORMAL],
      ["NORMAL", ENUM_PINYIN_STYLE.NORMAL],
      ["0", ENUM_PINYIN_STYLE.NORMAL],
      ["passport", ENUM_PINYIN_STYLE.PASSPORT],
      ["PASSPORT", ENUM_PINYIN_STYLE.PASSPORT],
      ["6", ENUM_PINYIN_STYLE.PASSPORT],
  ]);
  // 将用户输入的拼音形式参数转换成唯一指定的强类型。
  function convertPinyinStyle(style) {
      const s = String(style);
      if (pinyinStyleMap.has(s)) {
          return pinyinStyleMap.get(s);
      }
      return ENUM_PINYIN_STYLE.TONE;
  }
  const pinyinModeMap = new Map([
      ["normal", ENUM_PINYIN_MODE.NORMAL],
      ["NORMAL", ENUM_PINYIN_MODE.NORMAL],
      ["surname", ENUM_PINYIN_MODE.SURNAME],
      ["SURNAME", ENUM_PINYIN_MODE.SURNAME],
  ]);
  // 将用户输入的拼音形式参数转换成唯一指定的强类型。
  function convertPinyinMode(mode) {
      const s = String(mode);
      if (pinyinModeMap.has(s)) {
          return pinyinModeMap.get(s);
      }
      return ENUM_PINYIN_MODE.NORMAL;
  }
  function convertUserOptions(options) {
      let segment = undefined;
      if (options === null || options === void 0 ? void 0 : options.segment) {
          if ((options === null || options === void 0 ? void 0 : options.segment) === true) {
              segment = "Intl.Segmenter";
          }
          else {
              segment = options.segment;
          }
      }
      const opt = Object.assign(Object.assign({}, DEFAULT_OPTIONS), { style: convertPinyinStyle(options === null || options === void 0 ? void 0 : options.style), mode: convertPinyinMode(options === null || options === void 0 ? void 0 : options.mode), segment, heteronym: (options === null || options === void 0 ? void 0 : options.heteronym) || false, group: (options === null || options === void 0 ? void 0 : options.group) || false });
      return opt;
  }
  /**
   * 组合 2 个拼音数组。
   * @param {string[]} a1 第一个数组，形如 ["zhāo", "cháo"]
   * @param {string[]} a2 字符串型数组。形如 ["yáng"]
   * @return {string[]} 组合后的一维数组，如上可得 ["zhāoyáng", "cháoyáng"]
   */
  function combo2array(a1, a2) {
      const result = [];
      if (!a1.length) {
          return a2;
      }
      if (!a2.length) {
          return a1;
      }
      for (let i = 0, l = a1.length; i < l; i++) {
          for (let j = 0, m = a2.length; j < m; j++) {
              result.push(a1[i] + a2[j]);
          }
      }
      return result;
  }
  /**
   * 合并二维元祖。
   * @param {string[][]} arr 二维元祖 [["zhāo", "cháo"], ["yáng"], ["dōng"], ["shēng"]]
   * @return {string[]} 返回二维字符串组合数组。形如
   *  [
   *    ["zhāoyáng"], ["dōng"], ["shēng"],
   *    ["cháoyáng"], ["dōng"], ["shēng"]
   *  ]
   */
  function combo(arr) {
      if (arr.length === 0) {
          return [];
      }
      if (arr.length === 1) {
          return arr[0];
      }
      let result = combo2array(arr[0], arr[1]);
      for (let i = 2, l = arr.length; i < l; i++) {
          result = combo2array(result, arr[i]);
      }
      return result;
  }
  /**
   * 组合两个拼音数组，形成一个新的二维数组
   * @param {string[]|string[][]} arr1 eg: ["hai", "huan"]
   * @param {string[]} arr2 eg: ["qian"]
   * @returns {string[][]} 组合后的二维数组，eg: [ ["hai", "qian"], ["huan", "qian"] ]
   */
  function compact2array(a1, a2) {
      if (!Array.isArray(a1) || !Array.isArray(a2)) {
          throw new Error("compact2array expect two array as parameters");
      }
      if (!a1.length) {
          a1 = [""];
      }
      if (!a2.length) {
          a2 = [""];
      }
      const result = [];
      for (let i = 0, l = a1.length; i < l; i++) {
          for (let j = 0, m = a2.length; j < m; j++) {
              if (Array.isArray(a1[i])) {
                  result.push([...a1[i], a2[j]]);
              }
              else {
                  result.push([a1[i], a2[j]]);
              }
          }
      }
      return result;
  }
  function compact(arr) {
      if (arr.length === 0) {
          return [];
      }
      if (arr.length === 1) {
          return [arr[0]];
      }
      let result = compact2array(arr[0], arr[1]);
      for (let i = 2, l = arr.length; i < l; ++i) {
          result = compact2array(result, arr[i]);
      }
      return result;
  }

  /*
   * 格式化拼音为声母（Initials）形式。
   * @param {string} py 原始拼音字符串。
   * @return {string} 转换后的拼音声母部分。
   */
  function initials(py) {
      for (let i = 0, l = INITIALS.length; i < l; i++) {
          if (py.indexOf(INITIALS[i]) === 0) {
              return INITIALS[i];
          }
      }
      return "";
  }
  const RE_PHONETIC_SYMBOL = new RegExp("([" + Object.keys(PHONETIC_SYMBOL).join("") + "])", "g");
  const RE_TONE2 = /([aeoiuvnm])([0-4])$/;
  /**
   * 格式化拼音风格。
   *
   * @param {string} pinyin TONE 风格的拼音。
   * @param {ENUM_PINYIN_STYLE} style 目标转换的拼音风格。
   * @return {string} 转换后的拼音。
   */
  function toFixed(pinyin, style) {
      let tone = ""; // 声调。
      let first_letter;
      let py;
      switch (style) {
          case ENUM_PINYIN_STYLE.INITIALS:
              return initials(pinyin);
          case ENUM_PINYIN_STYLE.FIRST_LETTER:
              first_letter = pinyin.charAt(0);
              if (hasKey(PHONETIC_SYMBOL, first_letter)) {
                  first_letter = PHONETIC_SYMBOL[first_letter].charAt(0);
              }
              return first_letter;
          case ENUM_PINYIN_STYLE.NORMAL:
              return pinyin.replace(RE_PHONETIC_SYMBOL, function ($0, $1_phonetic) {
                  return PHONETIC_SYMBOL[$1_phonetic].replace(RE_TONE2, "$1");
              });
          case ENUM_PINYIN_STYLE.PASSPORT:
              return pinyin.replace(RE_PHONETIC_SYMBOL, function ($0, $1_phonetic) {
                  return PHONETIC_SYMBOL[$1_phonetic].replace(RE_TONE2, "$1").replace("v", "YU");
              }).toUpperCase();
          case ENUM_PINYIN_STYLE.TO3NE:
              return pinyin.replace(RE_PHONETIC_SYMBOL, function ($0, $1_phonetic) {
                  return PHONETIC_SYMBOL[$1_phonetic];
              });
          case ENUM_PINYIN_STYLE.TONE2:
              py = pinyin.replace(RE_PHONETIC_SYMBOL, function ($0, $1) {
                  // 声调数值。
                  tone = PHONETIC_SYMBOL[$1].replace(RE_TONE2, "$2");
                  return PHONETIC_SYMBOL[$1].replace(RE_TONE2, "$1");
              });
              return py + tone;
          case ENUM_PINYIN_STYLE.TONE:
          default:
              return pinyin;
      }
  }

  // @see [百家姓](https://zh.wikipedia.org/wiki/%E7%99%BE%E5%AE%B6%E5%A7%93)
  var SurnamePinyinData = {
  };//字典已提取，这里注释

  // 复姓
  var CompoundSurnamePinyinData = {
      "万俟": [["mò"], ["qí"]],
      "上官": [["shàng"], ["guān"]],
      "东方": [["dōng"], ["fāng"]],
      "东郭": [["dōng"], ["guō"]],
      "东门": [["dōng"], ["mén"]],
      "乐正": [["yuè"], ["zhèng"]],
      "亓官": [["qí"], ["guān"]],
      "仉督": [["zhǎng"], ["dū"]],
      "令狐": [["líng"], ["hú"]],
      "仲孙": [["zhòng"], ["sūn"]],
      "公冶": [["gōng"], ["yě"]],
      "公孙": [["gōng"], ["sūn"]],
      "公羊": [["gōng"], ["yáng"]],
      "公良": [["gōng"], ["liáng"]],
      "公西": [["gōng"], ["xī"]],
      "单于": [["chán"], ["yú"]],
      "南宫": [["nán"], ["gōng"]],
      "南门": [["nán"], ["mén"]],
      "司寇": [["sī"], ["kòu"]],
      "司徒": [["sī"], ["tú"]],
      "司空": [["sī"], ["kōng"]],
      "司马": [["sī"], ["mǎ"]],
      "呼延": [["hū"], ["yán"]],
      "壤驷": [["rǎng"], ["sì"]],
      "夏侯": [["xià"], ["hóu"]],
      "太叔": [["tài"], ["shū"]],
      "夹谷": [["jiá"], ["gǔ"]],
      "子车": [["zǐ"], ["jū"]],
      "宇文": [["yǔ"], ["wén"]],
      "宗政": [["zōng"], ["zhèng"]],
      "宰父": [["zǎi"], ["fǔ"]],
      "尉迟": [["yù"], ["chí"]],
      "左丘": [["zuǒ"], ["qiū"]],
      "巫马": [["wū"], ["mǎ"]],
      "慕容": [["mù"], ["róng"]],
      "拓跋": [["tuò"], ["bá"]],
      "梁丘": [["liáng"], ["qiū"]],
      "榖梁": [["gǔ"], ["liáng"]],
      "欧阳": [["ōu"], ["yáng"]],
      "段干": [["duàn"], ["gān"]],
      "淳于": [["chún"], ["yú"]],
      "漆雕": [["qī"], ["diāo"]],
      "澹台": [["tán"], ["tái"]],
      "濮阳": [["pú"], ["yáng"]],
      "申屠": [["shēn"], ["tú"]],
      "百里": [["bǎi"], ["lǐ"]],
      "皇甫": [["huáng"], ["pǔ"]],
      "端木": [["duān"], ["mù"]],
      "第五": [["dì"], ["wǔ"]],
      "羊舌": [["yáng"], ["shé"]],
      "西门": [["xī"], ["mén"]],
      "诸葛": [["zhū"], ["gě"]],
      "赫连": [["hè"], ["lián"]],
      "轩辕": [["xuān"], ["yuán"]],
      "钟离": [["zhōng"], ["lí"]],
      "长孙": [["zhǎng"], ["sūn"]],
      "闻人": [["wén"], ["rén"]],
      "闾丘": [["lǘ"], ["qiū"]],
      "颛孙": [["zhuān"], ["sūn"]],
      "鲜于": [["xiān"], ["yú"]],
  };

  class PinyinBase {
      constructor() {
          // 兼容 v2.x 中的属性透出
          // pinyin styles:
          this.STYLE_TONE = ENUM_PINYIN_STYLE.TONE;
          this.STYLE_TONE2 = ENUM_PINYIN_STYLE.TONE2;
          this.STYLE_TO3NE = ENUM_PINYIN_STYLE.TO3NE;
          this.STYLE_NORMAL = ENUM_PINYIN_STYLE.NORMAL;
          this.STYLE_INITIALS = ENUM_PINYIN_STYLE.INITIALS;
          this.STYLE_FIRST_LETTER = ENUM_PINYIN_STYLE.FIRST_LETTER;
          this.STYLE_PASSPORT = ENUM_PINYIN_STYLE.PASSPORT;
          // 兼容 v2.x 中的属性透出
          // pinyin mode:
          this.MODE_NORMAL = ENUM_PINYIN_MODE.NORMAL;
          this.MODE_SURNAME = ENUM_PINYIN_MODE.SURNAME;
      }
      // MODE_PLACENAME = ENUM_PINYIN_MODE.PLACENAME;
      /**
       * 拼音转换入口。
       */
      pinyin(hans, options) {
          if (typeof hans !== "string") {
              return [];
          }
          const opt = convertUserOptions(options);
          let pys;
          if (opt.mode === ENUM_PINYIN_MODE.SURNAME) {
              pys = this.surname_pinyin(hans, opt);
          }
          else {
              // 因为分词结果有词性信息，结构不同，处理也不相同，所以需要分别处理。
              if (opt.segment) {
                  // 分词加词性标注转换。
                  pys = this.segment_pinyin(hans, opt);
              }
              else {
                  // 单字拆分转换。连续的非中文字符作为一个词（原样输出，不转换成拼音）。
                  pys = this.normal_pinyin(hans, opt);
              }
          }
          if (options === null || options === void 0 ? void 0 : options.compact) {
              pys = compact(pys);
          }
          return pys;
      }
      /**
       * 不使用分词算法的拼音转换。
       */
      normal_pinyin(hans, options) {
          const pys = [];
          let nohans = "";
          for (let i = 0, l = hans.length; i < l; i++) {
              const words = hans[i];
              const firstCharCode = words.charCodeAt(0);
              if (dict[firstCharCode]) {
                  // 处理前面的“非中文”部分。
                  if (nohans.length > 0) {
                      pys.push([nohans]);
                      nohans = ""; // 重置“非中文”缓存。
                  }
                  pys.push(this.single_pinyin(words, options));
              }
              else {
                  nohans += words;
              }
          }
          // 清理最后的非中文字符串。
          if (nohans.length > 0) {
              pys.push([nohans]);
              nohans = ""; // reset non-chinese words.
          }
          return pys;
      }
      /**
       * 单字拼音转换。
       * @param {String} han, 单个汉字
       * @return {Array} 返回拼音列表，多音字会有多个拼音项。
       */
      single_pinyin(han, options) {
          if (typeof han !== "string") {
              return [];
          }
          if (han.length !== 1) {
              return this.single_pinyin(han.charAt(0), options);
          }
          const hanCode = han.charCodeAt(0);
          if (!dict[hanCode]) {
              return [han];
          }
          const pys = dict[hanCode].split(",");
          if (!options.heteronym) {
              return [toFixed(pys[0], options.style)];
          }
          // 临时存储已存在的拼音，避免多音字拼音转换为非注音风格出现重复。
          const py_cached = {};
          const pinyins = [];
          for (let i = 0, l = pys.length; i < l; i++) {
              const py = toFixed(pys[i], options.style);
              if (hasKey(py_cached, py)) {
                  continue;
              }
              py_cached[py] = py;
              pinyins.push(py);
          }
          return pinyins;
      }
      segment(hans, segmentType) {
          return segment(hans, segmentType);
      }
      /**
       * 将文本分词，并转换成拼音。
       */
      segment_pinyin(hans, options) {
          const phrases = this.segment(hans, options.segment);
          let pys = [];
          let nohans = "";
          for (let i = 0, l = phrases.length; i < l; i++) {
              const words = phrases[i];
              const firstCharCode = words.charCodeAt(0);
              if (dict[firstCharCode]) {
                  // ends of non-chinese words.
                  if (nohans.length > 0) {
                      pys.push([nohans]);
                      nohans = ""; // reset non-chinese words.
                  }
                  const newPys = words.length === 1
                      ? this.normal_pinyin(words, options)
                      : this.phrases_pinyin(words, options);
                  if (options.group) {
                      pys.push(this.groupPhrases(newPys));
                  }
                  else {
                      pys = pys.concat(newPys);
                  }
              }
              else {
                  nohans += words;
              }
          }
          // 清理最后的非中文字符串。
          if (nohans.length > 0) {
              pys.push([nohans]);
              nohans = ""; // reset non-chinese words.
          }
          return pys;
      }
      /**
       * 词语注音
       * @param {String} phrases, 指定的词组。
       * @param {Object} options, 选项。
       * @return {Array}
       */
      phrases_pinyin(phrases, options) {
          const py = [];
          if (hasKey(phrases_dict, phrases)) {
              //! copy pinyin result.
              phrases_dict[phrases].forEach(function (item, idx) {
                  py[idx] = [];
                  if (options.heteronym) {
                      item.forEach(function (py_item, py_index) {
                          py[idx][py_index] = toFixed(py_item, options.style);
                      });
                  }
                  else {
                      py[idx][0] = toFixed(item[0], options.style);
                  }
              });
          }
          else {
              for (let i = 0, l = phrases.length; i < l; i++) {
                  py.push(this.single_pinyin(phrases[i], options));
              }
          }
          return py;
      }
      groupPhrases(phrases) {
          if (phrases.length === 1) {
              return phrases[0];
          }
          const grouped = combo(phrases);
          return grouped;
      }
      // 姓名转成拼音
      surname_pinyin(hans, options) {
          return this.compound_surname(hans, options);
      }
      // 复姓处理
      compound_surname(hans, options) {
          const len = hans.length;
          let prefixIndex = 0;
          let result = [];
          for (let i = 0; i < len; i++) {
              const twowords = hans.substring(i, i + 2);
              if (hasKey(CompoundSurnamePinyinData, twowords)) {
                  if (prefixIndex <= i - 1) {
                      result = result.concat(this.single_surname(hans.substring(prefixIndex, i), options));
                  }
                  const pys = CompoundSurnamePinyinData[twowords].map((item) => {
                      return item.map((ch) => toFixed(ch, options.style));
                  });
                  result = result.concat(pys);
                  i = i + 2;
                  prefixIndex = i;
              }
          }
          // 处理复姓后面剩余的部分。
          result = result.concat(this.single_surname(hans.substring(prefixIndex, len), options));
          return result;
      }
      // 单姓处理
      single_surname(hans, options) {
          let result = [];
          for (let i = 0, l = hans.length; i < l; i++) {
              const word = hans.charAt(i);
              if (hasKey(SurnamePinyinData, word)) {
                  const pys = SurnamePinyinData[word].map((item) => {
                      return item.map((ch) => toFixed(ch, options.style));
                  });
                  result = result.concat(pys);
              }
              else {
                  result.push(this.single_pinyin(word, options));
              }
          }
          return result;
      }
      /**
       * 比较两个汉字转成拼音后的排序顺序，可以用作默认的拼音排序算法。
       *
       * @param {String} hanA 汉字字符串 A。
       * @return {String} hanB 汉字字符串 B。
       * @return {Number} 返回 -1，0，或 1。
       */
      compare(hanA, hanB) {
          const pinyinA = this.pinyin(hanA);
          const pinyinB = this.pinyin(hanB);
          return String(pinyinA).localeCompare(String(pinyinB));
      }
      compact(pys) {
          return compact(pys);
      }
  }
  function getPinyinInstance(py) {
      const pinyin = py.pinyin.bind(py);
      pinyin.compare = py.compare.bind(py);
      pinyin.compact = py.compact.bind(py);
      // pinyin styles: 兼容 v2.x 中的属性透出
      pinyin.STYLE_TONE = ENUM_PINYIN_STYLE.TONE;
      pinyin.STYLE_TONE2 = ENUM_PINYIN_STYLE.TONE2;
      pinyin.STYLE_TO3NE = ENUM_PINYIN_STYLE.TO3NE;
      pinyin.STYLE_NORMAL = ENUM_PINYIN_STYLE.NORMAL;
      pinyin.STYLE_INITIALS = ENUM_PINYIN_STYLE.INITIALS;
      pinyin.STYLE_FIRST_LETTER = ENUM_PINYIN_STYLE.FIRST_LETTER;
      pinyin.STYLE_PASSPORT = ENUM_PINYIN_STYLE.PASSPORT;
      // pinyin mode: 兼容 v2.x 中的属性透出
      pinyin.MODE_NORMAL = ENUM_PINYIN_MODE.NORMAL;
      pinyin.MODE_SURNAME = ENUM_PINYIN_MODE.SURNAME;
      // pinyin.MODE_PLACENAME = ENUM_PINYIN_MODE.PLACENAME;
      return pinyin;
  }

  class Pinyin extends PinyinBase {
  }
  const pinyin = getPinyinInstance(new Pinyin());
  const compare = pinyin.compare;

  exports.Pinyin = Pinyin;
  exports.compact = compact;
  exports.compare = compare;
  exports["default"] = pinyin;
  exports.pinyin = pinyin;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=pinyin.js.map
