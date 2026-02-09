'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X, Check } from 'lucide-react';

interface IdeaItem {
  title: string;
  description: string;
  source: 'mind-mapping' | 'crazy-eights' | 'brain-writing' | 'user';
  isWildCard?: boolean;
}

interface IdeaSelectionProps {
  ideas: IdeaItem[];
  selectedTitles: string[];
  onSelectionChange: (titles: string[]) => void;
  userAddedIdeas: Array<{title: string; description: string}>;
  onAddUserIdea: (idea: {title: string; description: string}) => void;
  onRemoveUserIdea: (title: string) => void;
  maxSelection?: number;
}

export function IdeaSelection({
  ideas,
  selectedTitles,
  onSelectionChange,
  userAddedIdeas,
  onAddUserIdea,
  onRemoveUserIdea,
  maxSelection = 4,
}: IdeaSelectionProps) {
  const [newIdeaTitle, setNewIdeaTitle] = React.useState('');
  const [newIdeaDescription, setNewIdeaDescription] = React.useState('');

  const toggleSelection = (title: string) => {
    if (selectedTitles.includes(title)) {
      onSelectionChange(selectedTitles.filter(t => t !== title));
    } else if (selectedTitles.length < maxSelection) {
      onSelectionChange([...selectedTitles, title]);
    }
  };

  const handleAddIdea = () => {
    if (!newIdeaTitle.trim()) return;

    const newIdea = {
      title: newIdeaTitle.trim(),
      description: newIdeaDescription.trim(),
    };

    onAddUserIdea(newIdea);

    // Auto-select if under max
    if (selectedTitles.length < maxSelection) {
      onSelectionChange([...selectedTitles, newIdea.title]);
    }

    // Clear inputs
    setNewIdeaTitle('');
    setNewIdeaDescription('');
  };

  // Group ideas by source
  const mindMappingIdeas = ideas.filter(i => i.source === 'mind-mapping');
  const crazyEightsIdeas = ideas.filter(i => i.source === 'crazy-eights');
  const brainWritingIdeas = ideas.filter(i => i.source === 'brain-writing');
  const userIdeas = ideas.filter(i => i.source === 'user');

  const renderIdeaCard = (idea: IdeaItem) => {
    const isSelected = selectedTitles.includes(idea.title);
    const isDisabled = !isSelected && selectedTitles.length >= maxSelection;

    return (
      <button
        key={idea.title}
        onClick={() => toggleSelection(idea.title)}
        disabled={isDisabled}
        className={cn(
          'w-full text-left rounded-lg border p-3 transition-colors',
          isSelected
            ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
            : 'hover:border-primary/50',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{idea.title}</span>
              {idea.isWildCard && (
                <span className="text-xs text-amber-600 font-medium">Wild Card</span>
              )}
              <span className="text-xs text-muted-foreground capitalize">
                {idea.source.replace('-', ' ')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{idea.description}</p>
          </div>
          {isSelected && <Check className="h-4 w-4 text-green-600 shrink-0" />}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Select Ideas for Concept Development</h4>
        <span className="text-xs text-muted-foreground">
          {selectedTitles.length}/{maxSelection} selected
        </span>
      </div>

      {/* Mind Mapping Ideas */}
      {mindMappingIdeas.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Mind Mapping
          </h5>
          {mindMappingIdeas.map(renderIdeaCard)}
        </div>
      )}

      {/* Crazy 8s Ideas */}
      {crazyEightsIdeas.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Crazy 8s
          </h5>
          {crazyEightsIdeas.map(renderIdeaCard)}
        </div>
      )}

      {/* Brain Writing Ideas */}
      {brainWritingIdeas.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Brain Writing
          </h5>
          {brainWritingIdeas.map(renderIdeaCard)}
        </div>
      )}

      {/* User Ideas */}
      {userIdeas.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your Ideas
          </h5>
          {userIdeas.map(renderIdeaCard)}
        </div>
      )}

      {/* Add your own idea */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-2">Add Your Own Idea</p>
        <div className="flex gap-2">
          <Input
            placeholder="Idea title..."
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddIdea}
            disabled={!newIdeaTitle.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {newIdeaTitle.trim() && (
          <Input
            placeholder="Brief description (optional)..."
            value={newIdeaDescription}
            onChange={(e) => setNewIdeaDescription(e.target.value)}
            className="mt-2"
          />
        )}

        {/* User-added ideas list */}
        {userAddedIdeas.map((idea) => (
          <div
            key={idea.title}
            className="flex items-center justify-between mt-2 rounded border p-2"
          >
            <span className="text-sm">{idea.title}</span>
            <button onClick={() => onRemoveUserIdea(idea.title)}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>

      {/* Selection summary */}
      {selectedTitles.length > 0 && (
        <div className="rounded-lg border border-green-500/50 bg-green-50/50 p-3 dark:bg-green-950/20">
          <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-1">
            Selected for Step 9:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedTitles.map((title) => (
              <span
                key={title}
                className="rounded-md bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-200"
              >
                {title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
