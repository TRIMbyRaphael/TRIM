import { useState, useRef } from 'react';
import { Plus, ChevronRight, ChevronDown, Settings } from 'lucide-react';
import { t } from '../i18n';
import logoHeader from '../assets/logo-header.svg';
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
import { SAMPLE_DECISION_IDS } from '../data/sampleDecisions';

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
      >
        {children}
      </DecisionCard>
    </div>
  );
}

export default function Dashboard({ decisions, categories, onCreateDecision, onSelectDecision, onDeleteDecision, onReorderDecisions, onUpdateDecision, onTrimDecision, onReopenDecision, onUpdateCategories }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const sampleIdSet = new Set(SAMPLE_DECISION_IDS);

  const [expandedSections, setExpandedSections] = useState({
    overdue: false,
    sampleDecisions: false,
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

  const toggleSection = (section: 'overdue' | 'sampleDecisions' | 'active' | 'resolved') => {
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

  // 부모 + 미해결 자손 중 하나라도 overdue면 그룹 전체 overdue. 모두 해결되면 active로 복귀
  const isGroupOverdue = (parent: Decision, allDecisions: Decision[]): boolean => {
    const collectNonResolved = (d: Decision): Decision[] => {
      const children = allDecisions.filter(c => c.parentId === d.id && !c.resolved);
      return [d, ...children.flatMap(collectNonResolved)];
    };
    const group = collectNonResolved(parent);
    const now = new Date();
    return group.some(d => new Date(d.deadline) < now);
  };

  // Recursive function to render decision with all its children
  const renderDecisionWithChildren = (decision: Decision, level: number = 0): JSX.Element => {
    // resolved된 sub-decision은 표시하지 않음 (관계는 유지되어 reopen시 원래 위치로 복귀)
    const children = decisions
      .filter(d => d.parentId === decision.id && !d.resolved)
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order
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
      >
        {children.length > 0 && children.map((child) => 
          renderDecisionWithChildren(child, level + 1)
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

  // 💡 Sample decisions: 샘플 ID에 해당하는 미완료 top-level 결정 (Overdue/Active에서 제외)
  const sampleDecisionsArr = filteredDecisions
    .filter((decision) => !decision.resolved && sampleIdSet.has(decision.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get overdue decisions: 그룹(부모+하위) 중 하나라도 overdue면 전체 overdue (샘플 제외)
  const overdueDecisions = filteredDecisions
    .filter((decision) => {
      if (decision.resolved) return false;
      if (sampleIdSet.has(decision.id)) return false; // 샘플은 Overdue로 이동하지 않음
      return isGroupOverdue(decision, decisions);
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Get active decisions: 그룹 전체가 active일 때만 (샘플 제외)
  const activeDecisions = filteredDecisions
    .filter((decision) => {
      if (decision.resolved) return false;
      if (sampleIdSet.has(decision.id)) return false; // 샘플은 Active에서도 제외
      return !isGroupOverdue(decision, decisions);
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

  const handleDragEnd = (event: DragEndEvent, section: 'overdue' | 'active') => {
    const { active, over } = event;

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
    <div id="dashboard-scroll" className="h-full bg-cloudDancer overflow-y-auto">
      {/* Header */}
      <header className="py-6 px-4 flex justify-center">
        <img 
          src={logoHeader} 
          alt="TRIM" 
          className="h-8"
        />
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
                  : 'bg-cardBg text-stretchLimo shadow border border-stretchLimo/10 hover:shadow-md hover:bg-cloudDancer/30'
              }`}
            >
              {t.all}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-stretchLimo text-white'
                    : 'bg-cardBg text-stretchLimo shadow border border-stretchLimo/10 hover:shadow-md hover:bg-cloudDancer/30'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCategoryManagement(true)}
            className="p-2 bg-cardBg rounded-lg shadow border border-stretchLimo/10 hover:shadow-md hover:bg-cloudDancer/30 transition-all"
            title={t.manageCategoriesTitle}
          >
            <Settings className="w-5 h-5 text-stretchLimo" />
          </button>
        </div>

        {/* OVERDUE Section - Only show if there are overdue decisions */}
        {overdueDecisions.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, 'overdue')}
          >
            <section className="mb-6">
              {/* Section Header */}
              <button
                onClick={() => toggleSection('overdue')}
                className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
              >
                <h2 className="text-lg font-bold text-scarletSmile">{t.overdue}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-scarletSmile">{overdueDecisions.length}</span>
                  {expandedSections.overdue ? (
                    <ChevronDown className="w-5 h-5 text-scarletSmile" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-scarletSmile" />
                  )}
                </div>
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

        {/* 💡 SAMPLE DECISIONS Section - Only show if there are sample decisions */}
        {sampleDecisionsArr.length > 0 && (
          <section className="mb-6">
            {/* Section Header */}
            <button
              onClick={() => toggleSection('sampleDecisions')}
              className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-lg font-semibold text-stretchLimo/80">{t.sampleDecisionsSection}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stretchLimo/50">{sampleDecisionsArr.length}</span>
                {expandedSections.sampleDecisions ? (
                  <ChevronDown className="w-5 h-5 text-stretchLimo/50" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-stretchLimo/50" />
                )}
              </div>
            </button>

            {/* Sample Decision Cards */}
            {expandedSections.sampleDecisions && (
              <div className="space-y-3">
                {sampleDecisionsArr.map((decision) => renderDecisionWithChildren(decision, 0))}
              </div>
            )}
          </section>
        )}

        {/* ACTIVE Section */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleDragEnd(event, 'active')}
        >
          <section className="mb-6">
            {/* Section Header */}
            <button
              onClick={() => toggleSection('active')}
              className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-lg font-bold text-black">{t.active}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stretchLimo">{activeDecisions.length}</span>
                {expandedSections.active ? (
                  <ChevronDown className="w-5 h-5 text-stretchLimo" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-stretchLimo" />
                )}
              </div>
            </button>

            {expandedSections.active && (
              <>
                {/* Pending Decision Button */}
                <button
                  onClick={onCreateDecision}
                  className="w-full bg-cardBg rounded-lg p-4 mb-3 flex items-center gap-3 border border-stretchLimo/10 hover:bg-cloudDancer/30 transition-shadow shadow hover:shadow-md"
                >
                  <Plus className="w-5 h-5 text-stretchLimo" />
                  <span className="text-base font-medium text-stretchLimo">
                    {t.pendingDecision}
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
                        const children = decisions
                          .filter(d => d.parentId === decision.id && !d.resolved)
                          .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order
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
                      {t.noActiveDecisions}
                      <br />
                      {t.tapToAdd}
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
              <h2 className="text-lg font-bold text-black">{t.resolved}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stretchLimo">{resolvedDecisions.length}</span>
                {expandedSections.resolved ? (
                  <ChevronDown className="w-5 h-5 text-stretchLimo" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-stretchLimo" />
                )}
              </div>
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
