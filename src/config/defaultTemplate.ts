/**
 * 预设模板配置
 * 基于"凉茶萃取液-HTC8913原料品质标准"文档结构
 */

import { Template } from '../types/template';

export const DEFAULT_TEMPLATE: Template = {
  id: 'preset_quality_standard',
  name: '原料品质标准模板',
  version: '1.0.0',
  description: '预设的原料品质标准文档模板',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  elements: [
    // 标题（显示标准名称）
    {
      id: 'title',
      type: 'field',
      position: { x: 40, y: 40 },
      config: {
        fieldId: 'fldVmqTOV6',
        fieldPath: '标准名称',
        format: ''
      }
    },

    // 表头信息表格（2行3列格式，字段名：文本）
    {
      id: 'header_table',
      type: 'table',
      position: { x: 40, y: 100 },
      config: {
        columns: [
          { id: 'col1', label: '', width: 234 },
          { id: 'col2', label: '', width: 233 },
          { id: 'col3', label: '', width: 233 }
        ],
        rows: [
          {
            id: 'row1',
            cells: [
              { columnId: 'col1', type: 'field', fieldId: 'flds9HNx8J', fieldPath: '标准编号', labelPrefix: '标准编号：' },
              { columnId: 'col2', type: 'field', fieldId: 'fldL7m1ZTN', fieldPath: '版本号', labelPrefix: '版本号：' },
              { columnId: 'col3', type: 'field', fieldId: 'fldvHOFabo', fieldPath: '生效日期', labelPrefix: '生效日期：' }
            ]
          },
          {
            id: 'row2',
            cells: [
              { columnId: 'col1', type: 'field', fieldId: 'fldLwa5wPM', fieldPath: '编制人', labelPrefix: '编制人：' },
              { columnId: 'col2', type: 'field', fieldPath: '审核人', labelPrefix: '审核人：' },
              { columnId: 'col3', type: 'field', fieldId: 'fldeb7GDn5', fieldPath: '批准人', labelPrefix: '批准人：' }
            ]
          }
        ],
        dataSource: 'static',
        showHeader: false,
        bordered: true,
        canWriteback: false
      }
    },

    // 1 产品描述标题
    {
      id: 'section1_title',
      type: 'text',
      position: { x: 40, y: 260 },
      config: {
        content: '1 产品描述',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    // 产品描述表格
    {
      id: 'product_desc_table',
      type: 'table',
      position: { x: 40, y: 300 },
      config: {
        columns: [
          { id: 'col1', label: '项目', width: 210 },
          { id: 'col2', label: '内容', width: 500 }
        ],
        rows: [
          {
            id: 'row1',
            cells: [
              { columnId: 'col1', type: 'text', content: '产品名称' },
              { columnId: 'col2', type: 'field', fieldId: 'fldVmqTOV6', fieldPath: '标准名称(无版本号)' }
            ]
          },
          {
            id: 'row2',
            cells: [
              { columnId: 'col1', type: 'text', content: '物料代码' },
              { columnId: 'col2', type: 'field', fieldId: 'fldDlzdhgO', fieldPath: '原物料编码-OP' }
            ]
          },
          {
            id: 'row3',
            cells: [
              { columnId: 'col1', type: 'text', content: '生产商(需要时)' },
              { columnId: 'col2', type: 'field', fieldId: 'fldjMFd9tp', fieldPath: '生产商' }
            ]
          },
          {
            id: 'row4',
            cells: [
              { columnId: 'col1', type: 'text', content: '原料/组成' },
              { columnId: 'col2', type: 'field', fieldId: 'fldSiPQhE0', fieldPath: '原料/组成' }
            ]
          },
          {
            id: 'row5',
            cells: [
              { columnId: 'col1', type: 'text', content: '产品类型及执行标准' },
              { columnId: 'col2', type: 'field', fieldId: 'fldrLZpguj', fieldPath: '执行法规/标准（国标 or 企标）' }
            ]
          },
          {
            id: 'row6',
            cells: [
              { columnId: 'col1', type: 'text', content: '加工工艺' },
              { columnId: 'col2', type: 'field', fieldId: 'fldwxRyA4i', fieldPath: '工艺流程描述' }
            ]
          },
          {
            id: 'row7',
            cells: [
              { columnId: 'col1', type: 'text', content: '应用项目' },
              { columnId: 'col2', type: 'field', fieldId: 'fldP6R6Gu0', fieldPath: '应用项目' }
            ]
          },
          {
            id: 'row8',
            cells: [
              { columnId: 'col1', type: 'text', content: '其他要求（宣称、特殊含量要求等）' },
              { columnId: 'col2', type: 'field', fieldId: 'fldC5He4gP', fieldPath: '其他要求（宣称、特殊含量要求等）' }
            ]
          },
          {
            id: 'row9',
            cells: [
              { columnId: 'col1', type: 'text', content: '原料风险评估结果' },
              { columnId: 'col2', type: 'field', fieldId: 'fld07HNqo6', fieldPath: '原料风险评估结果' }
            ]
          }
        ],
        dataSource: 'static',
        showHeader: false,
        bordered: true,
        canWriteback: false
      }
    },

    // 2 产品标准标题
    {
      id: 'section2_title',
      type: 'text',
      position: { x: 40, y: 650 },
      config: {
        content: '2 产品标准',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    // 2.1 感官要求
    {
      id: 'section2_1_title',
      type: 'text',
      position: { x: 40, y: 690 },
      config: {
        content: '2.1 感官要求',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'quality_table',
      type: 'loop',
      position: { x: 40, y: 730 },
      config: {
        fieldId: 'fldNR0Xikc', // 关联字段：原材料标准明细
        fieldName: '原材料标准明细',
        filter: {
          fieldId: 'fldGoRS3H0', // 标准章节字段
          operator: 'equals',
          value: { id: 'optZzSGcEz', text: '感官要求' } // 筛选"感官要求"
        },
        template: [
          {
            id: 'quality_table_inner',
            type: 'table',
            position: { x: 0, y: 0 },
      config: {
        columns: [
                { id: 'col1', label: '项目', width: 110 },
                { id: 'col2', label: '要求', fieldId: 'fldpfUrXpj' },
                { id: 'col3', label: '检测方法', fieldId: 'fldeffP9dE' },
                { id: 'col4', label: '入厂检验', width: 70, fieldId: 'fldk55W8YR' },
                { id: 'col5', label: 'COA项目', width: 70, fieldId: 'fldzUl19XS' },
                { id: 'col6', label: '型式检验', width: 70, fieldId: 'fldciyYFzH' }
              ],
              rows: [],
              dataSource: 'loop',
        showHeader: true,
        bordered: true,
              canWriteback: false,
              columnConfig: {
                col1: {
                  type: 'concat',
                  fields: ['fldPVBJ4xJ', 'fldZKeDhyF'],
                  separator: ','
                }
              }
            }
          }
        ]
      }
    },

    // 2.2 理化指标要求
    {
      id: 'section2_2_title',
      type: 'text',
      position: { x: 40, y: 900 },
      config: {
        content: '2.2 理化指标要求',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'physical_table',
      type: 'loop',
      position: { x: 40, y: 940 },
      config: {
        fieldId: 'fldNR0Xikc', // 关联字段：原材料标准明细
        fieldName: '原材料标准明细',
        filter: {
          fieldId: 'fldGoRS3H0', // 标准章节字段
          operator: 'equals',
          value: { id: 'optVM51fkA', text: '理化指标要求' } // 筛选"理化指标要求"
        },
        template: [
          {
            id: 'physical_table_inner',
            type: 'table',
            position: { x: 0, y: 0 },
      config: {
        columns: [
                { id: 'col1', label: '项目', width: 110 },
                { id: 'col2', label: '要求', fieldId: 'fldpfUrXpj' },
                { id: 'col3', label: '检测方法', fieldId: 'fldeffP9dE' },
                { id: 'col4', label: '入厂检验', width: 70, fieldId: 'fldk55W8YR' },
                { id: 'col5', label: 'COA项目', width: 70, fieldId: 'fldzUl19XS' },
                { id: 'col6', label: '型式检验', width: 70, fieldId: 'fldciyYFzH' }
              ],
              rows: [],
              dataSource: 'loop',
        showHeader: true,
        bordered: true,
              canWriteback: false,
              columnConfig: {
                col1: {
                  type: 'concat',
                  fields: ['fldPVBJ4xJ', 'fldZKeDhyF'],
                  separator: ','
                }
              }
            }
          }
        ]
      }
    },

    // 2.3 微生物要求
    {
      id: 'section2_3_title',
      type: 'text',
      position: { x: 40, y: 1100 },
      config: {
        content: '2.3 微生物要求',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'microbial_table',
      type: 'loop',
      position: { x: 40, y: 1140 },
      config: {
        fieldId: 'fldNR0Xikc', // 关联字段：原材料标准明细
        fieldName: '原材料标准明细',
        filter: {
          fieldId: 'fldGoRS3H0', // 标准章节字段
          operator: 'equals',
          value: { id: 'optT1omOEM', text: '微生物要求' } // 筛选"微生物要求"
        },
        template: [
          {
            id: 'microbial_table_inner',
            type: 'table',
            position: { x: 0, y: 0 },
      config: {
        columns: [
                { id: 'col1', label: '项目', width: 110 },
                { id: 'col2', label: '要求', fieldId: 'fldpfUrXpj' },
                { id: 'col3', label: '检测方法', fieldId: 'fldeffP9dE' },
                { id: 'col4', label: '入厂检验', width: 70, fieldId: 'fldk55W8YR' },
                { id: 'col5', label: 'COA项目', width: 70, fieldId: 'fldzUl19XS' },
                { id: 'col6', label: '型式检验', width: 70, fieldId: 'fldciyYFzH' }
              ],
              rows: [],
              dataSource: 'loop',
        showHeader: true,
        bordered: true,
              canWriteback: false,
              columnConfig: {
                col1: {
                  type: 'concat',
                  fields: ['fldPVBJ4xJ', 'fldZKeDhyF'],
                  separator: ','
                }
              }
            }
          }
        ]
      }
    },

    // 2.4 污染物要求
    {
      id: 'section2_4_title',
      type: 'text',
      position: { x: 40, y: 1300 },
      config: {
        content: '2.4 污染物要求',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'pollutant_table',
      type: 'loop',
      position: { x: 40, y: 1340 },
      config: {
        fieldId: 'fldNR0Xikc', // 关联字段：原材料标准明细
        fieldName: '原材料标准明细',
        filter: {
          fieldId: 'fldGoRS3H0', // 标准章节字段
          operator: 'equals',
          value: { id: 'optqkkcmm7', text: '污染物要求' } // 筛选"污染物要求"
        },
        template: [
          {
            id: 'pollutant_table_inner',
            type: 'table',
            position: { x: 0, y: 0 },
      config: {
        columns: [
                { id: 'col1', label: '项目', width: 110 },
                { id: 'col2', label: '要求', fieldId: 'fldpfUrXpj' },
                { id: 'col3', label: '检测方法', fieldId: 'fldeffP9dE' },
                { id: 'col4', label: '入厂检验', width: 70, fieldId: 'fldk55W8YR' },
                { id: 'col5', label: 'COA项目', width: 70, fieldId: 'fldzUl19XS' },
                { id: 'col6', label: '型式检验', width: 70, fieldId: 'fldciyYFzH' }
              ],
              rows: [],
              dataSource: 'loop',
        showHeader: true,
        bordered: true,
              canWriteback: false,
              columnConfig: {
                col1: {
                  type: 'concat',
                  fields: ['fldPVBJ4xJ', 'fldZKeDhyF'],
                  separator: ','
                }
              }
            }
          }
        ]
      }
    },

    // 2.5 食品添加剂要求
    {
      id: 'section2_5_title',
      type: 'text',
      position: { x: 40, y: 1500 },
      config: {
        content: '2.5 食品添加剂要求',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'additive_table',
      type: 'loop',
      position: { x: 40, y: 1540 },
      config: {
        fieldId: 'fldNR0Xikc', // 关联字段：原材料标准明细
        fieldName: '原材料标准明细',
        filter: {
          fieldId: 'fldGoRS3H0', // 标准章节字段
          operator: 'equals',
          value: { id: 'optvwJGYFa', text: '食品添加剂要求' } // 筛选"食品添加剂要求"
        },
        template: [
          {
            id: 'additive_table_inner',
            type: 'table',
            position: { x: 0, y: 0 },
      config: {
        columns: [
                { id: 'col1', label: '项目', width: 110 },
                { id: 'col2', label: '要求', fieldId: 'fldpfUrXpj' },
                { id: 'col3', label: '检测方法', fieldId: 'fldeffP9dE' },
                { id: 'col4', label: '入厂检验', width: 70, fieldId: 'fldk55W8YR' },
                { id: 'col5', label: 'COA项目', width: 70, fieldId: 'fldzUl19XS' },
                { id: 'col6', label: '型式检验', width: 70, fieldId: 'fldciyYFzH' }
              ],
              rows: [],
              dataSource: 'loop',
        showHeader: true,
        bordered: true,
              canWriteback: false,
              columnConfig: {
                col1: {
                  type: 'concat',
                  fields: ['fldPVBJ4xJ', 'fldZKeDhyF'],
                  separator: ','
                }
              }
            }
          }
        ]
      }
    },

    // 2.6 致敏物质信息
    {
      id: 'section2_6_title',
      type: 'text',
      position: { x: 40, y: 1700 },
      config: {
        content: '2.6 致敏物质信息',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'allergen_field',
      type: 'field',
      position: { x: 40, y: 1740 },
      config: {
        fieldId: 'fldNL9B304',
        fieldPath: ''
      }
    },

    // 3 其他要求
    {
      id: 'section3_title',
      type: 'text',
      position: { x: 40, y: 1800 },
      config: {
        content: '3 其他要求',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'packaging_table',
      type: 'table',
      position: { x: 40, y: 1840 },
      config: {
        columns: [
          { id: 'col1', label: '项目', width: 200 },
          { id: 'col2', label: '内容', width: 500 }
        ],
        rows: [
          {
            id: 'row1',
            cells: [
              { columnId: 'col1', type: 'text', content: '包装方式' },
              { columnId: 'col2', type: 'field', fieldId: 'fldSqB8rwr' }
            ]
          },
          {
            id: 'row2',
            cells: [
              { columnId: 'col1', type: 'text', content: '产品标识' },
              { columnId: 'col2', type: 'field', fieldId: 'fld8bRAyOk' }
            ]
          },
          {
            id: 'row3',
            cells: [
              { columnId: 'col1', type: 'text', content: '运输方式' },
              { columnId: 'col2', type: 'field', fieldId: 'fldywwVH5x' }
            ]
          },
          {
            id: 'row4',
            cells: [
              { columnId: 'col1', type: 'text', content: '储存要求' },
              { columnId: 'col2', type: 'field', fieldId: 'fldxMEFLou' }
            ]
          },
          {
            id: 'row5',
            cells: [
              { columnId: 'col1', type: 'text', content: '保质期' },
              { columnId: 'col2', type: 'field', fieldId: 'fld0pJl6ru' }
            ]
          },
          {
            id: 'row6',
            cells: [
              { columnId: 'col1', type: 'text', content: '使用前处理要求' },
              { columnId: 'col2', type: 'field', fieldId: 'fld94mwz19' }
            ]
          },
          {
            id: 'row7',
            cells: [
              { columnId: 'col1', type: 'text', content: '开封后储存要求' },
              { columnId: 'col2', type: 'field', fieldId: 'fldk9bOS7l' }
            ]
          }
        ],
        dataSource: 'static',
        showHeader: false,
        bordered: true,
        canWriteback: false
      }
    },

    // 附表一：标准变更记录
    {
      id: 'appendix1_title',
      type: 'text',
      position: { x: 40, y: 2100 },
      config: {
        content: '附表一：标准变更记录',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'change_record_loop',
      type: 'loop',
      position: { x: 40, y: 2140 },
      config: {
        fieldId: 'fldRs7xX9U', // 主表中关联到"标准变更记录"表的字段
        fieldName: '标准变更记录',
        template: [
          {
            id: 'change_record_table_inner',
            type: 'table',
            position: { x: 0, y: 0 },
            config: {
              columns: [
                { id: 'col1', label: '序号', width: 45, fieldId: 'fldpBu4ESO' },
                { id: 'col2', label: '替代版本号', width: 80, fieldId: 'fldNmCZ5RT' },
                { id: 'col3', label: '变更日期', width: 100, fieldId: 'fld2Rz5f7b', format: 'date' },
                { id: 'col4', label: '变更内容', fieldId: 'fldTvZwqB2' },
                { id: 'col5', label: '变更原因', fieldId: 'fldeDy48rL' },
                { id: 'col6', label: '修订人', width: 60, fieldId: 'fldTtVRn5i' }
              ],
              rows: [],
              dataSource: 'loop',
              showHeader: true,
              bordered: true,
              canWriteback: true
            }
          }
        ]
      }
    },

    // 附表二：检测方法
    {
      id: 'appendix2_title',
      type: 'text',
      position: { x: 40, y: 2350 },
      config: {
        content: '附表二：检测方法',
        fontSize: 14,
        fontWeight: 'bold'
      }
    },

    {
      id: 'test_method_field',
      type: 'link',
      position: { x: 40, y: 2390 },
      config: {
        fieldId: 'fldqSJFqY9', // 方法中的附件（引用字段，超链接）
        fieldPath: '方法中的附件'
      }
    }
  ],
  styles: {
    pageWidth: 794,
    pageHeight: 2500,
    margin: {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    }
  }
};

