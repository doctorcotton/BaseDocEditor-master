/**
 * 模板选择/编制页面
 * 参考排版打印页面的布局：左侧边栏（模板列表）+ 主内容区（模板编辑器/渲染器）
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Button, List, Card, Tabs, Typography, Modal, Input, Toast, Tooltip, Slider, Select } from '@douyinfe/semi-ui';
import { IconPlus, IconEdit, IconCopy, IconDelete, IconLock, IconUnlock, IconUndo, IconRedo, IconRefresh, IconArrowLeft, IconDownload } from '@douyinfe/semi-icons';
import { bitable, IRecord, IFieldMeta, ITable, FieldType } from '@lark-base-open/js-sdk';
import { pdf } from '@react-pdf/renderer';
import dayjs from 'dayjs';
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
import { formatFieldValue } from '../../utils/fieldFormatter';
import { PdfDocument } from '../PdfExport/PdfDocument';
import { preloadLoopData } from '../../utils/pdfLoader';
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
  const STANDARD_NAME_FIELD_ID = 'fldVmqTOV6';
  const VERSION_FIELD_ID = 'fldL7m1ZTN';

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
    try {
      // 判断是否是关联表字段
      if (action.isLinkedTable && action.linkedTableId) {
        // 关联表字段：直接使用 setCellValue 更新关联表
        const linkedTable = await bitable.base.getTable(action.linkedTableId);
        await linkedTable.setCellValue(action.fieldId, action.recordId, action.oldValue);
        
        // 刷新画布显示
        setRefreshKey(prev => prev + 1);
        Toast.info(`已撤销：${action.fieldName}`);
        return true;
      }
      
      // 主表字段：使用 syncChanges
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
      Toast.error(`撤销失败：${action.fieldName}`);
      return false;
    }
  };

  const handleRedoAction = async (action: UndoableAction): Promise<boolean> => {
    try {
      // 判断是否是关联表字段
      if (action.isLinkedTable && action.linkedTableId) {
        // 关联表字段：直接使用 setCellValue 更新关联表
        const linkedTable = await bitable.base.getTable(action.linkedTableId);
        await linkedTable.setCellValue(action.fieldId, action.recordId, action.newValue);
        
        // 刷新画布显示
        setRefreshKey(prev => prev + 1);
        Toast.info(`已重做：${action.fieldName}`);
        return true;
      }
      
      // 主表字段：使用 syncChanges
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
      Toast.error(`重做失败：${action.fieldName}`);
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
  
  // 画布缩放比例（50% - 200%）
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pdfAttachmentFieldId, setPdfAttachmentFieldId] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [lastPrintTimestamp, setLastPrintTimestamp] = useState<string>('');
  const attachmentFields = useMemo(
    () => fields.filter(f => f.type === FieldType.Attachment),
    [fields]
  );
  const printInfoFieldId = useMemo(() => {
    return fields.find(f => f.name === '打印信息')?.id || '';
  }, [fields]);

  // 处理滚轮缩放（Cmd/Ctrl + 滚轮）- 绑定到 document
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 检查是否按住 Cmd (Mac) 或 Ctrl (Windows)，且在预览模式
      if ((e.metaKey || e.ctrlKey) && activeTab === 'preview') {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setZoomLevel(prev => Math.min(200, Math.max(50, prev + delta)));
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [activeTab]);

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
      return oldValue;
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
        return newValue;
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
    return oldValue;
  };

  // 处理关联表字段变更（产品标准明细表、标准变更记录表等）
  // 注意：LoopTableRenderer 已经更新了本地状态，这里只负责同步到多维表格和记录撤销栈
  // 不再触发全局刷新（setRefreshKey），避免整个页面闪烁
  const handleLinkedFieldChange = async (
    linkedTable: any,
    recordId: string,
    fieldId: string,
    newValue: any,
    oldValue: any
  ) => {
    if (!linkedTable) {
      console.warn('[TemplatePage] linkedTable is null');
      return oldValue;
    }

    try {
      // 获取关联表的字段元数据
      const linkedFields = await linkedTable.getFieldMetaList();
      const field = linkedFields.find((f: any) => f.id === fieldId);
      
      if (!field) {
        console.warn('[TemplatePage] Linked field not found:', fieldId);
        Toast.error('字段未找到');
        return oldValue;
      }

      // 统一转换为字符串进行比较
      const oldStr = String(oldValue ?? '').trim();
      const newStr = String(newValue ?? '').trim();
      const hasChanged = oldStr !== newStr;

      console.log('[TemplatePage] 更新关联表字段:', { 
        tableId: linkedTable.id, 
        recordId, 
        fieldId, 
        fieldName: field.name,
        newValue, 
        oldValue,
        oldStr,
        newStr,
        hasChanged
      });

      // 只有真正变化时才更新
      let latestValue: any = newValue;

      if (hasChanged) {
        // 直接使用 setCellValue 更新关联表
        await linkedTable.setCellValue(fieldId, recordId, newValue);
        
        console.log('[TemplatePage] 关联表字段更新成功');

        try {
          // 重新拉取一次该字段的值，确保画布拿到的是标准格式
          const refreshed = await linkedTable.getCellValue(fieldId, recordId);
          if (typeof refreshed !== 'undefined') {
            latestValue = refreshed;
          }
        } catch (refreshErr) {
          console.warn('[TemplatePage] 获取最新字段值失败，使用提交值回填', refreshErr);
        }
        
        // 记录到撤销栈（支持关联表字段的撤销/重做）
        pushAction({
          fieldId: fieldId,
          fieldName: field.name,
          recordId: recordId,
          oldValue: oldValue,
          newValue: latestValue,
          linkedTableId: linkedTable.id,
          isLinkedTable: true
        });
      }
      
      // 注意：不再调用 setRefreshKey，因为 LoopTableRenderer 已经更新了本地状态
      // 这样可以避免整个页面刷新导致的闪烁
      // 只有在撤销/重做操作时才需要全局刷新（在 handleUndoAction/handleRedoAction 中处理）
      
      // Toast 已经在 LoopTableRenderer 中显示，这里不重复
      return latestValue;
    } catch (error: any) {
      console.error('[TemplatePage] 更新关联表字段失败:', error);
      Toast.error(`更新失败: ${error.message || '未知错误'}`);
    }
    return oldValue;
  };

  const getFieldDisplayValue = useCallback(
    async (fieldId: string): Promise<string> => {
      const field = fields.find(f => f.id === fieldId);
      if (!field) return '';
      let value = record.fields?.[fieldId];
      if (value === undefined) {
        try {
          value = await table.getCellValue(fieldId, record.recordId);
        } catch (error) {
          console.warn('[TemplatePage] 获取字段值失败', { fieldId, error });
        }
      }
      return formatFieldValue(value, field.type);
    },
    [fields, record, table]
  );

  const buildPdfFileName = useCallback(async (): Promise<string> => {
    const standardName = (await getFieldDisplayValue(STANDARD_NAME_FIELD_ID)) || recordName || '未命名记录';
    const version = await getFieldDisplayValue(VERSION_FIELD_ID);
    const suffix = version ? `原料品质标准-${version}` : '原料品质标准';
    return `${standardName} ${suffix}`;
  }, [getFieldDisplayValue, recordName]);

  const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');

  const handleExportPdf = useCallback(
    async (targetFieldId?: string) => {
      if (!selectedTemplate) {
        Toast.error('请先选择模板');
        return;
      }
      
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      setExportingPdf(true);
      
      try {
        // 预加载循环区域数据
        console.log('[TemplatePage] 开始预加载循环数据...');
        const loopDataCache = await preloadLoopData(selectedTemplate, record, table);
        console.log('[TemplatePage] 循环数据预加载完成');
        
        // 使用 React-PDF 生成 PDF
        console.log('[TemplatePage] 开始生成 PDF...');
        const blob = await pdf(
          <PdfDocument 
            template={selectedTemplate}
            record={record}
            fields={fields}
            table={table}
            printTimestamp={now}
            loopDataCache={loopDataCache}
          />
        ).toBlob();
        console.log('[TemplatePage] PDF 生成成功');

        const rawFileName = await buildPdfFileName();
        const safeFileName = sanitizeFileName(rawFileName || '标准文档');

        if (targetFieldId) {
          // 上传到附件字段
          const pdfFile = new File([blob], `${safeFileName}.pdf`, { type: 'application/pdf' });
          const tokens = await bitable.base.batchUploadFile([pdfFile]);
          if (!tokens || tokens.length === 0) {
            throw new Error('上传失败，未返回文件 token');
          }
          const attachmentValue = [
            {
              name: pdfFile.name,
              size: pdfFile.size,
              type: pdfFile.type,
              token: tokens[0],
              timeStamp: Date.now()
            }
          ];
          await table.setCellValue(targetFieldId, record.recordId, attachmentValue as any);
          Toast.success('PDF 已上传到附件字段');
        } else {
          // 下载 PDF
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${safeFileName}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          Toast.success('PDF 已下载');
        }
        
        setLastPrintTimestamp(now);
        
        // 更新打印信息字段
        if (printInfoFieldId) {
          try {
            const existingValue = await table.getCellValue(printInfoFieldId, record.recordId);
            const existingText = formatFieldValue(existingValue, FieldType.Text) || '';
            const actionLabel = targetFieldId ? '导出并上传 PDF' : '下载 PDF';
            const newEntry = `${now} ${actionLabel}`;
            const combined = existingText ? `${existingText}\n${newEntry}` : newEntry;
            await table.setCellValue(printInfoFieldId, record.recordId, combined);
          } catch (error) {
            console.warn('[TemplatePage] 更新打印信息字段失败:', error);
          }
        }
        
        setShowExportModal(false);
        setPdfAttachmentFieldId('');
      } catch (error: any) {
        console.error('[TemplatePage] 导出 PDF 失败:', error);
        Toast.error(`导出 PDF 失败：${error.message || '未知错误'}`);
      } finally {
        setExportingPdf(false);
      }
    },
    [buildPdfFileName, record, fields, table, printInfoFieldId, selectedTemplate]
  );

  return (
    <Layout className="template-page">
      {/* 悬浮返回按钮 */}
      <Button 
        onClick={onBack} 
        type="tertiary"
        icon={<IconArrowLeft />}
        className="floating-back-button"
      >
        返回
      </Button>

      {/* 顶部导航栏 */}
      <div className="template-page-header">
        <div className="header-left">
          <Title heading={4} className="record-title">
            {recordName}
          </Title>
        </div>
        <div className="header-right">
          {activeTab === 'preview' && (
            <>
              {/* 缩放控件 */}
              <div className="zoom-controls">
                <span className="zoom-label">缩放</span>
                <Slider
                  value={zoomLevel}
                  onChange={(value) => setZoomLevel(value as number)}
                  min={50}
                  max={200}
                  step={10}
                  style={{ width: 100 }}
                />
                <span className="zoom-value">{zoomLevel}%</span>
                <Button
                  size="small"
                  type="tertiary"
                  onClick={() => setZoomLevel(100)}
                  style={{ marginLeft: 4 }}
                >
                  重置
                </Button>
              </div>
              <div className="undo-redo-buttons">
                {/* PDF 导出功能暂时隐藏，代码保留供后续使用
                <Tooltip content="导出 / 上传 PDF">
                  <Button
                    icon={<IconDownload />}
                    type="tertiary"
                    onClick={() => setShowExportModal(true)}
                  />
                </Tooltip>
                */}
                <Tooltip content="刷新画布">
                  <Button
                    icon={<IconRefresh />}
                    type="tertiary"
                    onClick={() => {
                      setRefreshKey(prev => prev + 1);
                      Toast.info('画布已刷新');
                    }}
                  />
                </Tooltip>
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
            </>
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
              onLinkedFieldChange={handleLinkedFieldChange}
              refreshKey={refreshKey}
              zoomLevel={zoomLevel}
              printTimestamp={lastPrintTimestamp}
            />
          ) : (
            <div className="template-empty">
              <Text type="tertiary">模板加载中，请稍后...</Text>
            </div>
          )}
        </Content>
      </Layout>

      {/* 导出 PDF 设置 */}
      <Modal
        title="导出 PDF"
        visible={showExportModal}
        confirmLoading={exportingPdf}
        okText={pdfAttachmentFieldId ? '导出并上传' : '下载 PDF'}
        onOk={() => handleExportPdf(pdfAttachmentFieldId || undefined)}
        onCancel={() => {
          setShowExportModal(false);
          setPdfAttachmentFieldId('');
        }}
      >
        <Text type="tertiary">
          默认仅下载 PDF。如需同步到多维表格，请选择一个附件字段，我们会将导出的文件上传到该字段。
        </Text>
        <Select
          placeholder={attachmentFields.length ? '选择附件字段（可选）' : '当前表中没有附件字段可选'}
          disabled={attachmentFields.length === 0}
          value={pdfAttachmentFieldId}
          onChange={(value) => setPdfAttachmentFieldId((value as string) || '')}
          style={{ width: '100%', marginTop: 12 }}
        >
          <Select.Option value="">不上传（仅下载）</Select.Option>
          {attachmentFields.map(field => (
            <Select.Option value={field.id} key={field.id}>
              {field.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>

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

