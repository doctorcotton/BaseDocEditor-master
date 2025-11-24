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
    // 标题
    {
      id: 'title',
      type: 'text',
      position: { x: 40, y: 40 },
      config: {
        content: '原料品质标准',
        fontSize: 24,
        fontWeight: 'bold',
        align: 'center'
      }
    },

    // 表头信息表格
    {
      id: 'header_table',
      type: 'table',
      position: { x: 40, y: 100 },
      config: {
        columns: [
          { id: 'col1', label: '标准编号', width: 200 },
          { id: 'col2', label: '版本号', width: 200 },
          { id: 'col3', label: '生效日期', width: 200 }
        ],
        rows: [
          {
            id: 'row1',
            cells: [
              { columnId: 'col1', type: 'field', fieldPath: '标准编号' },
              { columnId: 'col2', type: 'field', fieldPath: '版本号' },
              { columnId: 'col3', type: 'field', fieldPath: '生效日期' }
            ]
          }
        ],
        dataSource: 'static',
        showHeader: true,
        bordered: true,
        canWriteback: false
      }
    },

    // 第二行：编制人、审核人、批准人
    {
      id: 'header_table_2',
      type: 'table',
      position: { x: 40, y: 180 },
      config: {
        columns: [
          { id: 'col1', label: '编制人', width: 200 },
          { id: 'col2', label: '审核人', width: 200 },
          { id: 'col3', label: '批准人', width: 200 }
        ],
        rows: [
          {
            id: 'row1',
            cells: [
              { columnId: 'col1', type: 'field', fieldPath: '编制人' },
              { columnId: 'col2', type: 'field', fieldPath: '审核人' },
              { columnId: 'col3', type: 'field', fieldPath: '批准人' }
            ]
          }
        ],
        dataSource: 'static',
        showHeader: true,
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
        fontSize: 18,
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
          { id: 'col1', label: '项目', width: 200 },
          { id: 'col2', label: '内容', width: 500 }
        ],
        rows: [
          {
            id: 'row1',
            cells: [
              { columnId: 'col1', type: 'text', content: '产品名称' },
              { columnId: 'col2', type: 'field', fieldPath: '产品名称' }
            ]
          },
          {
            id: 'row2',
            cells: [
              { columnId: 'col1', type: 'text', content: '物料代码' },
              { columnId: 'col2', type: 'field', fieldPath: '物料代码' }
            ]
          },
          {
            id: 'row3',
            cells: [
              { columnId: 'col1', type: 'text', content: '生产商(需要时)' },
              { columnId: 'col2', type: 'field', fieldPath: '生产商' }
            ]
          },
          {
            id: 'row4',
            cells: [
              { columnId: 'col1', type: 'text', content: '原料/组成' },
              { columnId: 'col2', type: 'field', fieldPath: '原料组成' }
            ]
          },
          {
            id: 'row5',
            cells: [
              { columnId: 'col1', type: 'text', content: '产品类型及执行标准' },
              { columnId: 'col2', type: 'field', fieldPath: '产品类型及执行标准' }
            ]
          },
          {
            id: 'row6',
            cells: [
              { columnId: 'col1', type: 'text', content: '加工工艺' },
              { columnId: 'col2', type: 'field', fieldPath: '加工工艺' }
            ]
          },
          {
            id: 'row7',
            cells: [
              { columnId: 'col1', type: 'text', content: '应用项目' },
              { columnId: 'col2', type: 'field', fieldPath: '应用项目' }
            ]
          },
          {
            id: 'row8',
            cells: [
              { columnId: 'col1', type: 'text', content: '其他要求（宣称、特殊含量要求等）' },
              { columnId: 'col2', type: 'field', fieldPath: '其他要求' }
            ]
          },
          {
            id: 'row9',
            cells: [
              { columnId: 'col1', type: 'text', content: '原料风险评估结果' },
              { columnId: 'col2', type: 'field', fieldPath: '原料风险评估结果' }
            ]
          }
        ],
        dataSource: 'static',
        showHeader: true,
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
        fontSize: 18,
        fontWeight: 'bold'
      }
    },

    // 2.1 质量要求
    {
      id: 'section2_1_title',
      type: 'text',
      position: { x: 40, y: 690 },
      config: {
        content: '2.1 质量要求',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'quality_table',
      type: 'table',
      position: { x: 40, y: 730 },
      config: {
        columns: [
        ],
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 2.2 理化指标要求
    {
      id: 'section2_2_title',
      type: 'text',
      position: { x: 40, y: 900 },
      config: {
        content: '2.2 理化指标要求',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'physical_table',
      type: 'table',
      position: { x: 40, y: 940 },
      config: {
        columns: [
        ],
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 2.3 微生物要求
    {
      id: 'section2_3_title',
      type: 'text',
      position: { x: 40, y: 1100 },
      config: {
        content: '2.3 微生物要求',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'microbial_table',
      type: 'table',
      position: { x: 40, y: 1140 },
      config: {
        columns: [
        ],
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 2.4 污染物要求
    {
      id: 'section2_4_title',
      type: 'text',
      position: { x: 40, y: 1300 },
      config: {
        content: '2.4 污染物要求',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'pollutant_table',
      type: 'table',
      position: { x: 40, y: 1340 },
      config: {
        columns: [
        ],
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 2.5 食品添加剂要求
    {
      id: 'section2_5_title',
      type: 'text',
      position: { x: 40, y: 1500 },
      config: {
        content: '2.5 食品添加剂要求',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'additive_table',
      type: 'table',
      position: { x: 40, y: 1540 },
      config: {
        columns: [
        ],
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 2.6 致敏物质信息
    {
      id: 'section2_6_title',
      type: 'text',
      position: { x: 40, y: 1700 },
      config: {
        content: '2.6 致敏物质信息',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'allergen_text',
      type: 'text',
      position: { x: 40, y: 1740 },
      config: {
        content: '[过敏原信息]',
        fontSize: 14
      }
    },

    // 3 产品标准
    {
      id: 'section3_title',
      type: 'text',
      position: { x: 40, y: 1800 },
      config: {
        content: '3 产品标准',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },

    {
      id: 'packaging_table',
      type: 'table',
      position: { x: 40, y: 1840 },
      config: {
        columns: [
        ],
        rows: [],
        dataSource: 'dynamic',
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 附表一：标准变更记录
    {
      id: 'appendix1_title',
      type: 'text',
      position: { x: 40, y: 2100 },
      config: {
        content: '附表一：标准变更记录',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'change_record_table',
      type: 'table',
      position: { x: 40, y: 2140 },
      config: {
        columns: [
        ],
        showHeader: true,
        bordered: true,
        canWriteback: true
      }
    },

    // 附表二：检测方法
    {
      id: 'appendix2_title',
      type: 'text',
      position: { x: 40, y: 2350 },
      config: {
        content: '附表二：检测方法',
        fontSize: 16,
        fontWeight: 'bold'
      }
    },

    {
      id: 'test_method_field',
      type: 'field',
      position: { x: 40, y: 2390 },
      config: {
        fieldPath: '检测方法详情'
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

