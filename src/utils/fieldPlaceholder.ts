/**
 * 字段占位符解析工具
 * 支持解析 [字段名] 和 [关联表.字段名] 格式
 */

import { IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import { FieldPathResult } from '../types/template';

/**
 * 解析字段路径
 * 支持格式：
 * - "字段名"
 * - "关联表.字段名"
 * - "关联表.嵌套关联表.字段名"
 */
export function parseFieldPath(
  fieldPath: string,
  fields: IFieldMeta[],
  linkedFields?: Map<string, IFieldMeta[]>
): FieldPathResult | null {
  const parts = fieldPath.split('.');
  
  if (parts.length === 1) {
    // 简单字段：直接在当前表格中查找
    const field = fields.find(f => f.name === parts[0]);
    if (!field) {
      return null;
    }
    
    return {
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.type,
      fieldMeta: field,
      isLinked: false
    };
  } else {
    // 关联字段：需要遍历关联路径
    // TODO: 实现关联字段的解析
    // 这需要获取关联字段的元数据，然后查找关联表中的字段
    console.warn('关联字段解析暂未实现:', fieldPath);
    return null;
  }
}

/**
 * 替换模板中的字段占位符
 * 格式：[字段名] 或 [关联表.字段名]
 */
export function replaceFieldPlaceholders(
  template: string,
  record: any,
  fields: IFieldMeta[],
  fieldValueMap?: Map<string, any>
): string {
  // 匹配 [字段名] 或 [关联表.字段名] 格式
  const placeholderRegex = /\[([^\]]+)\]/g;
  
  return template.replace(placeholderRegex, (match, fieldPath) => {
    const fieldResult = parseFieldPath(fieldPath.trim(), fields);
    if (!fieldResult) {
      return match; // 找不到字段，保持原样
    }
    
    // 从记录中获取字段值
    const value = fieldValueMap?.get(fieldResult.fieldId) || 
                  record.fields?.[fieldResult.fieldId];
    
    // 格式化值
    return formatFieldValue(value, fieldResult.fieldType);
  });
}

/**
 * 格式化字段值
 */
function formatFieldValue(value: any, fieldType: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
    case FieldType.Phone:
    case FieldType.Email:
      return String(value);
      
    case FieldType.Number:
      return typeof value === 'number' ? value.toString() : String(value);
      
    case FieldType.SingleSelect:
      return value?.text || value?.name || '';
      
    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        return value.map((v: any) => v.text || v.name || '').join(', ');
      }
      return '';
      
    case FieldType.Checkbox:
      return value ? '是' : '否';
      
    case FieldType.DateTime:
      if (typeof value === 'number') {
        return new Date(value).toLocaleString('zh-CN');
      }
      return String(value);
      
    case FieldType.User:
      if (Array.isArray(value)) {
        return value.map((u: any) => u.name || '').join(', ');
      }
      return value?.name || '';
      
    default:
      return String(value);
  }
}

/**
 * 提取模板中的所有字段占位符
 */
export function extractFieldPlaceholders(template: string): string[] {
  const placeholderRegex = /\[([^\]]+)\]/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(template)) !== null) {
    placeholders.push(match[1].trim());
  }
  
  return [...new Set(placeholders)]; // 去重
}

