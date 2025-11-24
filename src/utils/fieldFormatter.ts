/**
 * 字段值格式化工具
 */

import { FieldType } from '@lark-base-open/js-sdk';
import dayjs from 'dayjs';

/**
 * 根据字段类型格式化显示值
 */
export function formatFieldValue(value: any, fieldType: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }

  // 处理对象类型，避免显示 [object Object]
  if (typeof value === 'object' && !Array.isArray(value)) {
    // 尝试提取常见的显示字段
    if (value.text) return String(value.text);
    if (value.name) return String(value.name);
    if (value.en_name) return String(value.en_name);
    if (value.title) return String(value.title);
    if (value.label) return String(value.label);
    // 如果是空对象，返回空字符串
    if (Object.keys(value).length === 0) return '';
  }

  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Barcode:
    case FieldType.Email:
    case FieldType.Phone:
    case FieldType.Url:
      return String(value || '');

    case FieldType.Number:
      return typeof value === 'number' ? value.toString() : String(value || '');

    case FieldType.Currency:
      return typeof value === 'number' ? `¥${value.toFixed(2)}` : String(value || '');

    case FieldType.Progress:
      return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : String(value || '');

    case FieldType.DateTime:
      if (typeof value === 'number') {
        return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
      }
      if (typeof value === 'string') {
        return value;
      }
      return '';

    case FieldType.SingleSelect:
      if (typeof value === 'string') return value;
      return value?.text || value?.name || '';

    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        return value.map((v: any) => {
          if (typeof v === 'string') return v;
          return v.text || v.name || '';
        }).filter(Boolean).join(', ');
      }
      return '';

    case FieldType.Checkbox:
      return value ? '✓' : '';

    case FieldType.User:
      if (Array.isArray(value)) {
        return value.map((u: any) => {
          if (typeof u === 'string') return u;
          return u.name || u.en_name || u.id || '';
        }).filter(Boolean).join(', ');
      }
      if (typeof value === 'string') return value;
      return value?.name || value?.en_name || value?.id || '';

    case FieldType.Attachment:
      if (Array.isArray(value)) {
        const fileNames = value.map((a: any) => a.name || a.filename || '').filter(Boolean);
        if (fileNames.length > 0) {
          return fileNames.join(', ');
        }
        return `${value.length} 个附件`;
      }
      if (typeof value === 'object' && value.name) {
        return value.name;
      }
      return value ? '1 个附件' : '';

    case FieldType.SingleLink:
    case FieldType.DuplexLink:
      if (Array.isArray(value)) {
        return value.map((link: any) => {
          if (typeof link === 'string') return link;
          return link.text || link.name || link.id || '';
        }).filter(Boolean).join(', ');
      }
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        return value.text || value.name || value.id || '';
      }
      return '';

    case FieldType.Location:
      if (typeof value === 'object') {
        return value.address || value.location || '';
      }
      return String(value || '');

    case FieldType.GroupChat:
      if (Array.isArray(value)) {
        return value.map((g: any) => g.name || g.en_name || '').filter(Boolean).join(', ');
      }
      return value?.name || value?.en_name || '';

    case FieldType.Formula:
    case FieldType.Lookup:
      // 公式和查找引用字段可能返回各种类型
      if (Array.isArray(value)) {
        return value.map(v => formatFieldValue(v, FieldType.Text)).join(', ');
      }
      if (typeof value === 'object') {
        return value.text || value.name || JSON.stringify(value);
      }
      return String(value || '');

    default:
      // 默认处理：尝试转换为字符串
      if (Array.isArray(value)) {
        return value.map(v => {
          if (typeof v === 'object') {
            return v.text || v.name || v.label || '';
          }
          return String(v);
        }).filter(Boolean).join(', ');
      }
      if (typeof value === 'object') {
        return value.text || value.name || value.label || JSON.stringify(value);
      }
      return String(value || '');
  }
}

/**
 * 判断字段类型是否可编辑
 */
export function isFieldEditable(fieldType: FieldType): boolean {
  const nonEditableTypes = [
    FieldType.Formula,
    FieldType.Lookup,
    FieldType.AutoNumber,
    FieldType.CreatedTime,
    FieldType.CreatedUser,
    FieldType.ModifiedTime,
    FieldType.ModifiedUser,
  ];
  
  return !nonEditableTypes.includes(fieldType);
}

/**
 * 获取字段类型的显示名称
 */
export function getFieldTypeName(fieldType: FieldType): string {
  const typeNames: Record<number, string> = {
    [FieldType.Text]: '文本',
    [FieldType.Number]: '数字',
    [FieldType.SingleSelect]: '单选',
    [FieldType.MultiSelect]: '多选',
    [FieldType.DateTime]: '日期时间',
    [FieldType.Checkbox]: '复选框',
    [FieldType.User]: '人员',
    [FieldType.Phone]: '电话',
    [FieldType.Url]: '链接',
    [FieldType.Attachment]: '附件',
    [FieldType.Email]: '邮箱',
    [FieldType.Currency]: '货币',
    [FieldType.Progress]: '进度',
    [FieldType.Barcode]: '条形码',
    [FieldType.Formula]: '公式',
    [FieldType.Lookup]: '查找引用',
    [FieldType.AutoNumber]: '自动编号',
  };
  
  return typeNames[fieldType] || '未知';
}

