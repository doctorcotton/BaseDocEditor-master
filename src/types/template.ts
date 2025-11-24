/**
 * 模板相关类型定义
 */

import { IFieldMeta, FieldType } from '@lark-base-open/js-sdk';

/**
 * 模板数据结构
 */
export interface Template {
  id: string;
  name: string;
  version: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  elements: TemplateElement[];
  styles: TemplateStyles;
}

/**
 * 模板元素
 */
export interface TemplateElement {
  id: string;
  type: 'text' | 'field' | 'loop' | 'table' | 'image' | 'link';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  config: ElementConfig;
}

/**
 * 元素配置（根据类型不同）
 */
export type ElementConfig =
  | TextElementConfig
  | FieldElementConfig
  | LoopAreaConfig
  | TableElementConfig
  | ImageElementConfig
  | LinkElementConfig;

/**
 * 固定文本元素配置
 */
export interface TextElementConfig {
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * 字段占位符元素配置
 */
export interface FieldElementConfig {
  fieldPath: string; // 字段路径，如 "字段名" 或 "关联表.字段名"
  fieldId?: string; // 字段ID（用于快速查找）
  format?: string; // 格式化选项
}

/**
 * 循环区域配置
 */
export interface LoopAreaConfig {
  fieldId: string; // 关联字段ID
  fieldName: string; // 关联字段名称
  filter?: FilterCondition; // 筛选条件
  template: TemplateElement[]; // 循环区域内的模板元素
}

/**
 * 筛选条件
 */
export interface FilterCondition {
  fieldPath: string; // 筛选字段路径
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains'; // 操作符
  value: any; // 筛选值
}

/**
 * 表格元素配置
 */
export interface TableElementConfig {
  columns: TableColumn[];
  rows?: TableRow[]; // 行配置（用于静态多行表格）
  dataSource?: 'static' | 'dynamic'; // 数据来源：static=配置的行，dynamic=记录字段
  showHeader?: boolean; // 是否显示表头
  bordered?: boolean; // 是否显示边框
  canWriteback: boolean; // 是否支持反写
}

/**
 * 表格列配置
 */
export interface TableColumn {
  id: string;
  type?: 'field' | 'fixed'; // 字段列或固定列（兼容旧版）
  fieldId?: string; // 字段ID（字段列）
  fieldPath?: string; // 字段路径
  label: string; // 列标题
  width?: number; // 列宽
  align?: 'left' | 'center' | 'right';
}

/**
 * 表格行配置
 */
export interface TableRow {
  id: string;
  cells: TableCell[]; // 该行的所有单元格
}

/**
 * 表格单元格配置
 */
export interface TableCell {
  columnId: string; // 对应哪一列
  type: 'text' | 'field'; // 固定文本 or 字段值
  content?: string; // type=text 时的文本内容
  fieldId?: string; // type=field 时的字段ID
  fieldPath?: string; // type=field 时的字段路径
}

/**
 * 图片元素配置
 */
export interface ImageElementConfig {
  fieldId: string; // 附件字段ID
  fieldPath: string; // 字段路径
  width?: number; // 图片宽度
  height?: number; // 图片高度
}

/**
 * 超链接元素配置
 */
export interface LinkElementConfig {
  fieldId: string; // URL字段或文本字段ID
  fieldPath: string; // 字段路径
  text?: string; // 链接文本（如果字段是URL，显示此文本）
}

/**
 * 模板样式配置
 */
export interface TemplateStyles {
  fontSize?: number; // 默认字号
  fontFamily?: string; // 字体
  lineHeight?: number; // 行高
  pageWidth?: number; // 页面宽度
  pageHeight?: number; // 页面高度
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * 字段路径解析结果
 */
export interface FieldPathResult {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
  fieldMeta?: IFieldMeta;
  isLinked: boolean; // 是否来自关联字段
  linkPath?: string[]; // 关联路径
}

