/**
 * 循环区域筛选逻辑
 */

import { IRecord, IFieldMeta, FieldType, bitable } from '@lark-base-open/js-sdk';
import { FilterCondition } from '../types/template';

/**
 * 根据筛选条件过滤记录
 */
export function filterRecords(
  records: IRecord[],
  filter: FilterCondition,
  fields: IFieldMeta[]
): IRecord[] {
  if (!filter) {
    return records;
  }
  
  // 查找筛选字段：优先使用 fieldId，如果没有则使用 fieldPath（兼容旧数据）
  let filterField = null;
  if (filter.fieldId) {
    filterField = fields.find(f => f.id === filter.fieldId);
  } else if (filter.fieldPath) {
    filterField = fields.find(f => f.name === filter.fieldPath);
  }
  
  if (!filterField) {
    console.warn('筛选字段不存在:', filter.fieldId || filter.fieldPath);
    return records;
  }
  
  return records.filter(record => {
    const fieldValue = record.fields[filterField.id];
    return matchesCondition(fieldValue, filter, filterField.type);
  });
}

/**
 * 检查字段值是否匹配筛选条件
 */
function matchesCondition(
  value: any,
  condition: FilterCondition,
  fieldType: FieldType
): boolean {
  const conditionValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return isEqual(value, conditionValue, fieldType);
      
    case 'notEquals':
      return !isEqual(value, conditionValue, fieldType);
      
    case 'contains':
      return contains(value, conditionValue, fieldType);
      
    case 'notContains':
      return !contains(value, conditionValue, fieldType);
      
    default:
      return true;
  }
}

/**
 * 判断两个值是否相等
 */
function isEqual(value: any, conditionValue: any, fieldType: FieldType): boolean {
  if (value === null || value === undefined) {
    return conditionValue === null || conditionValue === undefined || conditionValue === '';
  }
  
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
    case FieldType.Phone:
    case FieldType.Email:
      return String(value).trim() === String(conditionValue).trim();
      
    case FieldType.Number:
      return Number(value) === Number(conditionValue);
      
    case FieldType.SingleSelect:
      // 处理单选字段：支持对象和字符串比较
      const selectValue = value?.id || value?.text || value?.name || value || '';
      const conditionSelectValue = conditionValue?.id || conditionValue?.text || conditionValue?.name || conditionValue || '';
      return String(selectValue) === String(conditionSelectValue);
      
    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        const texts = value.map((v: any) => v.text || v.name || '');
        return texts.includes(String(conditionValue));
      }
      return false;
      
    case FieldType.Checkbox:
      return Boolean(value) === Boolean(conditionValue);
      
    default:
      return String(value) === String(conditionValue);
  }
}

/**
 * 判断值是否包含条件值
 */
function contains(value: any, conditionValue: any, fieldType: FieldType): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  const valueStr = String(value).toLowerCase();
  const conditionStr = String(conditionValue).toLowerCase();
  
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
    case FieldType.Phone:
    case FieldType.Email:
      return valueStr.includes(conditionStr);
      
    case FieldType.SingleSelect:
      const selectText = (value?.text || value?.name || '').toLowerCase();
      return selectText.includes(conditionStr);
      
    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        const texts = value.map((v: any) => (v.text || v.name || '').toLowerCase());
        return texts.some(text => text.includes(conditionStr));
      }
      return false;
      
    default:
      return valueStr.includes(conditionStr);
  }
}

/**
 * 获取关联记录（双向引用或单项引用）
 */
export async function getLinkedRecords(
  table: any,
  recordId: string,
  linkFieldId: string
): Promise<IRecord[]> {
  try {
    // 获取关联字段的值（可能是记录ID数组）
    const linkValue = await table.getCellValue(linkFieldId, recordId);
    
    if (!linkValue) {
      return [];
    }
    
    // 如果是数组，获取所有关联记录
    if (Array.isArray(linkValue)) {
      const recordIds = linkValue.map((item: any) => 
        typeof item === 'string' ? item : item.recordId || item.id
      );
      
      if (recordIds.length === 0) {
        return [];
      }
      
      // 批量获取记录
      const linkedTable = await getLinkedTable(table, linkFieldId);
      if (!linkedTable) {
        return [];
      }
      
      const records = await linkedTable.getRecordsByIds(recordIds);
      return records.map((recordValue: any, index: number) => ({
        recordId: recordIds[index],
        fields: recordValue
      }));
    }
    
    // 单个关联记录
    const linkedTable = await getLinkedTable(table, linkFieldId);
    if (!linkedTable) {
      return [];
    }
    
    const linkedRecordId = typeof linkValue === 'string' ? linkValue : linkValue.recordId || linkValue.id;
    const recordValue = await linkedTable.getRecordById(linkedRecordId);
    
    return [{
      recordId: linkedRecordId,
      fields: recordValue
    }];
  } catch (error) {
    console.error('获取关联记录失败:', error);
    return [];
  }
}

/**
 * 获取关联表
 */
async function getLinkedTable(table: any, linkFieldId: string): Promise<any> {
  try {
    const field = await table.getFieldById(linkFieldId);
    const fieldMeta = await field.getMeta();
    
    // 获取关联表的ID
    const linkedTableId = fieldMeta.property?.tableId;
    if (!linkedTableId) {
      console.warn('[getLinkedTable] 未找到关联表ID', { linkFieldId, fieldMeta });
      return null;
    }
    
    // 使用 bitable.base 获取关联表
    return await bitable.base.getTable(linkedTableId);
  } catch (error) {
    console.error('[getLinkedTable] 获取关联表失败:', error);
    return null;
  }
}

