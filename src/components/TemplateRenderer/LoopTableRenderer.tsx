/**
 * 循环区域表格渲染器
 * 用于在循环区域中渲染表格，多条关联记录作为数据源
 * 支持双击编辑：要求（文本）、检测方法（单选）、入厂检验/COA项目/型式检验（勾选）
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Input, Select, Toast } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import dayjs from 'dayjs';
import { TemplateElement } from '../../types/template';
import { formatFieldValue } from '../../utils/fieldFormatter';
import './TemplateRenderer.css';

/**
 * 勾选字段ID集合
 * 这些字段在表格中显示为复选框样式，可以点击切换
 */
const CHECKBOX_FIELD_IDS = new Set([
  'fldk55W8YR', // 入厂检验
  'fldzUl19XS', // COA项目
  'fldciyYFzH'  // 型式检验
]);

/**
 * 可编辑字段ID集合
 * 只有这些字段可以在表格中双击编辑
 */
const EDITABLE_FIELD_IDS = new Set([
  'fldpfUrXpj', // 要求（文本）
  'fldeffP9dE', // 检测方法（单选）
  'fldk55W8YR', // 入厂检验（勾选）
  'fldzUl19XS', // COA项目（勾选）
  'fldciyYFzH'  // 型式检验（勾选）
]);

/**
 * 判断字段是否为勾选字段
 */
function isCheckboxField(fieldId: string): boolean {
  return CHECKBOX_FIELD_IDS.has(fieldId);
}

/**
 * 判断字段是否可编辑
 */
function isEditableField(fieldId: string): boolean {
  return EDITABLE_FIELD_IDS.has(fieldId);
}

/**
 * 判断值是否为勾选状态
 * 支持多种格式：布尔值、字符串"是"/"√"/"true"、数组等
 */
function isChecked(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '是' || v === '√' || v === '✓' || v === 'true' || v === '1' || v === 'yes';
  }
  // 飞书复选框字段可能返回数组格式
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    // 检查第一个元素
    const first = value[0];
    if (typeof first === 'object' && first !== null) {
      // 可能是 { text: '是' } 或 { name: '是' } 格式
      const text = first.text || first.name || first.value || '';
      return isChecked(text);
    }
    return isChecked(first);
  }
  // 对象格式
  if (typeof value === 'object') {
    const text = value.text || value.name || value.value || '';
    return isChecked(text);
  }
  return false;
}

/**
 * 从文本数组中提取纯文本
 */
function extractTextFromValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(v => {
      if (typeof v === 'object' && v !== null) {
        return v.text || v.name || v.value || '';
      }
      return String(v || '');
    }).join('');
  }
  if (typeof value === 'object') {
    return value.text || value.name || value.value || '';
  }
  return String(value);
}

interface LoopTableRendererProps {
  element: TemplateElement;
  records: IRecord[];
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
  onFieldChange?: (recordId: string, fieldId: string, newValue: any, oldValue: any) => void;
}

export const LoopTableRenderer: React.FC<LoopTableRendererProps> = ({
  element,
  records,
  fields,
  table,
  onComment,
  commentStats,
  onFieldChange
}) => {
  const config = element.config as any;
  const columns = config.columns || [];
  const columnConfig = config.columnConfig || {};
  const [fieldValuesMap, setFieldValuesMap] = useState<Map<string, Map<string, any>>>(new Map());
  
  // 编辑状态
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const editingCellRef = useRef<HTMLDivElement | null>(null);

  // 异步加载字段值
  useEffect(() => {
    if (!table || records.length === 0) {
      return;
    }

    const loadFieldValues = async () => {
      const valueMap = new Map<string, Map<string, any>>();
      
      // 收集所有需要加载的字段ID，并验证字段是否存在于关联表中
      const fieldIdsToLoad = new Set<string>();
      // 创建字段ID到字段元数据的映射，用于快速查找
      const validFieldIds = new Set(fields.map(f => f.id));
      
      columns.forEach((col: any) => {
        if (col.fieldId && validFieldIds.has(col.fieldId)) {
          fieldIdsToLoad.add(col.fieldId);
        }
        // 检查是否有列配置需要拼接字段
        if (columnConfig[col.id] && columnConfig[col.id].fields) {
          columnConfig[col.id].fields.forEach((fieldId: string) => {
            // 只添加在关联表中存在的字段
            if (validFieldIds.has(fieldId)) {
              fieldIdsToLoad.add(fieldId);
            }
          });
        }
      });

      // 如果没有需要加载的字段，直接返回
      if (fieldIdsToLoad.size === 0) {
        console.log('[LoopTableRenderer] 没有需要加载的有效字段');
        setFieldValuesMap(valueMap);
        return;
      }

      // 批量加载字段值
      try {
        for (const record of records) {
          const recordValueMap = new Map<string, any>();
          
          for (const fieldId of fieldIdsToLoad) {
            try {
              // 优先从 record.fields 读取
              let value = record.fields?.[fieldId];
              if (value === undefined && table) {
                // 只有当字段在关联表中存在时才调用 API
                value = await table.getCellValue(fieldId, record.recordId);
              }
              recordValueMap.set(fieldId, value);
            } catch (error) {
              // 静默处理单个字段加载失败，不打印错误日志
              recordValueMap.set(fieldId, null);
            }
          }
          
          valueMap.set(record.recordId, recordValueMap);
        }
      } catch (error) {
        console.error('[LoopTableRenderer] 批量加载字段值失败:', error);
      }
      
      setFieldValuesMap(valueMap);
    };

    loadFieldValues();
  }, [table, records, columns, columnConfig, fields]);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingCell || saving) return;
    
    const { recordId, fieldId } = editingCell;
    const field = fields.find(f => f.id === fieldId);
    if (!field) {
      setEditingCell(null);
      setEditingValue(null);
      return;
    }

    // 获取旧值
    const recordFieldValues = fieldValuesMap.get(recordId);
    const oldValue = recordFieldValues?.get(fieldId);
    
    // 比较值是否有变化
    let hasChanged = false;
    let newValueToSave = editingValue;
    
    if (isCheckboxField(fieldId)) {
      // 勾选字段：比较布尔值
      const oldChecked = isChecked(oldValue);
      const newChecked = editingValue;
      hasChanged = oldChecked !== newChecked;
      newValueToSave = newChecked;
    } else if (field.type === FieldType.SingleSelect) {
      // 单选字段：比较选项ID
      const oldId = oldValue?.id || oldValue;
      const newId = editingValue?.id || editingValue;
      hasChanged = oldId !== newId;
      newValueToSave = editingValue;
    } else {
      // 文本字段：比较字符串
      const oldText = extractTextFromValue(oldValue);
      const newText = String(editingValue || '').trim();
      hasChanged = oldText.trim() !== newText;
      newValueToSave = newText;
    }

    if (hasChanged && onFieldChange) {
      setSaving(true);
      try {
        // 调用回调保存到多维表格
        await onFieldChange(recordId, fieldId, newValueToSave, oldValue);
        
        // 更新本地值
        setFieldValuesMap(prev => {
          const newMap = new Map(prev);
          const recordMap = new Map(newMap.get(recordId) || new Map());
          recordMap.set(fieldId, newValueToSave);
          newMap.set(recordId, recordMap);
          return newMap;
        });
        
        Toast.success(`已更新`);
      } catch (error: any) {
        console.error('[LoopTableRenderer] 保存失败:', error);
        Toast.error(`保存失败: ${error.message || '未知错误'}`);
      } finally {
        setSaving(false);
      }
    }

    setEditingCell(null);
    setEditingValue(null);
  }, [editingCell, editingValue, fieldValuesMap, fields, onFieldChange, saving]);

  // 开始编辑
  const handleStartEdit = useCallback((recordId: string, fieldId: string) => {
    if (!onFieldChange) return;
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const recordFieldValues = fieldValuesMap.get(recordId);
    const rawValue = recordFieldValues?.get(fieldId);

    if (isCheckboxField(fieldId)) {
      // 勾选字段：直接切换状态并保存
      const currentChecked = isChecked(rawValue);
      const newChecked = !currentChecked;
      
      // 直接保存
      onFieldChange(recordId, fieldId, newChecked, rawValue);
      
      // 更新本地值
      setFieldValuesMap(prev => {
        const newMap = new Map(prev);
        const recordMap = new Map(newMap.get(recordId) || new Map());
        recordMap.set(fieldId, newChecked);
        newMap.set(recordId, recordMap);
        return newMap;
      });
      
      Toast.success(`已${newChecked ? '勾选' : '取消勾选'}`);
    } else {
      // 其他字段：进入编辑模式
      if (field.type === FieldType.SingleSelect) {
        setEditingValue(rawValue);
      } else {
        // 文本字段：提取纯文本
        setEditingValue(extractTextFromValue(rawValue));
      }
      setEditingCell({ recordId, fieldId });
    }
  }, [fields, fieldValuesMap, onFieldChange]);

  // 渲染复选框（可点击）
  const renderEditableCheckbox = (checked: boolean, recordId: string, fieldId: string) => {
    const canEdit = onFieldChange && isEditableField(fieldId);
    return (
      <span 
        className={`loop-table-checkbox ${checked ? 'checked' : ''} ${canEdit ? 'clickable' : ''}`}
        onClick={canEdit ? (e) => {
          e.stopPropagation();
          handleStartEdit(recordId, fieldId);
        } : undefined}
        title={canEdit ? '点击切换' : undefined}
      >
        {checked && <span className="checkmark">✓</span>}
      </span>
    );
  };

  // 渲染文本编辑器
  const renderTextEditor = (recordId: string, fieldId: string) => {
    return (
      <div ref={editingCellRef} className="loop-table-cell-editing">
        <Input
          value={editingValue || ''}
          onChange={(val) => setEditingValue(val)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            } else if (e.key === 'Escape') {
              setEditingCell(null);
              setEditingValue(null);
            }
          }}
          autoFocus
          size="small"
          style={{ width: '100%' }}
        />
      </div>
    );
  };

  // 渲染单选编辑器
  const renderSelectEditor = (recordId: string, fieldId: string, field: IFieldMeta) => {
    const options = (field.property as any)?.options || [];
    return (
      <div ref={editingCellRef} className="loop-table-cell-editing loop-table-select-editing">
        <Select
          value={editingValue?.id || editingValue}
          onChange={(val) => {
            const option = options.find((opt: any) => opt.id === val);
            setEditingValue(option || val);
            // 选择后自动保存
            setTimeout(() => {
              if (option) {
                handleSaveEdit();
              }
            }, 100);
          }}
          onBlur={handleSaveEdit}
          autoFocus
          size="default"
          style={{ width: '100%', minWidth: 180 }}
          filter
          placeholder="搜索选项..."
          dropdownStyle={{ maxHeight: 300 }}
          optionList={options.map((opt: any) => ({
            value: opt.id,
            label: opt.name || opt.text,
          }))}
        />
      </div>
    );
  };

  // 固定列宽配置（总宽度 700px，与其他表格对齐）
  // 110 + 110 + 270 + 70 + 70 + 70 = 700
  const FIXED_COLUMN_WIDTHS: Record<string, number> = {
    col1: 110,  // 项目
    col2: 110,  // 要求
    col3: 270,  // 检测方法
    col4: 70,   // 入厂检验
    col5: 70,   // COA项目
    col6: 70,   // 型式检验
  };

  // 构建表格列定义
  const tableColumns = columns.map((col: any) => {
    // 检查是否为勾选字段列
    const isCheckboxColumn = col.fieldId && isCheckboxField(col.fieldId);
    const isEditable = col.fieldId && isEditableField(col.fieldId);
    
    // 使用固定列宽
    const columnWidth = FIXED_COLUMN_WIDTHS[col.id] || col.width;
    
    return {
    title: col.label,
    dataIndex: col.id,
    key: col.id,
      width: columnWidth,
      // 勾选列居中显示
      align: isCheckboxColumn ? 'center' as const : (col.align || 'left'),
      // 自定义渲染
      render: (text: any, rowData: any) => {
        const recordId = rowData.key;
        const fieldId = col.fieldId;
        const field = fields.find(f => f.id === fieldId);
        const recordFieldValues = fieldValuesMap.get(recordId);
        const rawValue = recordFieldValues?.get(fieldId);
        
        // 检查是否正在编辑此单元格
        const isEditing = editingCell?.recordId === recordId && editingCell?.fieldId === fieldId;
        
        if (isCheckboxColumn) {
          // 勾选列
          const checked = rawValue !== undefined ? isChecked(rawValue) : isChecked(text);
          return renderEditableCheckbox(checked, recordId, fieldId);
        }
        
        if (isEditing && field) {
          // 编辑模式
          if (field.type === FieldType.SingleSelect) {
            return renderSelectEditor(recordId, fieldId, field);
          } else {
            return renderTextEditor(recordId, fieldId);
          }
        }
        
        // 普通显示模式
        const displayText = text || '';
        
        if (isEditable && onFieldChange) {
          return (
            <div
              className="loop-table-cell-editable"
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartEdit(recordId, fieldId);
              }}
              title="双击编辑"
            >
              {displayText || <span className="loop-table-cell-empty">-</span>}
            </div>
          );
        }
        
        return displayText;
      }
    };
  });

  // 构建表格数据
  const tableData = records.map((record: IRecord) => {
    const rowData: any = { key: record.recordId };
    const recordFieldValues = fieldValuesMap.get(record.recordId) || new Map();
    
    columns.forEach((col: any) => {
      // 检查是否有列配置需要拼接字段
      if (columnConfig[col.id] && columnConfig[col.id].type === 'concat') {
        const concatConfig = columnConfig[col.id];
        const fieldIds = concatConfig.fields || [];
        const separator = concatConfig.separator || ',';
        
        const values = fieldIds.map((fieldId: string) => {
          let value = recordFieldValues.get(fieldId);
          if (value === undefined) {
            value = record.fields?.[fieldId];
          }
          const field = fields.find(f => f.id === fieldId);
          return field ? formatFieldValue(value, field.type) : '';
        }).filter(Boolean);
        
        rowData[col.id] = values.join(separator);
      } else if (col.fieldId) {
        // 普通字段
        let value = recordFieldValues.get(col.fieldId);
        if (value === undefined) {
          value = record.fields?.[col.fieldId];
        }
        const field = fields.find(f => f.id === col.fieldId);
        if (field) {
          let formattedValue = formatFieldValue(value, field.type);
          
          // 如果列配置了 format: 'date'，只显示日期部分
          if (col.format === 'date' && value) {
            if (typeof value === 'number') {
              formattedValue = dayjs(value).format('YYYY-MM-DD');
            } else if (typeof value === 'string') {
              // 如果是日期时间字符串，只取日期部分
              const dateMatch = formattedValue.match(/^\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                formattedValue = dateMatch[0];
              }
            }
          }
          
          rowData[col.id] = formattedValue;
        } else {
          rowData[col.id] = '';
        }
      } else {
        rowData[col.id] = '';
      }
    });
    
    return rowData;
  });

  const showHeader = config.showHeader !== false;

  // 计算表格总宽度
  const totalWidth = Object.values(FIXED_COLUMN_WIDTHS).reduce((sum, w) => sum + w, 0);

  return (
    <div className="template-element template-table" style={{ width: totalWidth }}>
      <Table
        columns={tableColumns}
        dataSource={tableData}
        pagination={false}
        size="small"
        bordered={config.bordered !== false}
        showHeader={showHeader}
        style={{ width: totalWidth }}
      />
    </div>
  );
};

