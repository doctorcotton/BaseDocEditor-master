/**
 * 编辑画布
 * 流式布局，从上到下排列元素，支持拖动排序
 */

import React, { useState, useRef } from 'react';
import { Card, Button, Dropdown, Input } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconPlus, IconHandle } from '@douyinfe/semi-icons';
import { Template, TemplateElement } from '../../types/template';
import './TemplateEditor.css';

interface EditorCanvasProps {
  template: Template;
  selectedElement: TemplateElement | null;
  onSelectElement: (element: TemplateElement | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<TemplateElement>) => void;
  onDeleteElement: (elementId: string) => void;
  fields: any[];
  onAddElement?: (type: TemplateElement['type'], position: { x: number; y: number }) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  template,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  fields,
  onAddElement
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pendingElementType, setPendingElementType] = useState<TemplateElement['type'] | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // 添加元素菜单
  const addElementMenu = [
    { node: 'item' as const, name: '文本', value: 'text' },
    { node: 'item' as const, name: '字段', value: 'field' },
    { node: 'item' as const, name: '表格', value: 'table' },
    { node: 'item' as const, name: '循环区域', value: 'loop' },
    { node: 'item' as const, name: '图片', value: 'image' },
    { node: 'item' as const, name: '超链接', value: 'link' }
  ];

  // 处理添加元素菜单点击：设置待添加的元素类型
  const handleAddElementClick = (value: any) => {
    setPendingElementType(value as TemplateElement['type']);
  };

  // 处理画布点击：添加元素到列表末尾
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!pendingElementType || !onAddElement) {
      return;
    }

    // 添加到列表末尾，位置由流式布局自动处理
    onAddElement(pendingElementType, { x: 0, y: 0 });
    
    // 清除待添加状态
    setPendingElementType(null);
  };

  // 处理元素拖动开始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理拖动经过
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  // 处理拖动结束
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // 重新排序元素
    const newElements = [...template.elements];
    const [draggedElement] = newElements.splice(draggedIndex, 1);
    newElements.splice(dropIndex, 0, draggedElement);

    // 重新计算每个元素的 Y 位置
    let currentY = 40;
    newElements.forEach((element, index) => {
      const height = getElementHeight(element);
      onUpdateElement(element.id, { position: { x: 40, y: currentY } });
      currentY += height + 20; // 20px 间距
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 获取元素高度（估算）
  const getElementHeight = (element: TemplateElement): number => {
    switch (element.type) {
      case 'text':
        return 60;
      case 'field':
        return 50;
      case 'table':
        return 150;
      case 'loop':
        return 200;
      case 'image':
        return (element.config as any).height || 200;
      default:
        return 50;
    }
  };

  // 开始编辑文本
  const handleStartEdit = (element: TemplateElement) => {
    if (element.type === 'text') {
      setEditingElementId(element.id);
      setEditingValue((element.config as any).content || '');
    }
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingElementId) {
      onUpdateElement(editingElementId, {
        config: {
          ...template.elements.find(el => el.id === editingElementId)?.config,
          content: editingValue
        }
      });
      setEditingElementId(null);
      setEditingValue('');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingElementId(null);
    setEditingValue('');
  };

  // 渲染元素
  const renderElement = (element: TemplateElement, index: number) => {
    const isSelected = selectedElement?.id === element.id;
    const isDragging = draggedIndex === index;
    const isDragOver = dragOverIndex === index;
    const isEditing = editingElementId === element.id;

    return (
      <div
        key={element.id}
        className={`canvas-element-flow ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
        draggable={!isEditing}
        onDragStart={(e) => !isEditing && handleDragStart(e, index)}
        onDragOver={(e) => !isEditing && handleDragOver(e, index)}
        onDrop={(e) => !isEditing && handleDrop(e, index)}
        onClick={(e) => {
          e.stopPropagation();
          if (!isEditing) {
            onSelectElement(element);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (element.type === 'text') {
            handleStartEdit(element);
          }
        }}
      >
        <Card className="element-card-flow" bodyStyle={{ padding: '12px' }}>
          <div className="element-header-flow">
            <div className="element-drag-handle">
              <IconHandle />
            </div>
            <span className="element-type">{getElementTypeName(element.type)}</span>
            <div className="element-actions">
              <Button
                size="small"
                icon={<IconEdit />}
                type="tertiary"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(element);
                }}
              />
              <Button
                size="small"
                icon={<IconDelete />}
                type="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteElement(element.id);
                }}
              />
            </div>
          </div>
          <div className="element-content-flow">
            {renderElementContent(element)}
          </div>
        </Card>
      </div>
    );
  };

  // 渲染元素内容
  const renderElementContent = (element: TemplateElement) => {
    const isEditing = editingElementId === element.id;
    
    switch (element.type) {
      case 'text':
        if (isEditing) {
          return (
            <Input
              value={editingValue}
              onChange={setEditingValue}
              onBlur={handleSaveEdit}
              autoFocus
              style={{ width: '100%' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
            />
          );
        }
        return (
          <div 
            className="element-preview-text"
            style={{ cursor: 'text', minHeight: '20px' }}
            title="双击编辑"
          >
            {(element.config as any).content || '请输入文本'}
          </div>
        );
      case 'field':
        return <div className="element-preview-field">[{(element.config as any).fieldPath || '选择字段'}]</div>;
      case 'loop':
        return <div className="element-preview-loop">循环区域: {(element.config as any).fieldName || '未选择关联字段'}</div>;
      case 'table':
        const columns = (element.config as any).columns || [];
        const rows = (element.config as any).rows || [];
        const dataSource = (element.config as any).dataSource || 'dynamic';
        
        if (dataSource === 'static' && rows.length > 0) {
          // 显示实际的表格内容
          return (
            <div className="element-preview-table">
              <table className="table-preview-content">
                <thead>
                  <tr>
                    {columns.map((col: any) => (
                      <th key={col.id} style={{ width: col.width }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row: any) => (
                    <tr key={row.id}>
                      {row.cells.map((cell: any) => (
                        <td key={cell.columnId}>
                          {cell.type === 'text' 
                            ? cell.content 
                            : `[${cell.fieldPath || '未配置'}]`
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr>
                      <td colSpan={columns.length} style={{ textAlign: 'center', color: '#999' }}>
                        ... 还有 {rows.length - 5} 行
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        } else {
          // 旧版显示方式
          return (
            <div className="element-preview-table">
              <div className="table-preview-header">
                表格 ({columns.length} 列)
              </div>
              {columns.length > 0 && (
                <div className="table-preview-columns">
                  {columns.slice(0, 3).map((col: any) => (
                    <span key={col.id} className="table-column-badge">{col.label}</span>
                  ))}
                  {columns.length > 3 && <span>...</span>}
                </div>
              )}
            </div>
          );
        }
      case 'image':
        return <div className="element-preview-image">图片: {(element.config as any).fieldPath || '未选择附件字段'}</div>;
      case 'link':
        return <div className="element-preview-link">链接: {(element.config as any).fieldPath || '未选择字段'}</div>;
      default:
        return <div>未知元素</div>;
    }
  };

  const pageWidth = template.styles?.pageWidth || 794; // A4 宽度
  const pageHeight = template.styles?.pageHeight || 1123; // A4 高度

  return (
    <div className="editor-canvas-wrapper" style={{ width: pageWidth + 56, minWidth: pageWidth + 56 }}>
      <div className="editor-canvas-toolbar">
        <Dropdown
          trigger="click"
          position="bottomLeft"
          menu={addElementMenu}
          onClickMenuItem={handleAddElementClick}
        >
          <Button 
            icon={<IconPlus />} 
            type={pendingElementType ? "primary" : "secondary"}
            theme={pendingElementType ? "solid" : "light"}
          >
            {pendingElementType ? `点击画布添加${getElementTypeName(pendingElementType)}` : '添加元素'}
          </Button>
        </Dropdown>
        <div className="canvas-info">
          {template.elements.length} 个元素
        </div>
      </div>
      
    <div
      ref={canvasRef}
        className={`editor-canvas-flow ${pendingElementType ? 'adding-mode' : ''}`}
        onClick={handleCanvasClick}
        style={{
          width: pageWidth,
          minHeight: pageHeight,
          cursor: pendingElementType ? 'pointer' : 'default'
        }}
    >
        {template.elements.length === 0 ? (
          <div className="canvas-empty">
            <p>{pendingElementType ? '点击画布添加元素到末尾' : '点击上方「添加元素」按钮开始创建模板'}</p>
          </div>
        ) : (
          <>
            {template.elements.map((element, index) => renderElement(element, index))}
            {pendingElementType && (
              <div style={{ 
                padding: '20px', 
                border: '2px dashed var(--semi-color-primary)', 
                borderRadius: '8px',
                textAlign: 'center',
                color: 'var(--semi-color-primary)',
                cursor: 'pointer'
              }}>
                点击此处添加{getElementTypeName(pendingElementType)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * 获取元素类型名称
 */
function getElementTypeName(type: TemplateElement['type']): string {
  const names: Record<TemplateElement['type'], string> = {
    text: '文本',
    field: '字段',
    loop: '循环',
    table: '表格',
    image: '图片',
    link: '链接'
  };
  return names[type] || '未知';
}
