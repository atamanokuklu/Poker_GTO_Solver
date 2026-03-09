import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const TreeNode = ({ node, depth = 0 }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = Boolean(node.children?.length);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-surface/70 px-4 py-3 text-left"
        style={{ marginLeft: depth * 12 }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        <span className="mt-0.5 text-gold">{hasChildren ? open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded-full bg-gold/50" />}</span>
        <span>
          <span className="block text-sm text-ink">{node.label}</span>
          {node.meta ? <span className="mt-1 block text-xs text-muted">{node.meta}</span> : null}
        </span>
      </button>

      {hasChildren && open ? (
        <div className="space-y-2 border-l border-gold/10 pl-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ActionTree = ({ tree }) => (
  <div className="glass-panel rounded-3xl p-4">
    <div className="mb-4">
      <h3 className="font-display text-2xl text-gold">Node Tree</h3>
      <p className="mt-1 text-xs text-muted">Collapsible simplified decision flow.</p>
    </div>
    {tree ? <TreeNode node={tree} /> : <p className="text-sm text-muted">Add a board and sizing set to populate the tree.</p>}
  </div>
);

export default ActionTree;