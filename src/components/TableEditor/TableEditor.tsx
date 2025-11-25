/**
 * 表格编辑器
 * 配置表格列和行（字段映射）
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Table, Switch, Tag, Tabs, TabPane } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconArrowUp, IconArrowDown } from '@douyinfe/semi-icons';
import { IFieldMeta } from '@lark-base-open/js-sdk';
import { TableColumn, TableRow } from '../../types/template';
import { FieldSelector } from '../FieldSelector/FieldSelector';
import { TableRowEditor } from './TableRowEditor';
import './TableEditor.css';

interface TableEditorProps {
  visible: boolean;
  fields: IFieldMeta[];
  columns: TableColumn[];
  rows?: TableRow[];
  canWriteback: boolean;
  onConfirm: (config: { columns: TableColumn[]; rows: TableRow[]; canWriteback: boolean }) => void;
  onCancel: () => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({
  visible,
  fields,
  columns: initialColumns,
  rows: initialRows,
  canWriteback: initialCanWriteback,
  onConfirm,
  onCancel
}) => {
  const [columns, setColumns] = useState<TableColumn[]>(initialColumns || []);
  const [rows, setRows] = useState<TableRow[]>(initialRows || []);
  const [canWriteback, setCanWriteback] = useState(initialCanWriteback);
  const [activeTab, setActiveTab] = useState<'columns' | 'rows'>('columns');
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);

  // 添加列
  const handleAddColumn = () => {
    const newColumn: TableColumn = {
      id: `col_${Date.now()}`,
      type: 'field',
      label: '新列',
      width: 150
    };
    setColumns([...columns, newColumn]);
  };

  // 删除列
  const handleDeleteColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
  };

  // 更新列
  const handleUpdateColumn = (columnId: string, updates: Partial<TableColumn>) => {
    setColumns(columns.map(col =>
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  // 上移列
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newColumns = [...columns];
    [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
    setColumns(newColumns);
  };

  // 下移列
  const handleMoveDown = (index: number) => {
    if (index === columns.length - 1) return;
    const newColumns = [...columns];
    [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
    setColumns(newColumns);
  };

  // 打开字段选择器
  const handleOpenFieldSelector = (columnId: string) => {
    setEditingColumnId(columnId);
    setShowFieldSelector(true);
  };

  // 字段选择完成
  const handleFieldSelect = (fieldId: string, fieldMeta: IFieldMeta) => {
    if (editingColumnId) {
      handleUpdateColumn(editingColumnId, {
        fieldId,
        fieldPath: fieldMeta.name,
        label: fieldMeta.name // 自动使用字段名作为列标题
      });
    }
    setShowFieldSelector(false);
    setEditingColumnId(null);
  };

  // 表格列定义
  const tableColumns = [
    {
      title: '列标题',
      dataIndex: 'label',
      key: 'label',
      render: (text: string, record: TableColumn) => (
        <Input
          value={text}
          onChange={(value) => handleUpdateColumn(record.id, { label: value })}
          placeholder="列标题"
        />
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: TableColumn) => (
        <Select
          value={type}
          onChange={(value) => {
            const updates: Partial<TableColumn> = { type: value as 'field' | 'fixed' };
            if (value === 'fixed') {
              // 固定列不需要字段
              delete updates.fieldId;
              delete updates.fieldPath;
            }
            handleUpdateColumn(record.id, updates);
          }}
          style={{ width: '100%' }}
        >
          <Select.Option value="field">字段列</Select.Option>
          <Select.Option value="fixed">固定列</Select.Option>
        </Select>
      )
    },
    {
      title: '字段',
      dataIndex: 'fieldId',
      key: 'fieldId',
      render: (fieldId: string, record: TableColumn) => {
        if (record.type === 'fixed') {
          return <span className="text-placeholder">固定列无需选择字段</span>;
        }
        const selectedField = fields.find(f => f.id === fieldId);
        return (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              size="small"
              onClick={() => handleOpenFieldSelector(record.id)}
              style={{ flex: 1 }}
            >
              {selectedField ? selectedField.name : '选择字段'}
            </Button>
            {selectedField && (
              <Tag size="small" color="blue">
                {getFieldTypeName(selectedField.type)}
              </Tag>
            )}
          </div>
        );
      }
    },
    {
      title: '宽度',
      dataIndex: 'width',
      key: 'width',
      render: (width: number | undefined, record: TableColumn) => (
        <Input
          type="number"
          value={width || ''}
          onChange={(value) => handleUpdateColumn(record.id, { width: Number(value) || undefined })}
          placeholder="自动"
          style={{ width: 100 }}
        />
      )
    },
    {
      title: '对齐',
      dataIndex: 'align',
      key: 'align',
      render: (align: string | undefined, record: TableColumn) => (
        <Select
          value={align || 'left'}
          onChange={(value) => handleUpdateColumn(record.id, { align: value as 'left' | 'center' | 'right' })}
          style={{ width: 100 }}
        >
          <Select.Option value="left">左对齐</Select.Option>
          <Select.Option value="center">居中</Select.Option>
          <Select.Option value="right">右对齐</Select.Option>
        </Select>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: TableColumn, index: number) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            icon={<IconArrowUp />}
            size="small"
            onClick={() => handleMoveUp(index)}
            disabled={index === 0}
          />
          <Button
            icon={<IconArrowDown />}
            size="small"
            onClick={() => handleMoveDown(index)}
            disabled={index === columns.length - 1}
          />
        <Button
          icon={<IconDelete />}
          type="danger"
          size="small"
          onClick={() => handleDeleteColumn(record.id)}
          />
        </div>
      )
    }
  ];

  // 确认配置
  const handleConfirm = () => {
    onConfirm({ columns, rows, canWriteback });
  };

  return (
    <Modal
      title="配置表格"
      visible={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      width={1000}
      okButtonProps={{ disabled: columns.length === 0 }}
    >
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'columns' | 'rows')}>
        <TabPane tab="列配置" itemKey="columns">
      <div className="table-editor">
        <div className="table-editor-header">
          <Button
            icon={<IconPlus />}
            onClick={handleAddColumn}
            type="primary"
          >
            添加列
          </Button>
          <div className="table-editor-options">
            <span style={{ marginRight: 8 }}>支持反写</span>
            <Switch
              checked={canWriteback}
              onChange={setCanWriteback}
            />
          </div>
        </div>

        <Table
          columns={tableColumns}
          dataSource={columns}
          pagination={false}
          size="small"
              rowKey="id"
        />

        {columns.length === 0 && (
          <div className="table-editor-empty">
            <p>暂无列，请点击"添加列"按钮添加</p>
          </div>
        )}

            <div className="table-editor-footer">
              <span className="footer-text">
                共 {columns.length} 列
              </span>
            </div>
      </div>
        </TabPane>

        <TabPane tab="行配置" itemKey="rows">
          <TableRowEditor
            columns={columns}
            rows={rows}
            fields={fields}
            onChange={setRows}
          />
        </TabPane>
      </Tabs>

      {/* 字段选择器 */}
      <FieldSelector
        visible={showFieldSelector}
        fields={fields}
        selectedFieldId={
          editingColumnId 
            ? columns.find(c => c.id === editingColumnId)?.fieldId 
            : undefined
        }
        onSelect={handleFieldSelect}
        onCancel={() => {
          setShowFieldSelector(false);
          setEditingColumnId(null);
        }}
        title="选择表格列字段"
      />
    </Modal>
  );
};

/**
 * 获取字段类型名称
 */
function getFieldTypeName(type: number): string {
  const typeNames: Record<number, string> = {
    1: '文本',
    2: '数字',
    3: '单选',
    4: '多选',
    5: '日期',
    7: '复选框',
    11: '人员',
    13: '电话',
    15: 'URL',
    17: '附件',
    18: '单项关联',
    21: '双向关联'
  };
  return typeNames[type] || '未知';
}

