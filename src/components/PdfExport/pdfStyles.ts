/**
 * PDF样式配置
 * 定义PDF文档的样式，包括页面边距、文本样式、表格样式等
 */

import { StyleSheet } from '@react-pdf/renderer';
import { CHINESE_FONT_FAMILY } from '../../utils/pdfFonts';

// 转换 mm 到 pt (1mm = 2.834645669pt)
const mmToPt = (mm: number) => mm * 2.834645669;

export const pdfStyles = StyleSheet.create({
  // 页面样式
  page: {
    fontFamily: CHINESE_FONT_FAMILY,
    fontSize: 10,
    paddingTop: mmToPt(17),
    paddingBottom: mmToPt(17),
    paddingLeft: mmToPt(12),
    paddingRight: mmToPt(12),
    backgroundColor: '#ffffff',
  },
  
  // 内容容器
  content: {
    flex: 1,
  },
  
  // 文本元素
  text: {
    marginBottom: 8,
    lineHeight: 1.6,
  },
  
  // 字段元素
  field: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  fieldLabel: {
    fontWeight: 700,  // bold
    minWidth: 80,
    marginRight: 8,
  },
  
  fieldValue: {
    flex: 1,
  },
  
  // 标题样式（特殊字段）
  title: {
    fontSize: 22,
    fontWeight: 700,  // bold
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // 表格样式
  table: {
    marginBottom: 16,
    width: '100%',
  },
  
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
  },
  
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderBottomStyle: 'solid',
  },
  
  tableCell: {
    padding: 6,
    fontSize: 11,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    borderRightStyle: 'solid',
    textAlign: 'left',
    wordWrap: 'break-word',
  },
  
  tableHeaderCell: {
    padding: 6,
    fontSize: 11,
    fontWeight: 700,  // bold
    borderRightWidth: 1,
    borderRightColor: '#333',
    borderRightStyle: 'solid',
    textAlign: 'center',
  },
  
  // 第一列靠左对齐
  tableFirstCell: {
    textAlign: 'left',
  },
  
  // 最后一列不显示右边框
  tableLastCell: {
    borderRightWidth: 0,
  },
  
  // 表格外边框
  tableBorder: {
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'solid',
  },
  
  // 循环区域
  loopArea: {
    marginBottom: 16,
  },
  
  loopItem: {
    marginBottom: 12,
  },
  
  // 超链接样式
  link: {
    color: '#0066cc',
    textDecoration: 'underline',
  },
  
  // 图片样式
  image: {
    marginBottom: 12,
    maxWidth: '100%',
    objectFit: 'contain',
  },
  
  // 空值提示
  emptyValue: {
    color: '#999',
    // fontStyle: 'italic',  // 暂时移除斜体，因为字体不支持
  },
  
  // 打印时间戳
  printTimestamp: {
    position: 'absolute',
    right: 40,
    bottom: 30,
    fontSize: 10,
    color: '#666',
  },
});

