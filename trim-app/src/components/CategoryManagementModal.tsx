import { useState, useEffect, type RefObject } from 'react';
import { X, Edit, Trash2, Plus, Check, GripVertical } from 'lucide-react';
import { t } from '../i18n';
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
  anchorRef?: RefObject<HTMLDivElement | null>;
}

// Sortable Category Item Component
function SortableCategoryItem({
  category,
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
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-cloudDancer/30 border border-stretchLimo/15 rounded-lg">
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
            className="flex-1 px-2 py-1 text-sm border border-stretchLimo/10 rounded focus:outline-none focus:ring-2 focus:ring-stretchLimo"
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
            className="p-1 hover:bg-cloudDancer/50 rounded"
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
  anchorRef,
}: CategoryManagementModalProps) {
  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [anchorTop, setAnchorTop] = useState<number | null>(null);

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setAnchorTop(rect.bottom + 8); // 카테고리 필터 바로 아래 + 8px gap
    }
  }, [anchorRef]);
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

  const persistCategories = (updated: string[]) => {
    if (updated.length === 0) return;
    onSave(updated);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = localCategories.indexOf(active.id as string);
    const newIndex = localCategories.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const updated = arrayMove(localCategories, oldIndex, newIndex);
      setLocalCategories(updated);
      persistCategories(updated);
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
      alert(t.categoryAlreadyExists);
      return;
    }

    const updated = [...localCategories];
    updated[editingIndex] = trimmed;
    setLocalCategories(updated);
    setEditingIndex(null);
    setEditingValue('');
    persistCategories(updated);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleDelete = (index: number) => {
    if (localCategories.length === 1) {
      setWarningMessage(t.needAtLeastOneCategory);
      setShowDeleteWarning(true);
      return;
    }

    const category = localCategories[index];
    const usageCount = getCategoryUsageCount(category);
    
    if (usageCount > 0) {
      setWarningMessage(t.categoryInUse(category, usageCount));
      setShowDeleteWarning(true);
      return;
    }

    const updated = localCategories.filter((_, i) => i !== index);
    setLocalCategories(updated);
    persistCategories(updated);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    
    if (localCategories.includes(trimmed)) {
      alert(t.categoryAlreadyExists);
      return;
    }

    const updated = [...localCategories, trimmed];
    setLocalCategories(updated);
    setNewCategoryName('');
    persistCategories(updated);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 flex justify-center"
        style={anchorTop !== null
          ? { top: `${anchorTop}px`, left: 0, right: 0, padding: '0 16px' }
          : { inset: 0, display: 'flex', alignItems: 'center', padding: '16px' }
        }
      >
        <div className="bg-cardBg rounded-2xl w-full max-w-md shadow-lg border border-stretchLimo/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-center px-5 py-3">
            <h3 className="text-lg font-bold text-stretchLimo">{t.manageCategoriesTitle}</h3>
          </div>

          {/* Categories List */}
          <div className="px-5 pt-1.5 pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localCategories}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                {localCategories.map((category, index) => (
                  <SortableCategoryItem
                    key={category}
                    category={category}
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
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder={t.newCategory}
              className="flex-1 px-3 py-2 text-sm border border-stretchLimo/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-stretchLimo"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                newCategoryName.trim()
                  ? 'bg-stretchLimo text-white hover:bg-opacity-90'
                  : 'bg-cloudDancer/50 text-micron cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              {t.add}
            </button>
          </div>

          </div>
        </div>
      </div>

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]" />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-cardBg rounded-2xl w-full max-w-sm p-6 shadow-lg border border-stretchLimo/10">
              <h3 className="text-lg font-bold text-stretchLimo mb-3">
                {t.cannotDelete}
              </h3>
              <p className="text-base text-micron mb-6">
                {warningMessage}
              </p>
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="w-full bg-stretchLimo text-white rounded-lg py-3 text-base font-bold hover:bg-opacity-90 transition-colors"
              >
                {t.ok}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
