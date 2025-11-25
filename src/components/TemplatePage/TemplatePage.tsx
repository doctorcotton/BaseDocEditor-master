/**
 * 模板选择/编制页面
 * 参考排版打印页面的布局：左侧边栏（模板列表）+ 主内容区（模板编辑器/渲染器）
 */

import React, { useState, useEffect } from 'react';
import { Layout, Button, List, Card, Tabs, Typography, Modal, Input, Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconCopy, IconDelete, IconLock, IconUnlock, IconUndo, IconRedo } from '@douyinfe/semi-icons';
import { bitable, IRecord, IFieldMeta, ITable } from '@lark-base-open/js-sdk';
import { Template } from '../../types/template';
import { TemplateEditor } from '../TemplateEditor/TemplateEditor';
import { TemplateRenderer } from '../TemplateRenderer/TemplateRenderer';
import { useTemplateStorage } from '../../hooks/useTemplateStorage';
import { CommentPanel } from '../CommentPanel/CommentPanel';
import { useCommentStorage } from '../../hooks/useCommentStorage';
import { useDocumentSync } from '../../hooks/useDocumentSync';
import { useUndoRedo, useUndoRedoKeyboard, UndoableAction } from '../../hooks/useUndoRedo';
import { FieldChange } from '../../types';
import { DEFAULT_TEMPLATE } from '../../config/defaultTemplate';
import './TemplatePage.css';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface TemplatePageProps {
  record: IRecord;
  fields: IFieldMeta[];
  table: ITable;
  onBack: () => void;
}

export const TemplatePage: React.FC<TemplatePageProps> = ({
  record,
  fields,
  table,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editLocked, setEditLocked] = useState(false); // 默认不锁定，允许编辑
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [commentFieldId, setCommentFieldId] = useState<string | undefined>(undefined);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [recordName, setRecordName] = useState<string>('未命名记录');

  const {
    templates,
    loading: templatesLoading,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
    copyTemplate,
    initTemplateTable,
    templateTableConfig
  } = useTemplateStorage();

  const {
    comments,
    loadComments,
    getCommentStats,
    initCommentTable,
    error: commentError
  } = useCommentStorage();

  const {
    syncing,
    syncResult,
    syncChanges,
    clearSyncResult
  } = useDocumentSync();

  // 用于触发画布数据刷新的 key
  const [refreshKey, setRefreshKey] = useState(0);

  // 撤销/重做功能
  const handleUndoAction = async (action: UndoableAction): Promise<boolean> => {
    // 撤销操作：将字段值恢复为 oldValue
    const field = fields.find(f => f.id === action.fieldId);
    if (!field) return false;

    const change: FieldChange = {
      recordId: action.recordId,
      fieldId: action.fieldId,
      fieldName: action.fieldName,
      oldValue: action.newValue, // 当前值变成旧值
      newValue: action.oldValue, // 恢复到旧值
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      const success = await syncChanges(table, [change], fields);
      if (success) {
        // 刷新画布显示
        setRefreshKey(prev => prev + 1);
        Toast.info(`已撤销：${action.fieldName}`);
        return true;
      }
      Toast.error(`撤销失败：${action.fieldName}`);
      return false;
    } catch (error) {
      console.error('[TemplatePage] 撤销失败:', error);
      return false;
    }
  };

  const handleRedoAction = async (action: UndoableAction): Promise<boolean> => {
    // 重做操作：将字段值恢复为 newValue
    const field = fields.find(f => f.id === action.fieldId);
    if (!field) return false;

    const change: FieldChange = {
      recordId: action.recordId,
      fieldId: action.fieldId,
      fieldName: action.fieldName,
      oldValue: action.oldValue,
      newValue: action.newValue,
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      const success = await syncChanges(table, [change], fields);
      if (success) {
        // 刷新画布显示
        setRefreshKey(prev => prev + 1);
        Toast.info(`已重做：${action.fieldName}`);
        return true;
      }
      Toast.error(`重做失败：${action.fieldName}`);
      return false;
    } catch (error) {
      console.error('[TemplatePage] 重做失败:', error);
      return false;
    }
  };

  const {
    canUndo,
    canRedo,
    pushAction,
    undo,
    redo
  } = useUndoRedo({
    maxHistory: 50,
    onUndo: handleUndoAction,
    onRedo: handleRedoAction
  });

  // 启用键盘快捷键（仅在预览模式下）
  useUndoRedoKeyboard(undo, redo, canUndo, canRedo, activeTab === 'preview');

  // 评论统计
  const commentStats = new Map<string, { total: number; unresolved: number }>();
  
  // 待同步的字段变更
  const [pendingChanges, setPendingChanges] = useState<FieldChange[]>([]);

  // 加载记录名称（标准名称字段）
  useEffect(() => {
    const loadRecordName = async () => {
      const standardNameFieldId = 'fld3g1HhuN'; // 标准名称字段ID
      
      // 先从 record.fields 读取
      let nameValue = record.fields?.[standardNameFieldId];
      
      // 如果没有，使用 getCellValue 异步获取
      if ((nameValue === undefined || nameValue === null) && table) {
        try {
          nameValue = await table.getCellValue(standardNameFieldId, record.recordId);
        } catch (error) {
          console.error('[TemplatePage] 加载记录名称失败:', error);
        }
      }
      
      // 格式化显示值
      if (nameValue !== undefined && nameValue !== null) {
        const field = fields.find(f => f.id === standardNameFieldId);
        if (field) {
          const { formatFieldValue } = await import('../../utils/fieldFormatter');
          const formatted = formatFieldValue(nameValue, field.type);
          setRecordName(formatted || '未命名记录');
        } else {
          setRecordName(String(nameValue) || '未命名记录');
        }
      } else {
        setRecordName('未命名记录');
      }
    };
    
    loadRecordName();
  }, [record, fields, table]);

  useEffect(() => {
    // 初始化模板表和评论表
    const init = async () => {
      console.log('[TemplatePage] init effect start', { recordId: record.recordId, tableId: table.id });
      const base = bitable.base;
      
      // 初始化模板表
      console.log('[TemplatePage] initTemplateTable call');
      const templateConfig = await initTemplateTable(base);
      if (!templateConfig) {
        // 模板表初始化失败，显示错误提示
        Toast.error('模板表初始化失败，请查看控制台了解详情');
      }
      
      // 初始化评论表格
      console.log('[TemplatePage] initCommentTable call');
      const commentConfig = await (initCommentTable as any)(base, table.id);
      if (!commentConfig) {
        // 评论表初始化失败，显示错误提示
        Toast.warning('评论表初始化失败，评论功能可能不可用');
      }
      
      console.log('[TemplatePage] init effect finished');
    };
    init();

    // 加载评论
    loadComments(table, record.recordId);
  }, []);

  // 当模板表初始化完成后，加载模板列表或使用预设模板
  useEffect(() => {
    if (templateTableConfig?.tableId) {
      console.log('[TemplatePage] templateTableConfig ready, loadTemplates', templateTableConfig);
      loadTemplates().then(() => {
        console.log('[TemplatePage] templates loaded, count:', templates.length);
        // 如果没有模板，自动使用预设模板并保存
        if (templates.length === 0) {
          console.log('[TemplatePage] No templates found, saving default template');
          setSelectedTemplate(DEFAULT_TEMPLATE);
          // 自动保存预设模板到模板表
          saveTemplate(DEFAULT_TEMPLATE).then(success => {
            if (success) {
              console.log('[TemplatePage] Default template saved successfully');
              loadTemplates(); // 重新加载模板列表
            }
          });
        } else {
          // 有模板时，选择第一个
          setSelectedTemplate(templates[0]);
        }
      });
    }
  }, [templateTableConfig]);

  // 监听模板列表变化
  useEffect(() => {
    console.log('[TemplatePage] templates changed, count:', templates.length);
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates]);

  // 创建新模板
  const handleCreateTemplate = () => {
    console.log('[TemplatePage] handleCreateTemplate');
    const newTemplate: Template = {
      id: `template_${Date.now()}`,
      name: newTemplateName || '新模板',
      version: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      elements: [],
      styles: {
        fontSize: 14,
        pageWidth: 800,
        pageHeight: 1200,
        margin: { top: 20, right: 20, bottom: 20, left: 20 }
      }
    };
    console.log('[TemplatePage] new template created', { id: newTemplate.id, name: newTemplate.name });
    setEditingTemplate(newTemplate);
    setSelectedTemplate(newTemplate);
    setActiveTab('edit');
    setShowCreateTemplate(false);
    setNewTemplateName('');
  };

  // 选择模板
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setActiveTab('preview');
  };

  // 编辑模板
  const handleEditTemplate = (template: Template) => {
    console.log('[TemplatePage] handleEditTemplate', { templateId: template.id, templateName: template.name, editLocked });
    if (editLocked) {
      Toast.warning('模板编辑功能已锁定');
      return;
    }
    setEditingTemplate({ ...template }); // 创建副本以避免直接修改
    setSelectedTemplate(template);
    setActiveTab('edit');
  };

  // 复制模板
  const handleCopyTemplate = async (template: Template) => {
    const copied = copyTemplate(template, `${template.name} (副本)`);
    const success = await saveTemplate(copied);
    if (success) {
    setSelectedTemplate(copied);
      Toast.success('模板已复制');
      await loadTemplates();
    } else {
      Toast.error('复制模板失败');
    }
  };

  // 删除模板
  const handleDeleteTemplate = async (template: Template) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模板"${template.name}"吗？`,
      onOk: async () => {
        const success = await deleteTemplate(template.id);
        if (success) {
          Toast.success('模板已删除');
          if (selectedTemplate?.id === template.id) {
            setSelectedTemplate(null);
          }
          await loadTemplates();
        } else {
          Toast.error('删除模板失败');
        }
      }
    });
  };

  // 保存模板
  const handleSaveTemplate = async (template: Template): Promise<boolean> => {
    console.log('[TemplatePage] handleSaveTemplate called', { 
      templateId: template.id, 
      templateName: template.name, 
      elementCount: template.elements.length,
      tableConfig: templateTableConfig 
    });
    
    if (!templateTableConfig?.tableId) {
      console.error('[TemplatePage] templateTableConfig is null');
      Toast.error('模板表未初始化，请稍候再试');
      return false;
    }

    try {
      console.log('[TemplatePage] calling saveTemplate...');
      const success = await saveTemplate(template);
      console.log('[TemplatePage] saveTemplate result:', success);
      
      if (success) {
        console.log('[TemplatePage] save success, updating UI...');
    setEditingTemplate(null);
    setSelectedTemplate(template);
    setActiveTab('preview');
        Toast.success('模板保存成功');
        
        // 重新加载模板列表
        console.log('[TemplatePage] reloading templates...');
        await loadTemplates();
        console.log('[TemplatePage] templates reloaded, current count:', templates.length);
      } else {
        console.warn('[TemplatePage] saveTemplate returned false');
        Toast.error('模板保存失败');
      }
      return success;
    } catch (err: any) {
      console.error('[TemplatePage] save error:', err);
      Toast.error(`保存失败: ${err.message || '未知错误'}`);
      return false;
    }
  };

  // 打开评论面板
  const handleOpenComment = (fieldId?: string) => {
    setCommentFieldId(fieldId);
    setShowCommentPanel(true);
  };

  // 处理字段变更
  const handleFieldChange = async (fieldId: string, newValue: any, oldValue: any) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) {
      console.warn('[TemplatePage] Field not found:', fieldId);
      return;
    }

    // 创建字段变更记录
    const change: FieldChange = {
      recordId: record.recordId,
      fieldId: fieldId,
      fieldName: field.name,
      oldValue: oldValue,
      newValue: newValue,
      timestamp: Date.now(),
      status: 'pending'
    };

    // 添加到待同步列表
    setPendingChanges(prev => {
      // 检查是否已有该字段的变更，如果有则更新，否则添加
      const index = prev.findIndex(c => c.recordId === change.recordId && c.fieldId === change.fieldId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = change;
        return updated;
      }
      return [...prev, change];
    });

    // 立即同步到多维表格
    try {
      const success = await syncChanges(table, [change], fields);
      if (success) {
        // 更新变更状态
        setPendingChanges(prev => 
          prev.map(c => 
            c.recordId === change.recordId && c.fieldId === change.fieldId
              ? { ...c, status: 'synced' as const }
              : c
          )
        );
        
        // 记录到撤销栈（只有同步成功才记录）
        pushAction({
          fieldId: fieldId,
          fieldName: field.name,
          recordId: record.recordId,
          oldValue: oldValue,
          newValue: newValue
        });
        
        Toast.success(`字段"${field.name}"已更新`);
      } else {
        // 更新变更状态为失败
        setPendingChanges(prev => 
          prev.map(c => 
            c.recordId === change.recordId && c.fieldId === change.fieldId
              ? { ...c, status: 'failed' as const }
              : c
          )
        );
        Toast.error(`字段"${field.name}"更新失败`);
      }
    } catch (error: any) {
      console.error('[TemplatePage] 同步字段变更失败:', error);
      Toast.error(`同步失败: ${error.message || '未知错误'}`);
    }
  };

  return (
    <Layout className="template-page">
      {/* 顶部导航栏 */}
      <div className="template-page-header">
        <div className="header-left">
          <Button onClick={onBack} type="tertiary">
            ← 返回
          </Button>
          <Title heading={4} style={{ margin: '0 0 0 16px' }}>
            {recordName}
          </Title>
        </div>
        <div className="header-right">
          {activeTab === 'preview' && (
            <div className="undo-redo-buttons">
              <Tooltip content="撤销 (Ctrl+Z)">
                <Button
                  icon={<IconUndo />}
                  type="tertiary"
                  disabled={!canUndo}
                  onClick={() => undo()}
                />
              </Tooltip>
              <Tooltip content="重做 (Ctrl+Shift+Z)">
                <Button
                  icon={<IconRedo />}
                  type="tertiary"
                  disabled={!canRedo}
                  onClick={() => redo()}
                />
              </Tooltip>
            </div>
          )}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'edit' | 'preview')}
            type="button"
          >
            <TabPane tab="预览" itemKey="preview" />
            <TabPane tab="编辑模板" itemKey="edit" />
          </Tabs>
        </div>
      </div>

      <Layout className="template-page-body">
        {/* 左侧边栏 - 模板管理 */}
        <Sider width={280} className="template-sidebar">
          <div className="sidebar-header">
            <Button
              icon={<IconPlus />}
              type="primary"
              block
              onClick={() => setShowCreateTemplate(true)}
            >
              创建模板
            </Button>
          </div>

          <div className="sidebar-content">
            <div className="template-list-header">
              <Text strong>模板列表</Text>
              <Button
                icon={editLocked ? <IconLock /> : <IconUnlock />}
                type="tertiary"
                size="small"
                onClick={() => setEditLocked(!editLocked)}
                title={editLocked ? '解锁编辑' : '锁定编辑'}
              />
            </div>

            {templatesLoading ? (
              <div className="template-list-loading">加载中...</div>
            ) : templates.length === 0 ? (
              <div className="template-list-empty">使用预设模板</div>
            ) : (
              <List
                dataSource={templates}
                renderItem={(template) => (
                  <List.Item
                    className={`template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="template-item-content">
                      <Text strong={selectedTemplate?.id === template.id}>
                        {template.name}
                      </Text>
                      <Text type="tertiary" size="small">
                        v{template.version}
                      </Text>
                    </div>
                    <div className="template-item-actions">
                      <Button
                        icon={<IconEdit />}
                        type="tertiary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                        disabled={editLocked}
                      />
                      <Button
                        icon={<IconCopy />}
                        type="tertiary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyTemplate(template);
                        }}
                      />
                      <Button
                        icon={<IconDelete />}
                        type="tertiary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                        disabled={editLocked}
                      />
                    </div>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Sider>

        {/* 主内容区 */}
        <Content className="template-content">
          {activeTab === 'edit' ? (
            editingTemplate ? (
            <TemplateEditor
              template={editingTemplate}
              fields={fields}
              onSave={handleSaveTemplate}
              onCopy={(template) => handleCopyTemplate(template)}
              onCancel={() => {
                setEditingTemplate(null);
                setActiveTab('preview');
              }}
            />
            ) : selectedTemplate ? (
              <TemplateEditor
                template={selectedTemplate}
                fields={fields}
                onSave={handleSaveTemplate}
                onCopy={(template) => handleCopyTemplate(template)}
                onCancel={() => {
                  setActiveTab('preview');
                }}
              />
            ) : (
              <div className="template-empty">
                <Text type="tertiary">请先选择一个模板</Text>
              </div>
            )
          ) : selectedTemplate ? (
            <TemplateRenderer
              template={selectedTemplate}
              record={record}
              fields={fields}
              table={table}
              onComment={handleOpenComment}
              commentStats={commentStats}
              onFieldChange={handleFieldChange}
              refreshKey={refreshKey}
            />
          ) : (
            <div className="template-empty">
              <Text type="tertiary">请选择一个模板或创建新模板</Text>
            </div>
          )}
        </Content>
      </Layout>

      {/* 创建模板对话框 */}
      <Modal
        title="创建新模板"
        visible={showCreateTemplate}
        onOk={handleCreateTemplate}
        onCancel={() => {
          setShowCreateTemplate(false);
          setNewTemplateName('');
        }}
      >
        <Input
          placeholder="输入模板名称"
          value={newTemplateName}
          onChange={setNewTemplateName}
          onPressEnter={handleCreateTemplate}
        />
      </Modal>

      {/* 评论面板 */}
      {showCommentPanel && (
        <CommentPanel
          recordId={record.recordId}
          fieldId={commentFieldId}
          table={table}
          visible={showCommentPanel}
          onClose={() => setShowCommentPanel(false)}
        />
      )}
    </Layout>
  );
};

