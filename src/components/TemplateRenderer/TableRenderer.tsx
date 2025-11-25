/**
 * 表格渲染器
 * 支持双击编辑字段值并回写到多维表格
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Table, Toast } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import { TemplateElement, TableRow, TableCell } from '../../types/template';
import { formatFieldValue, isFieldEditable } from '../../utils/fieldFormatter';
import { FieldEditor } from '../FieldEditor';
import './TemplateRenderer.css';

interface TableRendererProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
  onFieldChange?: (fieldId: string, newValue: any, oldValue: any) => void;
}

/**
 * 可编辑字段白名单
 * 只有这些字段可以在画布上双击编辑
 */
const EDITABLE_FIELD_WHITELIST = new Set([
  'fldSiPQhE0', // 原料/组成
  'fldwxRyA4i', // 加工工艺
  'fldC5He4gP', // 其他要求（宣称、特殊含量要求等）
  'fldSqB8rwr', // 包装方式
  'fld8bRAyOk', // 产品标识
  'fldywwVH5x', // 运输方式
  'fldxMEFLou', // 储存要求
  'fld94mwz19', // 使用前处理要求
  'fldk9bOS7l', // 开封后储存要求
]);

/**
 * 判断字段是否在可编辑白名单中
 */
function isFieldInWhitelist(fieldId: string): boolean {
  return EDITABLE_FIELD_WHITELIST.has(fieldId);
}

/**
 * 从复杂值中提取可编辑的文本
 */
function extractEditableText(value: any, fieldType: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // 对于文本类型，如果是数组，提取文本内容
  if (fieldType === FieldType.Text || fieldType === FieldType.Url || 
      fieldType === FieldType.Email || fieldType === FieldType.Phone ||
      fieldType === FieldType.Barcode) {
    if (Array.isArray(value)) {
      // 飞书文本字段可能返回 [{type: 'text', text: '...'}] 格式
      return value.map(v => {
        if (typeof v === 'object' && v !== null) {
          return v.text || v.name || v.value || '';
        }
        return String(v || '');
      }).join('');
    }
    if (typeof value === 'object' && value !== null) {
      return value.text || value.name || value.value || '';
    }
    return String(value || '');
  }
  
  // 数字类型
  if (fieldType === FieldType.Number || fieldType === FieldType.Currency || fieldType === FieldType.Progress) {
    if (typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && first !== null) {
        return String(first.text || first.value || first.name || '');
      }
      return String(first || '');
    }
    return String(value || '');
  }
  
  // 单选类型
  if (fieldType === FieldType.SingleSelect) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return value.text || value.name || '';
    }
    return '';
  }
  
  // 多选类型
  if (fieldType === FieldType.MultiSelect) {
    if (Array.isArray(value)) {
      return value.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.text || v.name || '';
      }).filter(Boolean).join(', ');
    }
    return '';
  }
  
  // 其他类型使用 formatFieldValue
  return formatFieldValue(value, fieldType);
}

export const TableRenderer: React.FC<TableRendererProps> = ({
  element,
  record,
  fields,
  table,
  onComment,
  commentStats,
  onFieldChange
}) => {
  const config = element.config as any;
  const columns = config.columns || [];
  const rows = config.rows || [];
  const dataSource = config.dataSource || 'dynamic';
  
  // 存储字段的显示值（已格式化的字符串）
  const [displayValues, setDisplayValues] = useState<Map<string, string>>(new Map());
  // 存储字段的原始值（用于编辑时的初始值和回写）
  const [rawValues, setRawValues] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  
  // 编辑状态
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string; fieldId: string; fieldType: FieldType } | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const editingCellRef = useRef<HTMLDivElement | null>(null);

  // 异步加载字段值
  useEffect(() => {
    if (!table || !record || dataSource !== 'static' || rows.length === 0) {
      return;
    }

    const loadFieldValues = async () => {
      setLoading(true);
      const rawMap = new Map<string, any>();
      const displayMap = new Map<string, string>();
      
      // 收集所有需要加载的字段ID和对应的字段类型
      const fieldsToLoad: { fieldId: string; fieldType: FieldType }[] = [];
      rows.forEach((row: TableRow) => {
        row.cells.forEach((cell: TableCell) => {
          if (cell.type === 'field' && cell.fieldId) {
            const field = fields.find(f => f.id === cell.fieldId);
            if (field) {
              fieldsToLoad.push({ fieldId: cell.fieldId, fieldType: field.type });
            }
          }
        });
      });

      // 批量加载字段值
      try {
        for (const { fieldId, fieldType } of fieldsToLoad) {
          try {
            // 先从 record.fields 读取，如果没有则使用 getCellValue
            let value = record.fields?.[fieldId];
            if (value === undefined && table) {
              value = await table.getCellValue(fieldId, record.recordId);
            }
            
            rawMap.set(fieldId, value);
            // 提取显示文本
            const displayText = extractEditableText(value, fieldType);
            displayMap.set(fieldId, displayText);
            
          } catch (error) {
            console.error(`[TableRenderer] 加载字段值失败: ${fieldId}`, error);
            rawMap.set(fieldId, null);
            displayMap.set(fieldId, '');
          }
        }
      } catch (error) {
        console.error('[TableRenderer] 批量加载字段值失败:', error);
      }
      
      setRawValues(rawMap);
      setDisplayValues(displayMap);
      setLoading(false);
    };

    loadFieldValues();
  }, [table, record?.recordId, rows, dataSource, fields]);

  // 保存并退出编辑
  const handleSaveAndExit = useCallback(() => {
    if (editingCell && onFieldChange && editingValue !== null) {
      const oldValue = rawValues.get(editingCell.fieldId) ?? record.fields?.[editingCell.fieldId];
      // 获取初始显示文本（编辑开始时的值）
      const oldDisplayText = displayValues.get(editingCell.fieldId) || '';
      
      // 比较显示文本，只有真正改变时才调用变更回调
      // 注意：editingValue 是字符串，oldDisplayText 也是字符串，直接比较
      const hasChanged = String(editingValue || '').trim() !== String(oldDisplayText || '').trim();
      
      if (hasChanged) {
        console.log('[TableRenderer] 字段值已改变，触发更新', { 
          fieldId: editingCell.fieldId, 
          oldDisplayText,
          newValue: editingValue 
        });
        
        // 调用变更回调
        onFieldChange(editingCell.fieldId, editingValue, oldValue);
        
        // 更新本地显示值
        setDisplayValues(prev => {
          const next = new Map(prev);
          // 编辑后的值就是字符串，直接使用
          next.set(editingCell.fieldId, String(editingValue || ''));
          return next;
        });
        
        // 更新原始值（用于下次编辑）
        setRawValues(prev => {
          const next = new Map(prev);
          next.set(editingCell.fieldId, editingValue);
          return next;
        });
      } else {
        console.log('[TableRenderer] 字段值未改变，跳过更新', { 
          fieldId: editingCell.fieldId, 
          value: editingValue 
        });
      }
    }
    setEditingCell(null);
    setEditingValue(null);
  }, [editingCell, editingValue, onFieldChange, rawValues, record, displayValues]);

  // 注意：不再使用点击外部检测，改用 onBlur 事件
  // 这样可以避免与飞书 SDK 的事件处理冲突

  // 开始编辑单元格
  const handleStartEdit = (rowId: string, columnId: string, fieldId: string, fieldType: FieldType) => {
    // 使用已格式化的显示值作为编辑初始值
    const displayText = displayValues.get(fieldId) || '';
    console.log('[TableRenderer] 双击编辑', { 
      rowId, columnId, fieldId, 
      displayText,
      fieldType,
      hasOnFieldChange: !!onFieldChange 
    });
    if (onFieldChange) {
      setEditingCell({ rowId, columnId, fieldId, fieldType });
      setEditingValue(displayText);
    }
  };

  // 渲染单元格内容
  const renderCellContent = (
    cell: TableCell, 
    row: TableRow, 
    columnId: string
  ): React.ReactNode => {
    if (cell.type === 'text') {
      // 固定文本：不可编辑
      return cell.content || '';
    }
    
    if (cell.type === 'field' && cell.fieldId) {
      const field = fields.find(f => f.id === cell.fieldId);
      if (!field) {
        return `[字段未找到: ${cell.fieldId}]`;
      }
      
      const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === columnId;
      // 只有在白名单中的字段才可编辑
      const editable = isFieldInWhitelist(cell.fieldId) && isFieldEditable(field.type) && !!onFieldChange;
      
      // 使用已格式化的显示值
      const displayText = displayValues.get(cell.fieldId) || '';
      
      if (isEditing) {
        return (
          <div ref={editingCellRef} className="table-cell-editing">
            <FieldEditor
              type={field.type}
              value={editingValue}
              onChange={setEditingValue}
              onBlur={handleSaveAndExit}
              fieldMeta={field}
            />
          </div>
        );
      }
      
      return (
        <div 
          className={`table-cell-field ${editable ? 'table-cell-editable' : ''}`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (editable) {
              handleStartEdit(row.id, columnId, cell.fieldId!, field.type);
            } else {
              // 双击不可编辑字段时显示提示
              Toast.warning('系统关联字段，不可编辑，或联系管理员');
            }
          }}
          title={editable ? '双击编辑' : '系统关联字段，不可编辑'}
        >
          {displayText || <span className="table-cell-empty">空</span>}
        </div>
      );
    }
    
    return '[字段未配置]';
  };

  // 构建表格列定义（带自定义渲染）
  const tableColumns = columns.map((col: any) => ({
        title: col.label,
        dataIndex: col.id,
        key: col.id,
        width: col.width,
    align: col.align || 'left',
    render: (text: any, rowData: any) => {
      // 查找对应的行和单元格配置
      const row = rows.find((r: TableRow) => r.id === rowData.key);
      if (!row) return text;
      
      const cell = row.cells.find((c: TableCell) => c.columnId === col.id);
      if (!cell) return text;
      
      return renderCellContent(cell, row, col.id);
    }
  }));

  // 构建表格数据
  let tableData: any[] = [];

  if (dataSource === 'static' && rows.length > 0) {
    // 静态数据源：基于行配置渲染
    tableData = rows.map((row: TableRow) => {
      const rowData: any = { key: row.id };
      
      // 遍历该行的每个单元格，只设置 key，实际内容由 render 函数处理
      row.cells.forEach((cell: TableCell) => {
        rowData[cell.columnId] = cell.columnId; // 占位，实际渲染由 render 函数处理
      });
      
      return rowData;
    });
  } else {
    // 动态数据源（旧版兼容）：所有字段平铺为一行
    tableData = [{
    key: record.recordId,
      ...Object.fromEntries(
        columns.map((col: any) => {
          if (col.type === 'fixed') {
            return [col.id, col.label];
          } else if (col.fieldId) {
            const fieldValue = record.fields[col.fieldId];
            const field = fields.find(f => f.id === col.fieldId);
            return [col.id, field ? formatFieldValue(fieldValue, field.type) : fieldValue];
          }
          return [col.id, ''];
        })
      )
  }];
  }

  const showHeader = config.showHeader !== false;

  return (
    <div className="template-element template-table">
      <Table
        columns={tableColumns}
        dataSource={tableData}
        pagination={false}
        size="small"
        bordered={config.bordered !== false}
        showHeader={showHeader}
      />
    </div>
  );
};
