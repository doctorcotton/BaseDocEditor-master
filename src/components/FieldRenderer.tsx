/**
 * 字段渲染器组件
 */

import React, { useState } from 'react';
import { Button, Typography, Tag } from '@douyinfe/semi-ui';
import { IconEdit, IconComment } from '@douyinfe/semi-icons';
import { FieldRendererProps } from '../types';
import { formatFieldValue, isFieldEditable } from '../utils/fieldFormatter';
import { FieldEditor } from './FieldEditor';
import './FieldRenderer.css';

const { Text } = Typography;

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  record,
  field,
  value,
  isChanged,
  onEdit,
  onComment
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  const editable = isFieldEditable(field.type);

  const handleStartEdit = () => {
    if (editable) {
      setEditValue(value);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    onEdit(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  return (
    <div className={`field-item ${isChanged ? 'field-changed' : ''}`}>
      <div className="field-header">
        <label className="field-label">
          {field.name}
          {!editable && <Tag size="small" color="grey" style={{ marginLeft: 4 }}>只读</Tag>}
        </label>
        <div className="field-actions">
          {editable && !isEditing && (
            <Button
              size="small"
              icon={<IconEdit />}
              type="tertiary"
              onClick={handleStartEdit}
            />
          )}
          {onComment && (
            <Button
              size="small"
              icon={<IconComment />}
              type="tertiary"
              onClick={onComment}
            />
          )}
        </div>
      </div>
      
      <div className="field-content">
        {isEditing ? (
          <FieldEditor
            type={field.type}
            value={editValue}
            onChange={setEditValue}
            onSave={handleSave}
            onCancel={handleCancel}
            fieldMeta={field}
          />
        ) : (
          <div 
            className={`field-display ${editable ? 'field-editable' : ''}`}
            onClick={handleStartEdit}
          >
            <Text>{formatFieldValue(value, field.type) || <span style={{ color: '#ccc' }}>空</span>}</Text>
          </div>
        )}
      </div>
    </div>
  );
};

