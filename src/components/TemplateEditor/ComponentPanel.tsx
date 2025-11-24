/**
 * 组件面板
 * 左侧可拖拽的组件列表
 */

import React, { useEffect } from 'react';
import { Card, Typography } from '@douyinfe/semi-ui';
import * as SemiIcons from '@douyinfe/semi-icons';
import { IconText, IconImage, IconLink, IconGridView, IconRefresh } from '@douyinfe/semi-icons';
import { TemplateElement } from '../../types/template';
import './TemplateEditor.css';

const { Text } = Typography;

interface ComponentPanelProps {
  onAddElement: (type: TemplateElement['type'], position: { x: number; y: number }) => void;
  fields: any[];
}

const COMPONENT_TYPES: Array<{
  type: TemplateElement['type'];
  name: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    type: 'text',
    name: '固定文本',
    icon: <IconText />,
    description: '添加固定文本内容'
  },
  {
    type: 'field',
    name: '字段',
    icon: <IconText />,
    description: '插入字段占位符'
  },
  {
    type: 'loop',
    name: '循环区域',
    icon: <IconRefresh />,
    description: '循环显示关联记录'
  },
  {
    type: 'table',
    name: '表格',
    icon: <IconGridView />,
    description: '插入表格'
  },
  {
    type: 'image',
    name: '图片',
    icon: <IconImage />,
    description: '插入图片（附件字段）'
  },
  {
    type: 'link',
    name: '超链接',
    icon: <IconLink />,
    description: '插入超链接'
  }
];

export const ComponentPanel: React.FC<ComponentPanelProps> = ({
  onAddElement
}) => {
  // 调试：查看所有可用图标
  useEffect(() => {
    const iconNames = Object.keys(SemiIcons).filter(key => key.startsWith('Icon'));
    console.log('可用的 Semi Icons:', iconNames.sort());
    // 查找循环相关的图标
    const loopIcons = iconNames.filter(name => 
      /loop|repeat|refresh|sync|reload|redo|cycle/i.test(name)
    );
    console.log('循环相关图标:', loopIcons);
  }, []);

  const handleDragStart = (e: React.DragEvent, type: TemplateElement['type']) => {
    e.dataTransfer.setData('elementType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (type: TemplateElement['type']) => {
    // 点击时添加到画布中心位置
    const centerX = 400;
    const centerY = 300;
    onAddElement(type, { x: centerX, y: centerY });
  };

  return (
    <div className="component-panel">
      <div className="component-panel-header">
        <Text strong>组件</Text>
      </div>
      <div className="component-panel-list">
        {COMPONENT_TYPES.map(component => (
          <div
            key={component.type}
            draggable
            onDragStart={(e: React.DragEvent) => handleDragStart(e, component.type)}
            onClick={() => handleClick(component.type)}
          >
            <Card
              className="component-item"
            >
              <div className="component-item-icon">
                {component.icon}
              </div>
              <div className="component-item-info">
                <Text strong>{component.name}</Text>
                <Text type="tertiary" size="small">{component.description}</Text>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

