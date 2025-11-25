/**
 * 表格行编辑器
 * 用于配置表格的行和单元格内容
 */

import React, { useState } from 'react';
import { Button, Input, Radio, RadioGroup, Card, Space, TextArea } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconArrowUp, IconArrowDown } from '@douyinfe/semi-icons';
import { IFieldMeta } from '@lark-base-open/js-sdk';
import { TableColumn, TableRow, TableCell } from '../../types/template';
import { FieldSelector } from '../FieldSelector/FieldSelector';
import './TableEditor.css';

interface TableRowEditorProps {
  columns: TableColumn[];
  rows: TableRow[];
  fields: IFieldMeta[];
  onChange: (rows: TableRow[]) => void;
}

export const TableRowEditor: React.FC<TableRowEditorProps> = ({
  columns,
  rows,
  fields,
  onChange
}) => {
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);

  // 添加行
  const handleAddRow = () => {
    const newRow: TableRow = {
      id: `row_${Date.now()}`,
      cells: columns.map(col => ({
        columnId: col.id,
        type: 'text',
        content: ''
      }))
    };
    onChange([...rows, newRow]);
  };

  // 删除行
  const handleDeleteRow = (rowId: string) => {
    onChange(rows.filter(r => r.id !== rowId));
  };

  // 上移行
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRows = [...rows];
    [newRows[index - 1], newRows[index]] = [newRows[index], newRows[index - 1]];
    onChange(newRows);
  };

  // 下移行
  const handleMoveDown = (index: number) => {
    if (index === rows.length - 1) return;
    const newRows = [...rows];
    [newRows[index], newRows[index + 1]] = [newRows[index + 1], newRows[index]];
    onChange(newRows);
  };

  // 更新单元格类型
  const handleCellTypeChange = (rowId: string, columnId: string, type: 'text' | 'field') => {
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cells: row.cells.map(cell => {
            if (cell.columnId === columnId) {
              if (type === 'text') {
                return { columnId, type: 'text', content: cell.content || '' };
              } else {
                return { columnId, type: 'field', fieldId: cell.fieldId, fieldPath: cell.fieldPath };
              }
            }
            return cell;
          })
        };
      }
      return row;
    });
    onChange(newRows);
  };

  // 更新单元格文本内容
  const handleCellContentChange = (rowId: string, columnId: string, content: string) => {
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cells: row.cells.map(cell => {
            if (cell.columnId === columnId) {
              return { ...cell, content };
            }
            return cell;
          })
        };
      }
      return row;
    });
    onChange(newRows);
  };

  // 打开字段选择器
  const handleOpenFieldSelector = (rowId: string, columnId: string) => {
    setEditingCell({ rowId, columnId });
    setShowFieldSelector(true);
  };

  // 字段选择完成
  const handleFieldSelect = (fieldId: string, fieldMeta: IFieldMeta) => {
    if (!editingCell) return;

    const newRows = rows.map(row => {
      if (row.id === editingCell.rowId) {
        return {
          ...row,
          cells: row.cells.map(cell => {
            if (cell.columnId === editingCell.columnId) {
              return {
                ...cell,
                fieldId,
                fieldPath: fieldMeta.name
              };
            }
            return cell;
          })
        };
      }
      return row;
    });
    onChange(newRows);
    setShowFieldSelector(false);
    setEditingCell(null);
  };

  // 获取单元格
  const getCell = (row: TableRow, columnId: string): TableCell | undefined => {
    return row.cells.find(c => c.columnId === columnId);
  };

  // 判断文本是否为长文本（包含换行符或长度超过30个字符）
  const isLongText = (text: string | null | undefined): boolean => {
    if (!text) return false;
    const str = String(text);
    return str.includes('\n') || str.length > 15;
  };

  if (columns.length === 0) {
    return (
      <div className="table-row-editor-empty">
        <p>请先在"列配置"标签中添加列</p>
      </div>
    );
  }

  return (
    <div className="table-row-editor">
      <div className="table-row-editor-header">
        <Button icon={<IconPlus />} onClick={handleAddRow} type="primary">
          添加行
        </Button>
        <span className="row-count">共 {rows.length} 行</span>
      </div>

      <div className="table-row-editor-list">
        {rows.length === 0 ? (
          <div className="table-row-editor-empty">
            <p>暂无行数据，点击"添加行"按钮开始配置</p>
          </div>
        ) : (
          rows.map((row, rowIndex) => (
            <Card key={row.id} className="table-row-card" bodyStyle={{ padding: '16px' }}>
              <div className="table-row-header">
                <span className="row-label">行 {rowIndex + 1}</span>
                <Space>
                  <Button
                    icon={<IconArrowUp />}
                    size="small"
                    onClick={() => handleMoveUp(rowIndex)}
                    disabled={rowIndex === 0}
                  />
                  <Button
                    icon={<IconArrowDown />}
                    size="small"
                    onClick={() => handleMoveDown(rowIndex)}
                    disabled={rowIndex === rows.length - 1}
                  />
                  <Button
                    icon={<IconDelete />}
                    type="danger"
                    size="small"
                    onClick={() => handleDeleteRow(row.id)}
                  />
                </Space>
              </div>

              <div className="table-row-cells">
                {columns.map(column => {
                  const cell = getCell(row, column.id);
                  if (!cell) return null;

                  return (
                    <div key={column.id} className="table-cell-editor">
                      <label className="cell-label">{column.label}:</label>
                      
                      <RadioGroup
                        type="button"
                        value={cell.type}
                        onChange={(e) => handleCellTypeChange(row.id, column.id, e.target.value as 'text' | 'field')}
                        style={{ marginBottom: 8 }}
                      >
                        <Radio value="text">固定文本</Radio>
                        <Radio value="field">字段</Radio>
                      </RadioGroup>

                      {cell.type === 'text' ? (
                        isLongText(cell.content) ? (
                          <TextArea
                            value={cell.content || ''}
                            onChange={(value) => handleCellContentChange(row.id, column.id, value)}
                            placeholder="输入固定文本"
                            autosize={{ minRows: 3, maxRows: 10 }}
                            style={{ width: '100%' }}
                          />
                        ) : (
                          <Input
                            value={cell.content || ''}
                            onChange={(value) => handleCellContentChange(row.id, column.id, value)}
                            placeholder="输入固定文本"
                          />
                        )
                      ) : (
                        <div>
                          <Button
                            onClick={() => handleOpenFieldSelector(row.id, column.id)}
                            style={{ width: '100%' }}
                          >
                            {cell.fieldPath ? `已选择: ${cell.fieldPath}` : '选择字段'}
                          </Button>
                          {cell.fieldPath && (
                            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                              字段: {cell.fieldPath}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 字段选择器 */}
      <FieldSelector
        visible={showFieldSelector}
        fields={fields}
        selectedFieldId={
          editingCell 
            ? rows.find(r => r.id === editingCell.rowId)?.cells.find(c => c.columnId === editingCell.columnId)?.fieldId
            : undefined
        }
        onSelect={handleFieldSelect}
        onCancel={() => {
          setShowFieldSelector(false);
          setEditingCell(null);
        }}
        title="选择字段"
      />
    </div>
  );
};

