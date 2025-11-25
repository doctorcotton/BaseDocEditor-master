/**
 * 模板编辑器主组件
 * 提供可视化编辑界面
 */

import React, { useState } from 'react';
import { Layout, Button, Toast, Modal } from '@douyinfe/semi-ui';
import { IconSave, IconCopy } from '@douyinfe/semi-icons';
import { Template, TemplateElement } from '../../types/template';
import { ComponentPanel } from './ComponentPanel';
import { EditorCanvas } from './EditorCanvas';
import { PropertyPanel } from './PropertyPanel';
import { TableEditor } from '../TableEditor/TableEditor';
import { LoopAreaFilter } from '../LoopAreaFilter/LoopAreaFilter';
import './TemplateEditor.css';

const { Sider, Content } = Layout;

interface TemplateEditorProps {
  template: Template;
  fields: any[];
  onSave: (template: Template) => Promise<boolean>;
  onCopy?: (template: Template) => void;
  onCancel?: () => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template: initialTemplate,
  fields,
  onSave,
  onCopy,
  onCancel
}) => {
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [selectedElement, setSelectedElement] = useState<TemplateElement | null>(null);
  const [saving, setSaving] = useState(false);
  
  // 表格编辑器状态
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [editingTableElement, setEditingTableElement] = useState<TemplateElement | null>(null);
  
  // 循环区域筛选器状态
  const [showLoopFilter, setShowLoopFilter] = useState(false);
  const [editingLoopElement, setEditingLoopElement] = useState<TemplateElement | null>(null);

  // 更新模板
  const updateTemplate = (updater: (prev: Template) => Template) => {
    setTemplate(prev => {
      const updated = updater(prev);
      return updated;
    });
  };

  // 添加元素（添加到列表末尾，流式布局）
  const handleAddElement = (type: TemplateElement['type'], position: { x: number; y: number }) => {
    const newElement: TemplateElement = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: { x: 0, y: 0 }, // 流式布局，位置由CSS控制
      config: getDefaultConfig(type)
    };

    updateTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));

    setSelectedElement(newElement);
    Toast.success(`已添加${getElementTypeName(type)}`);
    
    // 如果是表格或循环区域，自动打开配置对话框
    if (type === 'table') {
      setEditingTableElement(newElement);
      setShowTableEditor(true);
    } else if (type === 'loop') {
      setEditingLoopElement(newElement);
      setShowLoopFilter(true);
    }
  };

  // 更新元素
  const handleUpdateElement = (elementId: string, updates: Partial<TemplateElement>) => {
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      )
    }));

    if (selectedElement?.id === elementId) {
      setSelectedElement(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // 删除元素
  const handleDeleteElement = (elementId: string) => {
    updateTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId)
    }));

    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }

    Toast.success('已删除元素');
  };

  // 保存模板
  const handleSave = async () => {
    console.log('[TemplateEditor] handleSave clicked', { templateId: template.id, elementCount: template.elements.length });
    setSaving(true);
    try {
      const success = await onSave(template);
      console.log('[TemplateEditor] onSave resolved', { success });
      if (success) {
        Toast.success('模板保存成功');
      } else {
        Toast.error('模板保存失败');
      }
    } catch (error: any) {
      console.error('[TemplateEditor] handleSave error:', error);
      Toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 复制模板
  const handleCopy = () => {
    if (onCopy) {
      onCopy(template);
      // 不使用 Toast.success，避免 React 18 警告
      console.log('模板已复制');
    }
  };

  // 打开表格编辑器
  const handleOpenTableEditor = () => {
    if (selectedElement && selectedElement.type === 'table') {
      setEditingTableElement(selectedElement);
      setShowTableEditor(true);
    }
  };

  // 确认表格配置
  const handleTableEditorConfirm = (config: { columns: any[]; rows: any[]; canWriteback: boolean }) => {
    if (editingTableElement) {
      handleUpdateElement(editingTableElement.id, {
        config: {
          ...editingTableElement.config,
          columns: config.columns,
          rows: config.rows,
          dataSource: config.rows && config.rows.length > 0 ? 'static' : 'dynamic',
          canWriteback: config.canWriteback
        }
      });
    }
    setShowTableEditor(false);
    setEditingTableElement(null);
  };

  // 打开循环区域筛选器
  const handleOpenLoopFilter = () => {
    if (selectedElement && selectedElement.type === 'loop') {
      setEditingLoopElement(selectedElement);
      setShowLoopFilter(true);
    }
  };

  // 确认循环区域筛选条件
  const handleLoopFilterConfirm = (filter: any) => {
    if (editingLoopElement) {
      handleUpdateElement(editingLoopElement.id, {
        config: {
          ...editingLoopElement.config,
          filter
        }
      });
    }
    setShowLoopFilter(false);
    setEditingLoopElement(null);
  };

  return (
    <Layout className="template-editor">
      <div className="template-editor-header">
        <div className="header-left">
          <h3>{template.name}</h3>
        </div>
        <div className="header-right">
          <Button
            icon={<IconCopy />}
            onClick={handleCopy}
            disabled={!onCopy}
          >
            复制模板
          </Button>
          <Button
            icon={<IconSave />}
            type="primary"
            onClick={handleSave}
            loading={saving}
          >
            保存模板
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </div>
      </div>

      <Layout className="template-editor-body">
        <Sider className="component-panel-sider" style={{ width: 250 }}>
          <ComponentPanel
            onAddElement={handleAddElement}
            fields={fields}
          />
        </Sider>

        <Content className="editor-canvas-content">
          <EditorCanvas
            template={template}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            fields={fields}
            onAddElement={handleAddElement}
          />
        </Content>

        {selectedElement && (
          <Sider className="property-panel-sider" style={{ width: 300 }}>
            <PropertyPanel
              element={selectedElement}
              fields={fields}
              onUpdate={(updates) => handleUpdateElement(selectedElement.id, updates)}
              onOpenTableEditor={selectedElement.type === 'table' ? handleOpenTableEditor : undefined}
              onOpenLoopFilter={selectedElement.type === 'loop' ? handleOpenLoopFilter : undefined}
            />
          </Sider>
        )}
      </Layout>

      {/* 表格编辑器对话框 */}
      {showTableEditor && editingTableElement && (
        <TableEditor
          visible={showTableEditor}
          fields={fields}
          columns={(editingTableElement.config as any).columns || []}
          rows={(editingTableElement.config as any).rows || []}
          canWriteback={(editingTableElement.config as any).canWriteback || false}
          onConfirm={handleTableEditorConfirm}
          onCancel={() => {
            setShowTableEditor(false);
            setEditingTableElement(null);
          }}
        />
      )}

      {/* 循环区域筛选器对话框 */}
      {showLoopFilter && editingLoopElement && (
        <LoopAreaFilter
          visible={showLoopFilter}
          fields={fields}
          filter={(editingLoopElement.config as any).filter}
          onConfirm={handleLoopFilterConfirm}
          onCancel={() => {
            setShowLoopFilter(false);
            setEditingLoopElement(null);
          }}
        />
      )}
    </Layout>
  );
};

/**
 * 获取元素的默认配置
 */
function getDefaultConfig(type: TemplateElement['type']): any {
  switch (type) {
    case 'text':
      return {
        content: '请输入文本',
        fontSize: 14,
        fontWeight: 'normal',
        color: '#000000',
        align: 'left'
      };
    case 'field':
      return {
        fieldPath: '',
        format: ''
      };
    case 'loop':
      return {
        fieldId: '',
        fieldName: '',
        filter: undefined,
        template: []
      };
    case 'table':
      return {
        columns: [],
        canWriteback: false
      };
    case 'image':
      return {
        fieldId: '',
        fieldPath: '',
        width: 200,
        height: 200
      };
    case 'link':
      return {
        fieldId: '',
        fieldPath: '',
        text: ''
      };
    default:
      return {};
  }
}

/**
 * 获取元素类型名称
 */
function getElementTypeName(type: TemplateElement['type']): string {
  const names: Record<TemplateElement['type'], string> = {
    text: '文本',
    field: '字段',
    loop: '循环区域',
    table: '表格',
    image: '图片',
    link: '超链接'
  };
  return names[type] || '未知';
}
