/**
 * 同步面板组件
 */

import React from 'react';
import { Button, List, Typography, Tag, Modal, Toast } from '@douyinfe/semi-ui';
import { IconSync, IconDelete, IconTickCircle, IconAlertTriangle } from '@douyinfe/semi-icons';
import { FieldChange } from '../types';
import { formatFieldValue } from '../utils/fieldFormatter';
import './SyncPanel.css';

const { Text } = Typography;

interface SyncPanelProps {
  changes: FieldChange[];
  syncing: boolean;
  syncResult: { success: boolean; count?: number; error?: string; timestamp: number } | null;
  onSync: () => Promise<void>;
  onUndo: (key: string) => void;
  onClear: () => void;
}

export const SyncPanel: React.FC<SyncPanelProps> = ({
  changes,
  syncing,
  syncResult,
  onSync,
  onUndo,
  onClear
}) => {
  const handleSync = async () => {
    if (changes.length === 0) {
      Toast.warning('没有需要同步的修改');
      return;
    }

    Modal.confirm({
      title: '确认同步',
      content: `即将同步 ${changes.length} 个字段的修改到多维表格，确认继续吗？`,
      onOk: async () => {
        await onSync();
      }
    });
  };

  const handleClearAll = () => {
    if (changes.length === 0) return;

    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有待同步的修改吗？此操作不可恢复。',
      onOk: () => {
        onClear();
        Toast.success('已清空所有修改');
      }
    });
  };

  return (
    <div className="sync-panel">
      <div className="sync-panel-header">
        <div className="sync-panel-title">
          <Text strong>待同步修改</Text>
          {changes.length > 0 && (
            <Tag color="orange" size="small">{changes.length}</Tag>
          )}
        </div>
        <div className="sync-panel-actions">
          <Button
            size="small"
            type="tertiary"
            icon={<IconDelete />}
            onClick={handleClearAll}
            disabled={changes.length === 0 || syncing}
          >
            清空
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<IconSync />}
            onClick={handleSync}
            loading={syncing}
            disabled={changes.length === 0}
          >
            同步到表格
          </Button>
        </div>
      </div>

      {syncResult && (
        <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
          {syncResult.success ? (
            <>
              <IconTickCircle style={{ color: '#52c41a' }} />
              <Text>成功同步 {syncResult.count} 条记录</Text>
            </>
          ) : (
            <>
              <IconAlertTriangle style={{ color: '#ff4d4f' }} />
              <Text type="danger">{syncResult.error || '同步失败'}</Text>
            </>
          )}
        </div>
      )}

      <div className="sync-panel-content">
        {changes.length === 0 ? (
          <div className="sync-empty">
            <Text type="tertiary">暂无待同步的修改</Text>
          </div>
        ) : (
          <List
            dataSource={changes}
            renderItem={(change) => {
              const key = `${change.recordId}:${change.fieldId}`;
              return (
                <List.Item
                  key={key}
                  className="change-item"
                  main={
                    <div className="change-content">
                      <Text strong className="change-field">{change.fieldName}</Text>
                      <div className="change-values">
                        <div className="change-value-item">
                          <Text type="tertiary" size="small">原值:</Text>
                          <Text delete size="small">
                            {formatFieldValue(change.oldValue, 1) || '(空)'}
                          </Text>
                        </div>
                        <div className="change-value-item">
                          <Text type="tertiary" size="small">新值:</Text>
                          <Text mark size="small">
                            {formatFieldValue(change.newValue, 1) || '(空)'}
                          </Text>
                        </div>
                      </div>
                    </div>
                  }
                  extra={
                    <Button
                      size="small"
                      type="tertiary"
                      icon={<IconDelete />}
                      onClick={() => onUndo(key)}
                      disabled={syncing}
                    />
                  }
                />
              );
            }}
          />
        )}
      </div>
    </div>
  );
};

