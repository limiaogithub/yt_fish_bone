$(function () {
    $.fn.FishBone = function (options) {
        var defaults = {
            /*json数据！重要，必填*/
            jsonData: null,
            /*鱼骨主题，用来修改样式，默认是1,目前不支持 */
            theme: "default",
            /*是否可以拖动，默认是true */
            dragable: true,
            /*是否显示工具条 */
            showToolbar: true,
            /* 画布的大小 */
            canvasSize: [document.body.scrollWidth - 10, document.body.scrollHeight - 55],
            /*  鱼头左侧中心坐标  */
            //mainFishTopPosition: null,
            /* debug模式 */
            debug: false,
            sceneBackgroundImage: null,
            /**
             * 下面3个事件分别是点击、右键点击、鼠标悬浮，可回调如下函数
             * function (node) {
             * alert(node.text);
             * }
             */
            clickNodeFunction: null,
            rClickNodeFunction: null,
            mouseOverFunction: null
        };

        var $this = $(this);

        /* 获取文件相对路径*/
        this.getPath = function () {
            var _, A, $ = document.getElementsByTagName("script");
            for (var B = 0; B < $.length; B++) {
                _ = $[B].getAttribute("src") || "";
                _ = _.substr(0, _.indexOf("FishBone.js"));
                A = _.lastIndexOf("/");
                if (A > 0)_ = _.substring(0, A + 1);
                if (_)break
            }
            return _
        }

        /* 文件相对路径 */
        var basePath = this.getPath();

        /* js加载计数器 */
        var jsCount = 0;

        /* 依赖文件*/
        this.importJs = ["require/jtopo-0.4.2-min.js", "FinModel.js", "Map.js", "toolbar.js"];
        var l = this.importJs.length;

        /* 创建js元素*/
        this.createJsElement = function (jsPath) {
            var element1 = document.createElement("script");
            document.body.appendChild(element1);
            element1.setAttribute("src", jsPath);
            element1.setAttribute("type", "text/javascript");
            if (document.all) {
                element1.onreadystatechange = function () {
                    if (this.readyState == "loaded" || this.readyState == "complete") {
                        jsCount++;
                        if (jsCount == l) {
                            start(options, basePath);
                        }
                    }
                }
            } else {
                element1.onload = function () {
                    jsCount++;
                    if (jsCount == l) {
                        start(options, basePath);
                    }
                }
            }
        }

        /* 循环导入依赖*/
        this.importDependency = function () {
            for (var i = 0; i < this.importJs.length; i++) {
                this.createJsElement(basePath + this.importJs[i]);
            }
        }
        /* 导入依赖*/
        this.importDependency();

        /* js文件加载完毕，开始鱼 */
        function start(options, path_) {
            /* 基础点的集合,最后进行渲染　*/
            this.baseNodeArray = new Array();
            /* 鱼翅集合,最后进行渲染 */
            this.FishBoneMap = new Map_();
            /* 骨干鱼翅上两个子鱼翅为一组，算最大值，需要了解一共有多少段，每段的最大长度 */
            this.FinTeamMap = new Map_();

            this.FinDeepTempMap = new Map_();
            /* 画布 */
            this.stage = "";
            this.scene = "";
            /*默认支持鱼骨数量*/
            this.defaultBonesDeep = 3;
            /*主要鱼骨长度*/
            this.mainBoneLength = 0;
            /*  鱼头上侧坐标    */
            this.mainFishTopPosition = [];
            /*  鱼头中心中心坐标    */
            this.mainFishPosition = [];
            /*  鱼尾巴中心中心坐标    */
            this.mainFishTailPosition = [];
            /*  鱼尾巴图片坐标    */
            this.mainFishTailImagePosition = [];
            /*  鱼头id */
            this.mainFishId = 1;
            /*  鱼头长度    */
            this.mainHeadLength = 0;
            /*  鱼头文字    */
            this.mainHeadText = "";

            /*根号3*/
            var sign3 = Math.sqrt(3);
            /*默认主要鱼骨的步长*/
            var defaultBoneStepLength = 150;
            /*默认鱼头高度 a4*/
            var defaultFishHeadHeight = 64;
            /*图像百分比系数 100%*/
            var basePercent = 1;
            /*从鱼头X轴到第一个点的默认距离 a1*/
            var defaultHeadToFirstNodeLength = 50;
            /*鱼尾 a16*/
            var defaultFishTail = 50;
            /*默认一级鱼骨交叉距离 a2*/
            var defaultCrossStep = 30;
            /*默认二级鱼骨一个汉字的长度 h1*/
            var defaultCharLengthForLevel1 = 16;
            /*默认二级鱼骨一个汉字的长度 h1*/
            var defaultCharLengthForLevel2 = 13;
            /*默认二级鱼骨以下一个汉字的长度 */
            var defaultCharLengthForLevel3AndLow = 12;
            /*默认二级鱼骨以下一个汉字的长度 */
            var defaultUpEnglishLength = 8;
            /*默认一级字符长度*/
            var defaultSignLengthForLevel1 = 10;
            /*默认二级鱼骨一个字符的长度 h1*/
            var defaultSignLength = 5;
            /*4级骨头每个鱼翅的距离 a13*/
            var defaultLevel4Step = 15;

            /*合并  将defaults 与 options合并 */
            var options = $.extend(defaults, options);

            /* 默认树的深度是-1 */
            this.fishBoneDeep_ = -1;

            /*获取字符串中文数量*/
            this.getChineseCount = function (str) {
                var count = 0;
                for (var i = 0; i < str.length; i++) {
                    if (str.charCodeAt(i) > 255) {
                        count++;
                    }
                }
                return count;
            }

            /*获取字符串中文数量*/
            this.getUpEnglishCount = function (str) {
                var count = 0;
                for (var i = 0; i < str.length; i++) {
                    if (str.charCodeAt(i) >= 65 && str.charCodeAt(i) <= 90) {
                        count++;
                    }
                }
                return count;
            }

            /* 比较每个节点的深度，重复覆盖默认值，取最大 */
            this.compare_ = function (deep) {
                if (deep != null) {
                    this.fishBoneDeep_ = deep > this.fishBoneDeep_ ? deep : this.fishBoneDeep_;
                }
            }

            var iCount = 1;
            var deep = 1;

            /* 获取鱼头的长度   */
            this.getHeadLength = function (name) {
                var chineseCount = this.getChineseCount(name);
                var upEnglishCount = this.getUpEnglishCount(name);
                return chineseCount * defaultCharLengthForLevel1 + upEnglishCount * defaultUpEnglishLength + (name.length - chineseCount - upEnglishCount) * defaultSignLengthForLevel1 + 40;
            }

            /* 递归整棵树,同时计算树的最大深度，计算鱼头的长度 */
            this.deepLoop_ = function (dat) {
                if (iCount == 1) {
                    this.mainFishId = dat.id;
                    this.FinDeepTempMap.put(dat.id, 1);
                    this.mainHeadText = dat.name;
                    this.mainHeadLength = this.getHeadLength(this.mainHeadText);
                } else {
                    if (this.FinDeepTempMap.containsKey(dat.fid)) {
                        deep = this.FinDeepTempMap.get(dat.fid) + 1;
                        this.FinDeepTempMap.put(dat.id, deep);
                    }
                }
                iCount++;
                this.compare_(deep);
                if (dat.children) {
                    for (var i = 0; i < dat.children.length; i++) {
                        this.deepLoop_(dat.children[i]);
                    }
                }
            }

            /* 递归整棵树 */
            this.getBoneDeep = function () {
                for (var i = 0; i < options.jsonData.length; i++) {
                    this.deepLoop_(options.jsonData[i]);
                }
                return this.fishBoneDeep_;
            }

            /* 验证树的深度 */
            this.validateBoneDeep = function () {
                var flag = this.getBoneDeep() > this.defaultBonesDeep;
                if (flag) {
                    alert("对不起，目前仅支持" + this.defaultBonesDeep + "级鱼骨!");
                }
                return !flag;
            }

            /* validate */
            this.validate = function () {
                if (!options.jsonData) {
                    alert("json数据不能为空！");
                    return;
                }
                if (!this.validateBoneDeep()) {
                    return;
                }
            }

            this.validate();

            this.getFishBoneNode = function (position) {
                var jNode = new JTopo.Node("");
                jNode.shadow = false;
                jNode.showSelected = false;
                jNode.dragable = false;
                if (position && position.length > 1) {
                    jNode.setLocation(position[0], position[1]);
                }
                jNode.setSize(0, 0);
                if (options.debug) {
                    jNode.setSize(5, 5);
                }
                return jNode;
            }

            this.getFishBoneLinkByNode = function (node_, jNodeFrom, jNodeTo, text, color) {
                var link = new JTopo.Link(jNodeFrom, jNodeTo, text);
                link.lineWidth = 1;
                link.zIndex = 10;
                link.dragable = false;
                link.shadow = false;
                if (node_.lineColor_) {
                    link.fillColor = node_.lineColor_;
                    link.strokeColor = node_.lineColor_;
                }
                return link;
            }

            this.getFishTextNode = function (node) {
                var textNode;
                /*链接节点或文字节点*/
                if (node.link_) {
                    textNode = new JTopo.LinkNode(node.name_);
                    textNode.href = node.link_;
                    textNode.target = '_blank';
                } else {
                    textNode = new JTopo.TextNode(node.name_);
                }
                textNode.fontColor = '40,40,40';
                /*2级节点文字特殊*/
                if (node.level_ == 2) {
                    textNode.font = 'bold 12px 微软雅黑';
                    textNode.shadow = true;
                    textNode.shadowBlur = 9;
                    //textNode.selected=true;
                } else {
                    textNode.font = '12px 微软雅黑';
                    textNode.shadow = false;
                }
                if (node.nameColor_) {
                    textNode.fontColor = node.nameColor_;
                }
                /*文字点击事件*/
                if (options.clickNodeFunction) {
                    textNode.click(function () {
                        options.clickNodeFunction(this);
                    });
                }
                /*右键点击事件*/
                if (options.rClickNodeFunction) {
                    textNode.addEventListener('mouseup', function (event) {
                        if (event.button == 2) {
                            options.rClickNodeFunction(this);
                        }
                    });
                }
                /*鼠标划上事件*/
                if (options.mouseOverFunction) {
                    textNode.addEventListener('mouseover', function (event) {
                        options.mouseOverFunction(this);
                    });
                }
                textNode.dragable = false;
                textNode.rotate = node.rotate_;
                return textNode;
            }

            /*初始化画布容器*/
            this.initHtmlCanvas = function () {
                this.mainFishTopPosition = [options.canvasSize[0] * 0.98 - this.mainHeadLength , options.canvasSize[1] * 0.5 - defaultFishHeadHeight / 2 ];
                this.mainFishPosition = [this.mainFishTopPosition[0], this.mainFishTopPosition[1] + defaultFishHeadHeight / 2];
                $this.prepend("<canvas width='" + options.canvasSize[0] + "' height='" + options.canvasSize[1] + "' id='canvas__'></canvas>");
            }

            /*初始化JTopo画布*/
            this.initJtoPoScene = function () {
                this.stage = new JTopo.Stage(document.getElementById('canvas__'));
                this.scene = new JTopo.Scene(this.stage);
                if (options.sceneBackgroundImage) {
                    this.scene.background = options.sceneBackgroundImage;
                }
                if (options.showToolbar) {
                    showJTopoToobar(this.stage, $this);
                }
                if (!options.dragable) {
                    this.scene.mode = 'select';
                    this.scene.areaSelect = false;
                }
            }

            /* 鱼翅在上或在下,true是上，false是下  */
            var upOrDown = false;
            /* 用于计算２级鱼骨的第几个节点，当是奇数的时候增加小组*/
            var nodeIndex = 0;
            /* 鱼翅小组，每两个二级鱼翅为一个小组　*/
            var teamIndex = 1;
            var datIndex = 1;

            this.initFinModels = function (dat) {
                var fin = new FinModel(dat.id, dat.fid, dat.name, upOrDown, dat.fontColor, dat.lineColor, dat.link);
                if (datIndex == 1) {
                    fin.setLevel_(1);
                } else {
                    if (this.FishBoneMap.containsKey(fin.getFid_())) {
                        fin.setLevel_(this.FishBoneMap.get(fin.getFid_()).getLevel_() + 1);
                    }
                }
                this.FishBoneMap.put(fin.getId_(), fin);
                datIndex++;
                //修改算法
                //fin.setLevel_(this.getDeepByFinModel(fin));

                //2级叶子节点需要考虑分组切换
                if (fin.getLevel_() == 2) {
                    nodeIndex++;
                    if (nodeIndex % 2 == 1) {
                        if (nodeIndex != 1) {
                            teamIndex++;
                        }
                        this.FinTeamMap.put(teamIndex, 0);
                    }
                }
                fin.setFinTeam_(teamIndex);
                if (fin.getLevel_() == 2) {
                    upOrDown = !upOrDown;
                    fin.setUpOrDown_(upOrDown);
                }
                if (upOrDown) {
                    if (fin.level_ % 2 == 0) {
                        fin.setRotate_(Math.PI / 3);
                    }
                } else {
                    if (fin.level_ % 2 == 0) {
                        fin.setRotate_(Math.PI / 1.5);
                    }
                }
                if (dat.children) {
                    fin.setLeaf_(false);
                    for (var i = 0; i < dat.children.length; i++) {
                        this.initFinModels(dat.children[i]);
                    }
                } else {
                    fin.setLeaf_(true);
                }
            }

            /* 将所有json对象转化成map,key是id,value是fin对象 */
            this.initFinModelMap = function () {
                for (var i = 0; i < options.jsonData.length; i++) {
                    this.initFinModels(options.jsonData[i]);
                }
            }

            /* 3级鱼翅长度算法 */
            this.level3LengthArithmetic = function (c) {
                var chineseCount = this.getChineseCount(c);
                var upEnglishCount = this.getUpEnglishCount(c);
                return (chineseCount * defaultCharLengthForLevel3AndLow + upEnglishCount * defaultUpEnglishLength + (c.length - chineseCount - upEnglishCount) * defaultSignLength + 30);
            }

            /* 2级鱼翅长度算法 */
            this.level2LengthArithmetic = function (c) {
                var chineseCount = this.getChineseCount(c);
                var upEnglishCount = this.getUpEnglishCount(c);
                return (chineseCount * defaultCharLengthForLevel2 + upEnglishCount * defaultUpEnglishLength + (c.length - chineseCount - upEnglishCount) * defaultSignLength) + 50;
            }

            /* 线上文字坐标算法！重要  */
            this.levelPositionArithmetic = function (node) {
                var position = [];
                var x = 0;
                var y = 0;
                var offset = 0;
                if (node.level_ == 2) {
                    if (node.upOrDown_) {
                        var cc = this.getChineseCount(node.name_);
                        offset = 0 - (cc * 12 + (node.name_.length - cc) * 6) / 2 + 15;
                        x = node.toNodePosition_[0] + (node.fromNodePosition_[0] - node.toNodePosition_[0]) / 2 + offset;
                        y = node.fromNodePosition_[1] - (node.fromNodePosition_[1] - node.toNodePosition_[1]) / 2;
                    } else {
                        var cc = this.getChineseCount(node.name_);
                        offset = 0 - (cc * 12 + (node.name_.length - cc) * 6) / 2 + 10;
                        x = node.toNodePosition_[0] + (node.fromNodePosition_[0] - node.toNodePosition_[0]) / 2 + offset;
                        y = node.fromNodePosition_[1] + (node.toNodePosition_[1] - node.fromNodePosition_[1]) / 2;
                    }
                } else if (node.level_ == 3) {
                    x = node.toNodePosition_[0] + 13;
                    //x = node.toNodePosition_[0] + (node.fromNodePosition_[0] - node.toNodePosition_[0]) / 2 - 22;
                    y = node.fromNodePosition_[1] - (node.fromNodePosition_[1] - node.toNodePosition_[1]) / 2 - 16;
                }
                position = [x, y];
                return position;
            }

            /* 骨干鱼骨每个team的最大长度算法 */
            this.setTeamMaxLengthFinLength = function (fin, finLength) {
                var oldLength = this.FinTeamMap.get(fin.getFinTeam_());
                if (finLength > oldLength) {
                    this.FinTeamMap.put(fin.getFinTeam_(), finLength + 25);
                }
            }

            /* 重点方法，初始化下一级、下下级的最大长度，用于计算鱼翅坐标 */
            this.initNextLevelCount = function () {
                var arr = this.FishBoneMap.values();
                for (var i = arr.length - 1; i >= 0; i--) {
                    if (arr[i].fid_ != 0) {
                        var f = this.FishBoneMap.get(arr[i].id_);
                        var fParent = this.FishBoneMap.get(arr[i].fid_);
                        fParent.setNextLevelCount_(fParent.getNextLevelCount_() + 1);
                        switch (f.getLevel_()) {
                            case 2:
                                var length = this.level2LengthArithmetic(arr[i].name_);
                                if (f.getNextLevelCount_() != 0) {
                                    length = length + (f.getNextLevelCount_() - 1) * defaultCrossStep;
                                }
                                f.setFinLength_(length);
                                break;
                            case 3:
                                /*父父节点*/
                                var ffParent = this.FishBoneMap.get(fParent.getFid_());
                                /*3级文字长度*/
                                var length = this.level3LengthArithmetic(arr[i].name_);
                                /*如果有4级，那么长度是3级文字长度+4级算法*/
                                if (f.getNextLevelCount_() != 0) {
                                    length = length + f.getNextLevelCount_() * defaultLevel4Step;
                                }
                                /*设置3级文字长度*/
                                f.setFinLength_(length);
                                /*骨干鱼骨根据组判断最长鱼翅*/
                                this.setTeamMaxLengthFinLength(f, length);
                                /*父级节点设置下级最长鱼翅*/
                                fParent.setNextLevelMaxLength_(fParent.getNextLevelMaxLength_() > f.getFinLength_() ? fParent.getNextLevelMaxLength_() : f.getFinLength_());
                                fParent.getChildrenNode_().push(f);
                                break;
//                        case 4:
//                            /*父父节点*/
//                            var ffParent = this.FishBoneMap.get(fParent.getFid_());
//                            /*本节点的长度*/
//                            f.setFinLength_(this.level3LengthArithmetic(arr[i].name_));
//                            /*父节点下级最长鱼翅*/
//                            fParent.setNextLevelMaxLength_(fParent.getNextLevelMaxLength_() > f.getFinLength_() ? fParent.getNextLevelMaxLength_() : f.getFinLength_());
//                            /*父父节点下两级最长鱼翅*/
//                            ffParent.setNextLevel2MaxLength_(fParent.getNextLevelMaxLength_());
//                            fParent.getChildrenNode_().push(f);
//                            break;
                        }
                    }
                }
            }

            /*初始化整个鱼身的长度*/
            this.initMainBoneLength = function () {
                var length = 0;
                var arr = this.FinTeamMap.values();
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i] == 0) {
                        arr[i] = defaultBoneStepLength;
                    }
                    length = length + arr[i];
                }
                this.mainBoneLength = length + defaultHeadToFirstNodeLength + defaultFishTail + 130;
            }

            /*鱼头坐标*/
            this.initMainBonePositions = function () {
                var jNode = this.getFishBoneNode(this.mainFishTopPosition);
                jNode.setImage(path_ + 'theme/default/image/head.png', false);
                jNode.setSize(this.mainHeadLength, defaultFishHeadHeight);
                //jNode.scalaX=Math.random();
                this.baseNodeArray.push(jNode);
            }

            /*初始化骨干鱼骨*/
            this.initMainBone = function () {
                this.initMainBoneLength();
                this.initMainBonePositions();
                /*鱼头左侧中心*/
                var jNodeFrom = this.getFishBoneNode(this.mainFishPosition);
                this.baseNodeArray.push(jNodeFrom);
                /*鱼头文字*/
                var textNode = new JTopo.TextNode(this.FishBoneMap.get(this.mainFishId).name_);
                textNode.fontColor = '40,40,40';
                textNode.font = 'bold 16px 微软雅黑';
                textNode.shadow = false;
                textNode.dragable = false;
                textNode.setLocation(this.mainFishPosition[0] + 5, this.mainFishPosition[1] - 12);
                this.baseNodeArray.push(textNode);
                /*鱼尾*/
                this.mainFishTailPosition = [this.mainFishPosition[0] - this.mainBoneLength, this.mainFishPosition[1]];
                var jNodeTo = this.getFishBoneNode(this.mainFishTailPosition);
                this.baseNodeArray.push(jNodeTo);
                /*连线
                 var link = this.getFishBoneLink(jNodeFrom, jNodeTo);
                 link.lineWidth = 1;
                 this.baseNodeArray.push(link); */
                /*鱼身*/
                var bodyPosition = [this.mainFishPosition[0] - this.mainBoneLength - 10, this.mainFishPosition[1] - 6];
                var jNode = this.getFishBoneNode(bodyPosition);
                jNode.setImage(path_ + 'theme/default/image/body.png', false);
                jNode.zIndex = 9;
                jNode.setSize(this.mainBoneLength + 10, 9);
                this.baseNodeArray.push(jNode);
                /*鱼尾图片*/
                this.mainFishTailImagePosition = [this.mainFishTailPosition[0] - 24, this.mainFishTailPosition[1] - 34];
                var jNodeTail = this.getFishBoneNode(this.mainFishTailImagePosition);
                jNodeTail.setImage(path_ + 'theme/default/image/tail.png', true);
                jNodeTail.zIndex = 10;
                this.baseNodeArray.push(jNodeTail);
            }

            /*初始化2级鱼骨坐标*/
            this.initLevel2Position = function () {
                var arr = this.FishBoneMap.values();
                var k = 0;
                var lastX = 0;
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].level_ == 2) {
                        k++;
                        if (k == 1) {
                            //X坐标
                            lastX = this.mainFishPosition[0] - defaultHeadToFirstNodeLength;
                            arr[i].fromNodePosition_ = [lastX, this.mainFishPosition[1]];
                            //Ｙ坐标
                            arr[i].toNodePosition_ = [lastX - arr[i].finLength_ / 2, this.mainFishPosition[1] - arr[i].finLength_ * sign3 / 2];
                            continue;
                        }
                        if (k % 2 == 1) {
                            //X坐标
                            var l = this.FinTeamMap.get(arr[i].getFinTeam_() - 1);
                            lastX = lastX - (l == 0 ? defaultBoneStepLength : l);
                            arr[i].fromNodePosition_ = [lastX, this.mainFishPosition[1]];
                            //Ｙ坐标
                            arr[i].toNodePosition_ = [lastX - arr[i].finLength_ / 2, this.mainFishPosition[1] - arr[i].finLength_ * sign3 / 2];
                        } else {
                            //X坐标
                            lastX = lastX - defaultCrossStep;
                            arr[i].fromNodePosition_ = [lastX, this.mainFishPosition[1]];
                            //Ｙ坐标
                            arr[i].toNodePosition_ = [lastX - arr[i].finLength_ / 2, this.mainFishPosition[1] + arr[i].finLength_ * sign3 / 2];
                        }
                    }
                }
            }

            /*初始化3级鱼骨坐标*/
            this.initLevel3Position = function () {
                var arr = this.FishBoneMap.values();
                for (var k = 0; k < arr.length; k++) {
                    if (arr[k].level_ == 2) {
                        /*例如1001*/
                        var node = arr[k].childrenNode_;
                        var s = 0;
                        if (node.length > 0) {
                            for (var i = node.length - 1; i >= 0; i--) {
                                if (node[i].upOrDown_) {
                                    node[i].fromNodePosition_ = [arr[k].toNodePosition_[0] + s * defaultCrossStep / 2 + 15 / 2, arr[k].toNodePosition_[1] + s * defaultCrossStep * sign3 / 2 + 15 * sign3 / 2];
                                } else {
                                    node[i].fromNodePosition_ = [arr[k].toNodePosition_[0] + s * defaultCrossStep / 2, arr[k].toNodePosition_[1] - s * defaultCrossStep * sign3 / 2];
                                }
                                node[i].toNodePosition_ = [node[i].fromNodePosition_[0] - node[i].finLength_, node[i].fromNodePosition_[1]];
                                s++;
                            }
                        }
                    }
                }
            }

            /*测试输出*/
            var str = "";
            this.testSeeFinTeams = function () {
                str = str + "arr.length:" + this.FinTeamMap.keys().length + "<br>";
                var arr = this.FinTeamMap.keys();
                for (var i = 0; i < arr.length; i++) {
                    str = str + arr[i] + ":value:" + this.FinTeamMap.get(arr[i]) + "<br>";
                }
            }

            this.testSeeValues = function () {
                var arr = this.FishBoneMap.values();
                for (var i = 0; i < arr.length; i++) {
                    str = str + arr[i].toString();
                }
                document.write(str);
            }

            this.init = function () {
                this.initHtmlCanvas();
                this.initJtoPoScene();
                this.initFinModelMap();
                this.initNextLevelCount();
                this.initMainBone();
                this.initLevel2Position();
                this.initLevel3Position();
                if (options.debug) {
                    this.testSeeFinTeams();
                    this.testSeeValues();
                }
            };

            this.init();

            this.beforeRender = function () {
            };

            this.afterRender = function () {
            };

            this.render = function () {
                this.beforeRender();
                for (var i = 0; i < this.baseNodeArray.length; i++) {
                    if (this.baseNodeArray[i] != null) {
                        this.scene.add(this.baseNodeArray[i]);
                    }
                }
                var arr = this.FishBoneMap.values();
                for (var i = 0; i < arr.length; i++) {
                    if (arr[i].fromNodePosition_ && arr[i].toNodePosition_) {
                        var jNodeFrom = this.getFishBoneNode(arr[i].fromNodePosition_);
                        this.scene.add(jNodeFrom);
                        var jNodeTo = this.getFishBoneNode(arr[i].toNodePosition_);
                        this.scene.add(jNodeTo);
                        var link = this.getFishBoneLinkByNode(arr[i], jNodeFrom, jNodeTo);
                        this.scene.add(link);
                        var textNode = this.getFishTextNode(arr[i]);
                        var position = this.levelPositionArithmetic(arr[i]);
                        textNode.setLocation(position[0], position[1]);
                        this.scene.add(textNode);
                    }
                }
                this.afterRender();
            };

            this.render();

            this.stage.centerAndZoom();
            this.stage.zoomIn(0.9);
            //this.stage.centerAndZoom();
            //this.stage.zoomOut();
        }
    }
});

