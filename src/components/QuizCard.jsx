const QuizCard = ({ title, subtitle, revealed, children, footer }) => (
  <div className={`glass-panel rounded-[28px] p-6 ${revealed ? 'quiz-flip' : ''}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Quiz Spot</p>
        <h3 className="mt-2 font-display text-3xl text-gold">{title}</h3>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className={`rounded-full border px-3 py-1 text-xs ${revealed ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/10 bg-surface text-muted'}`}>
        {revealed ? 'Answer Revealed' : 'Decision Pending'}
      </div>
    </div>

    <div className="mt-6">{children}</div>
    {footer ? <div className="mt-6 border-t border-white/5 pt-4">{footer}</div> : null}
  </div>
);

export default QuizCard;