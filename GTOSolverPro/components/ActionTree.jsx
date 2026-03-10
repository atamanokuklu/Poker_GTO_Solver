import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const TreeNode = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children?.length);

  return (
    <View style={[styles.nodeWrap, depth > 0 ? styles.nodeWrapNested : null]}>
      <Pressable onPress={() => setExpanded((current) => !current)} disabled={!hasChildren} style={[styles.nodeCard, depth > 0 ? styles.nodeCardNested : null]}>
        <View style={styles.nodeHeader}>
          <Text style={styles.nodeLabel}>{node.label}</Text>
          {hasChildren ? <Text style={styles.nodeToggle}>{expanded ? 'Hide' : 'Show'}</Text> : null}
        </View>
        {node.meta ? <Text style={styles.nodeMeta}>{node.meta}</Text> : null}
      </Pressable>

      {expanded && hasChildren ? (
        <View style={styles.childrenWrap}>
          {node.children.map((child) => (
            <TreeNode key={child.id} depth={depth + 1} node={child} />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const ActionTree = ({ tree }) => {
  if (!tree) {
    return null;
  }

  return (
    <SectionCard>
      <Text style={styles.title}>Action Tree</Text>
      <Text style={styles.subtitle}>Tap nodes to collapse or expand downstream branches.</Text>
      <View style={styles.rootWrap}>
        <TreeNode node={tree} />
      </View>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  rootWrap: {
    marginTop: spacing.md,
  },
  nodeWrap: {
    gap: spacing.sm,
  },
  nodeWrapNested: {
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
  },
  nodeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  nodeCardNested: {
    backgroundColor: '#142117',
  },
  nodeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  nodeLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  nodeToggle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nodeMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  childrenWrap: {
    gap: spacing.sm,
  },
});

export default ActionTree;