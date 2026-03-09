import CardSelect from './CardSelect';

const buildNextCards = (selectedCards, index, nextCard) => {
  const next = [...selectedCards];

  if (!nextCard) {
    next.splice(index, 1);
    return next;
  }

  if (index < next.length) {
    next[index] = nextCard;
  } else {
    next.push(nextCard);
  }

  return next;
};

const CardPicker = ({ selectedCards = [], onChangeCards, maxCards = 5, title = 'Board Picker' }) => {
  const slots = Array.from({ length: maxCards }, (_, index) => selectedCards[index] || '');

  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-gold">{title}</h3>
          <p className="mt-1 text-xs text-muted">Pick exact cards from the dropdowns. Duplicate cards are blocked automatically.</p>
        </div>
        <div className="rounded-full border border-gold/20 px-3 py-1 text-xs text-muted">{selectedCards.length} / {maxCards}</div>
      </div>

      <div className="grid gap-3 min-[720px]:grid-cols-2">
        {slots.map((card, index) => (
          <CardSelect
            key={`board-slot-${index}`}
            value={card}
            placeholder={['Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'][index] || `Board ${index + 1}`}
            excludedCards={slots.filter((_, slotIndex) => slotIndex !== index)}
            onChange={(nextCard) => onChangeCards?.(buildNextCards(selectedCards, index, nextCard))}
          />
        ))}
      </div>
    </div>
  );
};

export default CardPicker;