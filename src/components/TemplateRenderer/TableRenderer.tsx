/**
 * 表格渲染器
 */

import React from 'react';
import { Table } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { TemplateElement, TableRow, TableCell } from '../../types/template';
import { formatFieldValue } from '../../utils/fieldFormatter';
import './TemplateRenderer.css';

interface TableRendererProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
}

export const TableRenderer: React.FC<TableRendererProps> = ({
  element,
  record,
  fields,
  table,
  onComment,
  commentStats
}) => {
  const config = element.config as any;
  const columns = config.columns || [];
  const rows = config.rows || [];
  const dataSource = config.dataSource || 'dynamic';
  const canWriteback = config.canWriteback || false;

  // 构建表格列定义
  const tableColumns = columns.map((col: any) => ({
    title: col.label,
    dataIndex: col.id,
    key: col.id,
    width: col.width,
    align: col.align || 'left'
  }));

  // 构建表格数据
  let tableData: any[] = [];

  if (dataSource === 'static' && rows.length > 0) {
    // 静态数据源：基于行配置渲染
    tableData = rows.map((row: TableRow) => {
      const rowData: any = { key: row.id };
      
      // 遍历该行的每个单元格
      row.cells.forEach((cell: TableCell) => {
        if (cell.type === 'text') {
          // 固定文本：直接使用配置的内容
          rowData[cell.columnId] = cell.content || '';
        } else if (cell.type === 'field') {
          // 字段值：从记录中读取
          if (cell.fieldId) {
            const fieldValue = record.fields[cell.fieldId];
            const field = fields.find(f => f.id === cell.fieldId);
            rowData[cell.columnId] = field 
              ? formatFieldValue(fieldValue, field.type) 
              : (fieldValue || '');
          } else if (cell.fieldPath) {
            // 如果没有 fieldId，尝试通过 fieldPath 查找
            const field = fields.find(f => f.name === cell.fieldPath);
            if (field) {
              const fieldValue = record.fields[field.id];
              rowData[cell.columnId] = formatFieldValue(fieldValue, field.type);
            } else {
              rowData[cell.columnId] = `[字段未找到: ${cell.fieldPath}]`;
            }
          } else {
            rowData[cell.columnId] = '';
          }
        }
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

  return (
    <div className="template-element template-table">
      <Table
        columns={tableColumns}
        dataSource={tableData}
        pagination={false}
        size="small"
        bordered={config.bordered !== false}
      />
    </div>
  );
};
