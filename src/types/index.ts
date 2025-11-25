/**
 * BaseDocEditor 类型定义
 */

import { IRecord, IFieldMeta, FieldType } from '@lark-base-open/js-sdk';

// 重新导出 SDK 类型
export type { IRecord, IFieldMeta };
export { FieldType };

/**
 * 字段修改记录
 */
export interface FieldChange {
  recordId: string;
  fieldId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  count?: number;
  error?: string;
  timestamp: number;
}

/**
 * 评论数据
 */
export interface Comment {
  id: string;
  recordId: string;
  fieldId: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: number;
  resolved: boolean;
  parentId?: string; // 回复的评论ID
}

/**
 * 草稿数据
 */
export interface DraftData {
  data: any;
  timestamp: number;
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  recordId: string;
  fieldId: string;
  ourValue: any;
  theirValue: any;
  baseValue: any;
}

/**
 * 表格选择器数据
 */
export interface TableInfo {
  id: string;
  name: string;
}

/**
 * 字段渲染属性
 */
export interface FieldRendererProps {
  record: IRecord;
  field: IFieldMeta;
  value: any;
  isChanged: boolean;
  onEdit: (value: any) => void;
  onComment?: () => void;
}

/**
 * 字段编辑器属性
 */
export interface FieldEditorProps {
  type: FieldType;
  value: any;
  onChange: (value: any) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onBlur?: () => void;
  fieldMeta?: IFieldMeta;
}

