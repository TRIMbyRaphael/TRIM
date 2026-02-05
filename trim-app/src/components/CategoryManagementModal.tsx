import { useState } from 'react';
import { X, Edit, Trash2, Plus, Check, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CategoryManagementModalProps {
  categories: string[];
  onSave: (categories: string[]) => void;
  onClose: () => void;
  decisions: any[]; // To check if category is in use
}

// Sortable Category Item Component
function SortableCategoryItem({
  category,
  index,
  isEditing,
  editingValue,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditingValueChange,
  canDelete,
}: {
  category: string;
  index: number;
  isEditing: boolean;
  editingValue: string;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onEditingValueChange: (value: string) => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      {!isEditing && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-micron" />
        </div>
      )}
      {isEditing ? (
        <>
          <input
            type="text"
            value={editingValue}
            onChange={(e) => onEditingValueChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-stretchLimo"
            autoFocus
          />
          <button
            onClick={onSaveEdit}
            className="p-1 hover:bg-stretchLimo hover:bg-opacity-10 rounded"
          >
            <Check className="w-4 h-4 text-stretchLimo" />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4 text-micron" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-stretchLimo">
            {category}
          </span>
          <button
            onClick={onEdit}
            className="p-1 hover:bg-stretchLimo hover:bg-opacity-10 rounded"
          >
            <Edit className="w-4 h-4 text-stretchLimo" />
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className={`p-1 rounded ${
              !canDelete
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-scarletSmile hover:bg-opacity-10'
            }`}
          >
            <Trash2 className="w-4 h-4 text-scarletSmile" />
          </button>
        </>
      )}
    </div>
  );
}

export default function CategoryManagementModal({
  categories,
  onSave,
  onClose,
  decisions,
}: CategoryManagementModalProps) {
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getCategoryUsageCount = (category: string) => {
    return decisions.filter(d => d.category === category).length;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localCategories.indexOf(active.id as string);
    const newIndex = localCategories.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      setLocalCategories(arrayMove(localCategories, oldIndex, newIndex));
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(localCategories[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    
    if (localCategories.includes(trimmed) && localCategories[editingIndex] !== trimmed) {
      alert('이미 존재하는 카테고리명입니다.');
      return;
    }

    const updated = [...localCategories];
    updated[editingIndex] = trimmed;
    setLocalCategories(updated);
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDelete = (index: number) => {
    if (localCategories.length === 1) {
      setWarningMessage('최소 1개의 카테고리가 필요합니다.');
      setShowDeleteWarning(true);
      return;
    }

    const category = localCategories[index];
    const usageCount = getCategoryUsageCount(category);
    
    if (usageCount > 0) {
      setWarningMessage(`"${category}" 카테고리를 사용하는 ${usageCount}개의 사안이 있습니다.`);
      setShowDeleteWarning(true);
      return;
    }

    const updated = localCategories.filter((_, i) => i !== index);
    setLocalCategories(updated);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    
    if (localCategories.includes(trimmed)) {
      alert('이미 존재하는 카테고리명입니다.');
      return;
    }

    setLocalCategories([...localCategories, trimmed]);
    setNewCategoryName('');
  };

  const handleSave = () => {
    if (localCategories.length === 0) {
      alert('최소 1개의 카테고리가 필요합니다.');
      return;
    }
    onSave(localCategories);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stretchLimo">Manage Categories</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-micron" />
            </button>
          </div>

          {/* Categories List */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localCategories}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {localCategories.map((category, index) => (
                  <SortableCategoryItem
                    key={category}
                    category={category}
                    index={index}
                    isEditing={editingIndex === index}
                    editingValue={editingValue}
                    onEdit={() => handleEdit(index)}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onDelete={() => handleDelete(index)}
                    onEditingValueChange={setEditingValue}
                    canDelete={localCategories.length > 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Category */}
          <div className="flex items-center gap-2 mb-6">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="New Category"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                newCategoryName.trim()
                  ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                  : 'bg-gray-100 text-micron cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white text-stretchLimo border-2 border-gray-200 rounded-lg py-3 text-base font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-stretchLimo text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]" />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-stretchLimo mb-3">
                삭제할 수 없습니다
              </h3>
              <p className="text-base text-micron mb-6">
                {warningMessage}
              </p>
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="w-full bg-stretchLimo text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
