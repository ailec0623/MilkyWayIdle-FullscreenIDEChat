/**
 * Excel风格生成器
 * 从NGA优化摸鱼体验脚本中提取的Excel模式相关代码
 * 
 * 功能特性：
 * - 支持多种Excel主题（腾讯文档、WPS、Office）
 * - 可自定义Excel标题
 * - 支持左列序号自定义
 * - 完整的Excel界面模拟
 */

/**
 * Excel模块
 * @name ExcelMode
 * @description 此模块提供了可以快捷键切换Excel模式
 *              以及一个高级配置可选更改Excel左侧序号的类型
 */
const ExcelMode = {
    name: 'ExcelMode',
    title: 'Excel模式',
    settings: [{
        shortCutCode: 82, // R
        type: 'normal',
        key: 'excelMode',
        default: false,
        title: 'Excel模式',
        menu: 'left'
    }, {
        type: 'advanced',
        key: 'excelTheme',
        default: 'tencent',
        options: [{
            label: '腾讯文档',
            value: 'tencent'
        }, {
            label: 'WPS',
            value: 'wps'
        }, {
            label: 'Office',
            value: 'office'
        }],
        title: 'Excel皮肤',
        desc: 'Excel的皮肤\n腾云文档是矢量图形绘制，适应各种分辨率，不会失真，推荐优先使用\nWPS与Office为图片拼接而成，分辨率为1080P，高于此分辨率可能会失真',
        menu: 'left'
    }, {
        type: 'advanced',
        key: 'excelNoMode',
        default: false,
        title: 'Excel左列序号',
        desc: 'Excel最左列的显示序号，此策略为尽可能的更像Excel\n选中时: Excel最左栏为从1开始往下，逐行+1\n取消时: Excel最左栏为原始的回帖数\n*此功能仅在贴列表有效',
        menu: 'left'
    }, {
        type: 'advanced',
        key: 'excelTitle',
        default: '工作簿1',
        title: 'Excel覆盖标题',
        desc: 'Excel模式下标签栏的名称, 如留空, 则显示原始标题',
        menu: 'left'
    }],
    beforeUrl: window.location.href,
    
    /**
     * 初始化函数
     */
    initFunc() {
        // 生成列标题字母列表
        const columnLetters = () => {
            let capital = []
            let columnLetters = []
            for (let i=65;i<91;i++) capital.push(String.fromCharCode(i))
            Array('', 'A', 'B', 'C').forEach(n => capital.forEach(c => columnLetters.push(`${n}${c}`)))
            return columnLetters
        }
        
        if (script.setting.advanced.excelTheme == 'tencent') {
            // 腾讯文档元素
            // 插入Excel头部
            $('body').append(`
            <div class="hld__excel-div hld__excel-header">
                <div class="hld__excel-titlebar">
                    <div class="hld__excel-titlebar-content hld__excel-icon24" style="margin:2px 2px 2px 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_1')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div style="height: 24px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 12px;vertical-align: middle;"></div>
                    <div class="hld__excel-titlebar-title"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon16" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_3')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon16" style="margin-left: 12px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_4')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon16" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_5')});"></div>
                    <div style="margin-left: 5px;font-size: 12px;line-height: 20px;height: 18px;;color: #000;opacity: 0.48;font-weight:400;">上次修改是在2小时前进行的</div>
                    <div style="flex-grow: 1;"></div>
                    <div style="height: 24px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 12px;vertical-align: middle;"></div>
                    <div style="width:28px;height:28px;border-radius: 4px;background: #e9e9e9;text-align: center;line-height: 32px;">🐟︎</div>
                </div>
                <div class="hld__excel-toolbar">
                    ${Array.from({length: 4}, (_, i) => '<div class="hld__excel-titlebar-content hld__excel-icon20" style="margin:0 6px;background-image:url(' + getExcelTheme(script.setting.advanced.excelTheme, "icon_"+(10+i)) + ');"></div>').join('')}
                    <div style="height: 16px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 4px;vertical-align: middle;"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 8px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_14')});"></div>
                    <div style="padding: 0 2px;">插入</div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div style="height: 16px;border-right: 1px solid rgb(0, 0, 0);opacity: 0.06;margin: 0 8px;vertical-align: middle;"></div>
                    <div style="padding: 0 30px 0 4px;">常规</div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 12px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_15')});"></div>
                    <div style="margin-left: 1px;">
                        <div class="hld__excel-titlebar-content hld__excel-icon12" style="transform: rotate(180deg);background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                        <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    </div>
                    <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 4px;vertical-align: middle;"></div>
                    <div style="padding: 0 4px 0 16px;">默认字体</div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div style="padding: 0 4px 0 13px;">10</div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_16')});"></div>
                    <div class="hld__excel-titlebar-pick">
                        <div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_17')});"></div>
                        <div class="hld__excel-titlebar-indication" style="background-color: #000;"></div>
                    </div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div class="hld__excel-titlebar-pick">
                        <div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_18')});"></div>
                        <div class="hld__excel-titlebar-indication" style="background-color: #8cddfa;"></div>
                    </div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_19')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 2px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_20')});"></div>
                    <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
                    ${Array.from({length: 4}, (_, i) => '<div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(' + getExcelTheme(script.setting.advanced.excelTheme, "icon_"+(21+i)) + ');"></div><div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 2px;margin-right: '+ (i==3?'0':'10') +'px;background-image:url(' + getExcelTheme(script.setting.advanced.excelTheme, "icon_2") + ');"></div>').join('')}
                    <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_25')});"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
                    ${Array.from({length: 4}, (_, i) => '<div class="hld__excel-titlebar-content hld__excel-icon20" style="background-image:url(' + getExcelTheme(script.setting.advanced.excelTheme, "icon_"+(26+i)) + ');"></div><div class="hld__excel-titlebar-content hld__excel-icon12" style="margin-left: 2px;margin-right: '+ (i==3?'0':'10') +'px;background-image:url(' + getExcelTheme(script.setting.advanced.excelTheme, "icon_2") + ');"></div>').join('')}
                    <div style="height: 16px;border-right: 1px solid #000;opacity: 0.06;margin: 0 10px;vertical-align: middle;"></div>
                    <div class="hld__excel-titlebar-content hld__excel-icon20" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_20')});"></div>
                    <div style="flex-grow: 1;"></div>
                </div>
                <div class="hld__excel-formulabar">
                    <div style="border-right: 1px solid #e0e2e4;color: #777;text-align: center;width: 50px;font-size: 12px;height: 25px;line-height: 25px;font-weight:400;">A1</div>
                </div>
                <div class="hld__excel-h4">
                    <div class="hld__excel-sub"><div></div></div>
                    ${(columnLetters().map(c => '<div class="hld__excel-column">'+c+'</div>')).join('')}
                </div>
            </div>
            `)
            // 插入Excel尾部
            $('body').append(`
                <div class="hld__excel-div hld__excel-footer">
                    <div class="hld__excel-icon24" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_33')});"></div>
                    <div class="hld__excel-icon24" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_34')});"></div>
                    <div class="hld__excel-sheet-tab">
                        <div class="hld__excel-sheet-name">
                            <div>工作表1</div>
                            <div class="hld__excel-icon12" style="margin-left: 4px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                        </div>
                        <div class="hld__excel-sheet-underblock"></div>
                    </div>
                    <div style="flex-grow: 1;"></div>
                    <div class="hld__excel-icon24" style="margin-left: 10px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_35')});"></div>
                    <div class="hld__excel-icon12" style="margin-left: 2px;background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_2')});"></div>
                    <div style="height: 16px;border-right: 1px solid #000;opacity: 0.12;margin: 0 10px;vertical-align: middle;"></div>
                    <div class="hld__excel-icon24" style="background-image:url(${getExcelTheme(script.setting.advanced.excelTheme, 'icon_36')});"></div>
                    <div class="hld__excel-footer-item" style="font-size: 20px;margin-left:20px;">-</div>
                    <div class="hld__excel-footer-item" style="font-weight: 400">100%</div>
                    <div class="hld__excel-footer-item" style="font-size: 20px;">+</div>
                    <div style="width:10px;"></div>
                </div>
            `)
        } else {
            // WPS与Office元素
            // 插入Excel头部
            $('body').append(`
                <div class="hld__excel-div hld__excel-header">
                    <div class="hld__excel-h1">
                        <div class="hld__excel-title">${script.setting.advanced.excelTitle || document.title} - Excel</div>
                        <img class="hld__excel-img-h1-l1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'H_L_1')}">
                        <img class="hld__excel-img-h1-r1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'H_R_1')}">
                    </div>
                    <div class="hld__excel-h2">
                        <img class="hld__excel-img-h2-l1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'H_L_2')}">
                        <img class="hld__excel-img-h2-r1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'H_R_2')}">
                    </div>
                    <div class="hld__excel-h3">
                        <img class="hld__excel-img-h3-l1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'H_L_3')}">
                        <img class="hld__excel-img-h3-r1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'H_R_3')}">
                        <div class="hld__excel-fx"></div>
                    </div>
                    <div class="hld__excel-h4">
                        <div class="hld__excel-sub"><div></div></div>
                        ${(columnLetters().map(c => '<div class="hld__excel-column">'+c+'</div>')).join('')}
                    </div>
                </div>
            `)
            // 插入Excel尾部
            $('body').append(`
                <div class="hld__excel-div hld__excel-footer">
                    <div class="hld__excel-f1">
                        <img class="hld__excel-img-f1-l1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'F_L_1')}">
                        <img class="hld__excel-img-f1-r1" src="${getExcelTheme(script.setting.advanced.excelTheme, 'F_R_1')}">
                    </div>
                    <div class="hld__excel-f2">
                    <img class="hld__excel-img-fl2" src="${getExcelTheme(script.setting.advanced.excelTheme, 'F_L_2')}">
                    <img class="hld__excel-img-fr2" src="${getExcelTheme(script.setting.advanced.excelTheme, 'F_R_2')}">
                    </div>
                </div>
            `)
        }

        $('#hld__excel_setting').click(()=>$('#hld__setting_cover').css('display', 'block'))
        $('#mainmenu .half').parent().append($('#mainmenu .half').clone(true).addClass('hld__half-clone').text($('#mainmenu .half').text().replace('你好', '')))
        if(script.setting.normal.excelMode) {
            if(this.beforeUrl.includes('thread.php') || this.beforeUrl.includes('read.php')) {
                this.switchExcelMode()
            }
        }
    },
    
    /**
     * 全程渲染函数
     */
    renderAlwaysFunc($el) {
        $('.hld__excel-theme-' + script.setting.advanced.excelTheme).length == 0 && $('body').addClass('hld__excel-theme-' + script.setting.advanced.excelTheme)
        if(script.setting.normal.excelMode && window.location.href != this.beforeUrl) {
            this.beforeUrl = window.location.href
            if(this.beforeUrl.includes('thread.php') || this.beforeUrl.includes('read.php')) {
                $('.hld__excel-body').length == 0 && $('body').addClass('hld__excel-body')
            }else {
                $('.hld__excel-body').length > 0 && $('body').removeClass('hld__excel-body')
            }
            $('body').toggleClass('hld__excel-original-no', !script.setting.advanced.excelNoMode)
        }
        if(script.setting.normal.excelMode && $('.hld__excel-body').length > 0 && $('#mmc').length == 0) {
            $('body').addClass('hld__excel-body-err')
        }else {
            $('body').removeClass('hld__excel-body-err')
        }
        // Excel Title
        if ($('.hld__excel-body').length > 0) {
            const excelTitle = script.setting.advanced.excelTitle
            if (excelTitle) {
                $(document).attr('title') != excelTitle && $(document).attr('title', excelTitle)
            }
            $('.hld__excel-titlebar-title').html(excelTitle || $(document).attr('title'))
            $('#hld__excel_icon').length == 0 && $('head').append(`<link id= "hld__excel_icon" rel="shortcut icon" type="image/png" href="${IMG_EXCEL_ICON}" />`)
        }
    },
    
    /**
     * 详情页渲染函数
     */
    renderFormsFunc($el) {
        $el.find('.postrow>td:first-child').before('<td class="c0"></td>')
    },
    
    /**
     * 快捷键功能
     */
    shortcutFunc: {
        excelMode() {
            if (script.setting.normal.excelMode || script.setting.advanced.dynamicEnable) {
                this.switchExcelMode()
                script.popNotification($('.hld__excel-body').length > 0 ? 'Excel模式' : '普通模式')
            }
        }
    },
    
    /**
     * 切换Excel模式
     * @method switchExcelMode
     */
    switchExcelMode: () => {
        $('body').toggleClass('hld__excel-body')
        !script.setting.advanced.excelNoMode && $('body').addClass('hld__excel-original-no')
        script.setting.normal.darkMode && script.popMsg('Excel模式与暗黑模式不兼容, 请勿重合使用', 'warn')
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelMode;
}