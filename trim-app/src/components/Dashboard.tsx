import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Settings } from 'lucide-react';
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
import { Decision } from '../types/decision';
import DecisionCard from './DecisionCard';
import CategoryManagementModal from './CategoryManagementModal';

interface DashboardProps {
  decisions: Decision[];
  categories: string[];
  onCreateDecision: () => void;
  onSelectDecision: (decisionId: string) => void;
  onDeleteDecision: (decisionId: string) => void;
  onReorderDecisions: (decisions: Decision[]) => void;
  onUpdateDecision: (decision: Decision) => void;
  onTrimDecision: (decisionId: string) => void;
  onReopenDecision: (decisionId: string) => void;
  onUpdateCategories: (categories: string[]) => void;
}

// Sortable Decision Card Component
function SortableDecisionCard({
  decision,
  onSelect,
  onDelete,
  onUpdate,
  onTrim,
  onReopen,
  level,
  children,
  hasChildren,
  isExpanded,
  onToggleExpand,
  isLastChild,
}: {
  decision: Decision;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onUpdate?: (decision: Decision) => void;
  onTrim?: (decisionId: string) => void;
  onReopen?: (decisionId: string) => void;
  level?: number;
  children?: React.ReactNode;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isLastChild?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: decision.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DecisionCard
        decision={decision}
        onClick={onSelect}
        onDelete={onDelete}
        onUpdateDecision={onUpdate}
        onTrim={onTrim}
        onReopen={onReopen}
        level={level}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        isLastChild={isLastChild}
      >
        {children}
      </DecisionCard>
    </div>
  );
}

export default function Dashboard({ decisions, categories, onCreateDecision, onSelectDecision, onDeleteDecision, onReorderDecisions, onUpdateDecision, onTrimDecision, onReopenDecision, onUpdateCategories }: DashboardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overdue: false,
    active: true,
    resolved: false,
  });
  const [expandedDecisions, setExpandedDecisions] = useState<{ [key: string]: boolean }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동해야 드래그 시작 (클릭과 구분)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleSection = (section: 'overdue' | 'active' | 'resolved') => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Toggle decision expand/collapse
  const toggleDecisionExpand = (decisionId: string) => {
    setExpandedDecisions(prev => ({
      ...prev,
      [decisionId]: !prev[decisionId]
    }));
  };

  // Recursive function to render decision with all its children
  const renderDecisionWithChildren = (decision: Decision, level: number = 0, isLastChild: boolean = false): JSX.Element => {
    // resolved된 sub-decision은 표시하지 않음 (관계는 유지되어 reopen시 원래 위치로 복귀)
    const children = decisions.filter(d => d.parentId === decision.id && !d.resolved);
    const hasChildren = children.length > 0;
    const isExpanded = hasChildren ? (expandedDecisions[decision.id] ?? false) : true;
    
    return (
      <DecisionCard
        key={decision.id}
        decision={decision}
        onClick={() => onSelectDecision(decision.id)}
        onDelete={(e) => {
          e.stopPropagation();
          onDeleteDecision(decision.id);
        }}
        onUpdateDecision={onUpdateDecision}
        onTrim={onTrimDecision}
        onReopen={onReopenDecision}
        level={level}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggleExpand={hasChildren ? () => toggleDecisionExpand(decision.id) : undefined}
        isLastChild={isLastChild}
      >
        {children.length > 0 && children.map((child, index) => 
          renderDecisionWithChildren(child, level + 1, index === children.length - 1)
        )}
      </DecisionCard>
    );
  };

  // Filter decisions by category
  const filteredDecisions = decisions.filter((decision) => {
    // resolved된 decision은 parentId 여부와 관계없이 포함 (sub-decision도 resolved 섹션에 표시)
    if (decision.resolved) {
      if (selectedCategory === 'All') return true;
      return decision.category === selectedCategory;
    }
    // active/overdue decision은 parent만 표시 (sub-decision은 parent 안에서 렌더링)
    if (decision.parentId) return false;
    if (selectedCategory === 'All') return true;
    return decision.category === selectedCategory;
  });

  // Get overdue decisions (not resolved and deadline passed) - sorted by order
  const overdueDecisions = filteredDecisions
    .filter((decision) => {
      if (decision.resolved) return false;
      const isOverdue = new Date(decision.deadline) < new Date();
      return isOverdue;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get active decisions (not resolved and not overdue) - sorted by order
  const activeDecisions = filteredDecisions
    .filter((decision) => {
      if (decision.resolved) return false;
      const isOverdue = new Date(decision.deadline) < new Date();
      return !isOverdue;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get resolved decisions (sorted by resolvedAt, newest first)
  const resolvedDecisions = filteredDecisions
    .filter((decision) => decision.resolved)
    .sort((a, b) => {
      const dateA = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
      const dateB = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
      return dateB - dateA; // newest first
    });

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent, section: 'overdue' | 'active') => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const sectionDecisions = section === 'overdue' ? overdueDecisions : activeDecisions;
    const oldIndex = sectionDecisions.findIndex((d) => d.id === active.id);
    const newIndex = sectionDecisions.findIndex((d) => d.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder within section
    const reorderedSection = arrayMove(sectionDecisions, oldIndex, newIndex);
    
    // Update order field for reordered items
    const updatedSection = reorderedSection.map((d, index) => ({
      ...d,
      order: index,
    }));

    // Merge with other decisions
    const otherDecisions = decisions.filter(
      (d) => !sectionDecisions.find((sd) => sd.id === d.id)
    );

    onReorderDecisions([...otherDecisions, ...updatedSection]);
  };

  return (
    <div className="min-h-screen bg-cloudDancer">
      {/* Header */}
      <header className="py-6 px-4">
        <h1 className="text-4xl font-bold text-stretchLimo text-center">
          TRIM
        </h1>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-stretchLimo text-white'
                  : 'bg-white text-stretchLimo hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-stretchLimo text-white'
                    : 'bg-white text-stretchLimo hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCategoryManagement(true)}
            className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
            title="카테고리 관리"
          >
            <Settings className="w-5 h-5 text-stretchLimo" />
          </button>
        </div>

        {/* OVERDUE Section - Only show if there are overdue decisions */}
        {overdueDecisions.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={(event) => handleDragEnd(event, 'overdue')}
          >
            <section className="mb-6">
              {/* Section Header */}
              <button
                onClick={() => toggleSection('overdue')}
                className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-scarletSmile">OVERDUE</h2>
                  {expandedSections.overdue ? (
                    <ChevronDown className="w-5 h-5 text-scarletSmile" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-scarletSmile" />
                  )}
                </div>
                <span className="text-sm text-micron">{overdueDecisions.length}</span>
              </button>

              {/* Decision Cards */}
              {expandedSections.overdue && (
                <div className="space-y-3">
                  {overdueDecisions.map((decision) => renderDecisionWithChildren(decision, 0))}
                </div>
              )}
            </section>
          </DndContext>
        )}

        {/* ACTIVE Section */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={(event) => handleDragEnd(event, 'active')}
        >
          <section className="mb-6">
            {/* Section Header */}
            <button
              onClick={() => toggleSection('active')}
              className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stretchLimo">ACTIVE</h2>
                {expandedSections.active ? (
                  <ChevronDown className="w-5 h-5 text-stretchLimo" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-stretchLimo" />
                )}
              </div>
              <span className="text-sm text-micron">{activeDecisions.length}</span>
            </button>

            {expandedSections.active && (
              <>
                {/* Pending Decision Button */}
                <button
                  onClick={onCreateDecision}
                  className="w-full bg-white rounded-lg p-4 mb-3 flex items-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5 text-stretchLimo" />
                  <span className="text-base font-medium text-stretchLimo">
                    Pending Decision
                  </span>
                </button>

                {/* Decision Cards */}
                {activeDecisions.length > 0 ? (
                  <SortableContext
                    items={activeDecisions.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {activeDecisions.map((decision) => {
                        // resolved된 sub-decision은 표시하지 않음
                        const children = decisions.filter(d => d.parentId === decision.id && !d.resolved);
                        const hasChildren = children.length > 0;
                        const isExpanded = hasChildren ? (expandedDecisions[decision.id] ?? false) : true;
                        return (
                          <SortableDecisionCard
                            key={decision.id}
                            decision={decision}
                            onSelect={() => onSelectDecision(decision.id)}
                            onDelete={(e) => {
                              e.stopPropagation();
                              onDeleteDecision(decision.id);
                            }}
                            onUpdate={onUpdateDecision}
                            onTrim={onTrimDecision}
                            onReopen={onReopenDecision}
                            level={0}
                            hasChildren={hasChildren}
                            isExpanded={isExpanded}
                            onToggleExpand={hasChildren ? () => toggleDecisionExpand(decision.id) : undefined}
                          >
                            {children.length > 0 && children.map(child => renderDecisionWithChildren(child, 1))}
                          </SortableDecisionCard>
                        );
                      })}
                    </div>
                  </SortableContext>
                ) : (
                  /* Empty State */
                  <div className="text-center py-8">
                    <p className="text-micron text-sm">
                      No active decisions.
                      <br />
                      Tap + to add one.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </DndContext>

        {/* RESOLVED Section - Only show if there are resolved decisions */}
        {resolvedDecisions.length > 0 && (
          <section className="mb-6">
            {/* Section Header */}
            <button
              onClick={() => toggleSection('resolved')}
              className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stretchLimo">RESOLVED</h2>
                {expandedSections.resolved ? (
                  <ChevronDown className="w-5 h-5 text-stretchLimo" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-stretchLimo" />
                )}
              </div>
              <span className="text-sm text-micron">{resolvedDecisions.length}</span>
            </button>

            {/* Decision Cards */}
            {expandedSections.resolved && (
              <div className="space-y-3">
                {resolvedDecisions.map((decision) => renderDecisionWithChildren(decision, 0))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Category Management Modal */}
      {showCategoryManagement && (
        <CategoryManagementModal
          categories={categories}
          decisions={decisions}
          onSave={(newCategories) => {
            onUpdateCategories(newCategories);
            setShowCategoryManagement(false);
          }}
          onClose={() => setShowCategoryManagement(false)}
        />
      )}
    </div>
  );
}
