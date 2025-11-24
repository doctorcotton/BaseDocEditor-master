/**
 * BaseDocEditor 主应用
 */

import React, { useEffect, useState } from 'react';
import { Layout, Select, Button, Toast, Typography } from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';
import { IRecord } from '@lark-base-open/js-sdk';
import { useTableData } from './hooks/useTableData';
import { RecordList } from './components/RecordList/RecordList';
import { TemplatePage } from './components/TemplatePage/TemplatePage';
import { clearExpiredDrafts } from './utils/draftStorage';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  // 数据管理
  const {
    tables,
    currentTable,
    records,
    fields,
    loading,
    error,
    selectTable,
    reload
  } = useTableData();

  // 清理过期草稿
  useEffect(() => {
    clearExpiredDrafts();
  }, []);

  // 处理记录选择
  const handleSelectRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
  };

  // 返回主页
  const handleBack = () => {
    setSelectedRecordId(null);
  };

  // 获取选中的记录
  const selectedRecord = selectedRecordId
    ? records.find(r => r.recordId === selectedRecordId)
    : null;

  // 错误处理
  useEffect(() => {
    if (error) {
      console.error('App 错误:', error);
      Toast.error(error);
    }
  }, [error]);

  // 调试信息
  useEffect(() => {
    console.log('App 状态:', {
      tables: tables.length,
      currentTable: currentTable ? '已选择' : '未选择',
      records: records.length,
      fields: fields.length,
      loading,
      error,
      selectedRecordId
    });
  }, [tables, currentTable, records, fields, loading, error, selectedRecordId]);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <Title heading={4} style={{ margin: 0 }}>
              📝 BaseDocEditor
            </Title>
            <Text type="tertiary" size="small">文档化编辑器</Text>
          </div>
          <div className="header-right">
            <Select
              placeholder="选择表格"
              style={{ width: 200 }}
              value={currentTable?.id}
              onChange={(value) => selectTable(value as string)}
              loading={loading}
              showClear
            >
              {tables.map(table => (
                <Select.Option key={table.id} value={table.id}>
                  {table.name}
                </Select.Option>
              ))}
            </Select>
            <Button
              icon={<IconRefresh />}
              onClick={reload}
              loading={loading}
              disabled={!currentTable}
            >
              刷新
            </Button>
          </div>
        </div>
      </Header>

      <Content className="app-content">
        {selectedRecord && currentTable ? (
          <TemplatePage
            record={selectedRecord}
            fields={fields}
            table={currentTable}
            onBack={handleBack}
          />
        ) : (
          <RecordList
            table={currentTable}
            records={records}
            fields={fields}
            loading={loading}
            onSelectRecord={handleSelectRecord}
          />
        )}
      </Content>

      <Footer className="app-footer">
        <Text type="tertiary" size="small">
          BaseDocEditor v1.0.0 | 将多维表格数据渲染为可编辑文档
        </Text>
      </Footer>
    </Layout>
  );
}
